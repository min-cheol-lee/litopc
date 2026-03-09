from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
import time
from dataclasses import dataclass
from urllib import error as urlerror
from urllib import request as urlrequest

import jwt
from fastapi import HTTPException, Request
from jwt import ExpiredSignatureError, InvalidTokenError
from jwt.algorithms import RSAAlgorithm

from .store import sanitize_user_id

_TOKEN_RE = re.compile(r"^Bearer\s+(.+)$", re.IGNORECASE)
_STRICT_HEADER_TESTER_EMAILS: dict[str, str] = {
    "master": "master@opc-lab",
    "tester1": "tester1@opc-lab",
}
_JWKS_CACHE_TTL_SECONDS = 300
_JWKS_CACHE: dict[str, tuple[float, dict[str, object]]] = {}


@dataclass
class AuthIdentity:
    user_id: str
    email: str | None
    source: str
    authenticated: bool


def _header_first(request: Request, *names: str) -> str | None:
    for name in names:
        value = request.headers.get(name)
        if value:
            return value
    return None


def _normalize_email(raw: str | None) -> str | None:
    if not raw:
        return None
    normalized = raw.strip().lower()
    return normalized or None


def _header_identity_requires_strict_email_match(user_id: str, email: str | None) -> bool:
    required_email = _STRICT_HEADER_TESTER_EMAILS.get((user_id or "").strip().lower())
    if not required_email:
        return False
    return _normalize_email(email) != required_email


def _b64url_decode(segment: str) -> bytes:
    pad = "=" * (-len(segment) % 4)
    return base64.urlsafe_b64decode(segment + pad)


def _safe_json(raw: bytes) -> dict[str, object]:
    try:
        payload = json.loads(raw.decode("utf-8"))
    except Exception:
        return {}
    return payload if isinstance(payload, dict) else {}


def _decode_payload(token: str) -> dict[str, object]:
    parts = token.split(".")
    if len(parts) < 2:
        raise HTTPException(status_code=401, detail="Invalid bearer token format.")
    payload = _safe_json(_b64url_decode(parts[1]))
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid bearer token payload.")
    return payload


def _verify_hs256_if_configured(token: str) -> None:
    secret = os.getenv("AUTH_JWT_HS256_SECRET", "").strip()
    if not secret:
        return
    parts = token.split(".")
    if len(parts) != 3:
        raise HTTPException(status_code=401, detail="Invalid JWT format.")
    signing_input = f"{parts[0]}.{parts[1]}".encode("utf-8")
    expected = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    actual = _b64url_decode(parts[2])
    if not hmac.compare_digest(expected, actual):
        raise HTTPException(status_code=401, detail="JWT signature verification failed.")


def _extract_bearer_token(request: Request) -> str | None:
    raw = request.headers.get("authorization")
    if not raw:
        return None
    m = _TOKEN_RE.match(raw.strip())
    if not m:
        return None
    return m.group(1).strip()


def _auth_provider() -> str:
    return (os.getenv("AUTH_PROVIDER", "") or "").strip().lower()


def _required_env(name: str) -> str:
    value = (os.getenv(name, "") or "").strip()
    if value:
        return value
    raise HTTPException(status_code=503, detail=f"{name} is not configured.")


def _fetch_jwks(jwks_url: str, *, force_refresh: bool = False) -> dict[str, object]:
    cached = _JWKS_CACHE.get(jwks_url)
    now = time.time()
    if not force_refresh and cached and (now - cached[0]) < _JWKS_CACHE_TTL_SECONDS:
        return cached[1]

    req = urlrequest.Request(jwks_url, method="GET")
    req.add_header("Accept", "application/json")
    try:
        with urlrequest.urlopen(req, timeout=10) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except (urlerror.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=503, detail="Auth JWK set could not be loaded.") from exc

    if not isinstance(payload, dict):
        raise HTTPException(status_code=503, detail="Auth JWK set returned an invalid payload.")
    _JWKS_CACHE[jwks_url] = (now, payload)
    return payload


def _jwk_for_kid(jwks: dict[str, object], kid: str) -> dict[str, object] | None:
    keys = jwks.get("keys")
    if not isinstance(keys, list):
        return None
    for key in keys:
        if not isinstance(key, dict):
            continue
        if str(key.get("kid") or "").strip() == kid:
            return key
    return None


def _verify_clerk_jwt(token: str) -> dict[str, object]:
    try:
        header = jwt.get_unverified_header(token)
    except InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Invalid bearer token header.") from exc

    kid = str(header.get("kid") or "").strip()
    if not kid:
        raise HTTPException(status_code=401, detail="Bearer token is missing kid.")

    jwks_url = _required_env("AUTH_JWKS_URL")
    issuer = _required_env("AUTH_ISSUER")
    audience = _required_env("AUTH_AUDIENCE")
    jwks = _fetch_jwks(jwks_url)
    jwk = _jwk_for_kid(jwks, kid)
    if jwk is None:
        jwks = _fetch_jwks(jwks_url, force_refresh=True)
        jwk = _jwk_for_kid(jwks, kid)
    if jwk is None:
        raise HTTPException(status_code=401, detail="Bearer token signing key is unknown.")

    try:
        public_key = RSAAlgorithm.from_jwk(json.dumps(jwk))
        payload = jwt.decode(
            token,
            key=public_key,
            algorithms=["RS256"],
            audience=audience,
            issuer=issuer,
            options={"require": ["sub", "iss", "aud", "exp", "nbf"]},
        )
    except ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Bearer token has expired.") from exc
    except InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Bearer token verification failed.") from exc

    if not isinstance(payload, dict):
        raise HTTPException(status_code=401, detail="Bearer token payload is invalid.")
    return payload


def _decode_verified_payload(token: str) -> dict[str, object]:
    provider = _auth_provider()
    if provider == "clerk":
        return _verify_clerk_jwt(token)
    _verify_hs256_if_configured(token)
    return _decode_payload(token)


def _cached_identity(request: Request) -> AuthIdentity | None:
    user_id = getattr(request.state, "litopc_user_id", None)
    if not isinstance(user_id, str) or not user_id:
        return None
    source = getattr(request.state, "litopc_auth_source", None)
    email = getattr(request.state, "litopc_email", None)
    authenticated = bool(getattr(request.state, "litopc_authenticated", False))
    return AuthIdentity(
        user_id=user_id,
        email=_normalize_email(email) if isinstance(email, str) else None,
        source=str(source or "cached"),
        authenticated=authenticated,
    )


def _cache_identity(request: Request, identity: AuthIdentity) -> AuthIdentity:
    request.state.litopc_user_id = identity.user_id
    request.state.litopc_auth_source = identity.source
    request.state.litopc_authenticated = identity.authenticated
    request.state.litopc_email = identity.email
    return identity


def resolve_auth_identity(request: Request) -> AuthIdentity:
    cached = _cached_identity(request)
    if cached is not None:
        return cached

    auth_required = os.getenv("AUTH_REQUIRED", "0").strip() == "1"
    allow_header_user = os.getenv("AUTH_ALLOW_HEADER_USER", "1").strip() == "1"

    token = _extract_bearer_token(request)
    if token:
        payload = _decode_verified_payload(token)
        raw_sub = payload.get("sub")
        raw_email = payload.get("email")
        header_email = _header_first(request, "x-litopc-email", "x-opclab-email")
        subject = sanitize_user_id(str(raw_sub)) if raw_sub is not None else ""
        email = str(raw_email) if isinstance(raw_email, str) else (header_email.strip() if header_email else None)
        if subject:
            return _cache_identity(
                request,
                AuthIdentity(
                    user_id=f"auth:{subject}",
                    email=_normalize_email(email),
                    source=f"bearer_{_auth_provider() or 'jwt'}",
                    authenticated=True,
                ),
            )
        raise HTTPException(status_code=401, detail="Bearer token missing subject.")

    if allow_header_user:
        header_user = sanitize_user_id(_header_first(request, "x-litopc-user-id", "x-opclab-user-id"))
        header_email = _header_first(request, "x-litopc-email", "x-opclab-email")
        if header_user:
            if _header_identity_requires_strict_email_match(header_user, header_email):
                header_user = ""
            else:
                return _cache_identity(
                    request,
                    AuthIdentity(
                        user_id=f"hdr:{header_user}",
                        email=_normalize_email(header_email),
                        source="header_user",
                        authenticated=True,
                    ),
                )

    client_id = sanitize_user_id(_header_first(request, "x-litopc-client-id", "x-opclab-client-id"))
    if client_id:
        return _cache_identity(
            request,
            AuthIdentity(
                user_id=f"cid:{client_id}",
                email=None,
                source="client_id",
                authenticated=False,
            ),
        )

    if auth_required:
        raise HTTPException(status_code=401, detail="Authentication required.")

    return _cache_identity(
        request,
        AuthIdentity(user_id="anon:unknown", email=None, source="anonymous", authenticated=False),
    )


def require_authenticated_identity(request: Request, *, require_email: bool = True) -> AuthIdentity:
    identity = resolve_auth_identity(request)
    if not identity.authenticated:
        raise HTTPException(status_code=401, detail="Authentication required.")
    email = _normalize_email(identity.email)
    if require_email and not email:
        raise HTTPException(status_code=401, detail="Signed-in account is missing an email identity.")
    if email != identity.email:
        identity = _cache_identity(
            request,
            AuthIdentity(
                user_id=identity.user_id,
                email=email,
                source=identity.source,
                authenticated=identity.authenticated,
            ),
        )
    return identity
