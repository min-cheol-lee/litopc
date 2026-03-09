const ACCESS_TOKEN_KEY = "litopc_access_token_v1";
const LEGACY_ACCESS_TOKEN_KEY = "opclab_access_token_v1";
const DEV_USER_ID_KEY = "litopc_user_id_v1";
const LEGACY_DEV_USER_ID_KEY = "opclab_user_id_v1";
const DEV_EMAIL_KEY = "litopc_email_v1";
const LEGACY_DEV_EMAIL_KEY = "opclab_email_v1";

export type RuntimeAuthState = {
  ready: boolean;
  signedIn: boolean;
  token: string | null;
  userId: string | null;
  email: string | null;
};

type RuntimeAuthActions = {
  openSignIn: ((redirectUrl: string) => void) | null;
  signOut: ((redirectUrl: string) => Promise<void>) | null;
};

function trimOrNull(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

const PUBLIC_AUTH_ENABLED = Boolean(trimOrNull(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY));

const DEFAULT_RUNTIME_AUTH_STATE: RuntimeAuthState = {
  ready: !PUBLIC_AUTH_ENABLED,
  signedIn: false,
  token: null,
  userId: null,
  email: null,
};

let runtimeAuthState: RuntimeAuthState = DEFAULT_RUNTIME_AUTH_STATE;
let runtimeAuthActions: RuntimeAuthActions = {
  openSignIn: null,
  signOut: null,
};
const runtimeAuthListeners = new Set<() => void>();

function emitRuntimeAuthChange(): void {
  runtimeAuthListeners.forEach((listener) => listener());
}

function safeLocalStorageGetItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageRemoveItem(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage failures in dev/test helpers.
  }
}

function safeLocalStorageSetItem(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures in dev/test helpers.
  }
}

function getFirstLocalStorageValue(...keys: string[]): string | null {
  for (const key of keys) {
    const value = safeLocalStorageGetItem(key);
    if (value) return value;
  }
  return null;
}

export function isInternalLoginEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_INTERNAL_LOGIN === "1" || process.env.NODE_ENV !== "production";
}

export function isPublicAuthEnabled(): boolean {
  return PUBLIC_AUTH_ENABLED;
}

export function getRuntimeAuthState(): RuntimeAuthState {
  return runtimeAuthState;
}

export function subscribeRuntimeAuth(listener: () => void): () => void {
  runtimeAuthListeners.add(listener);
  return () => runtimeAuthListeners.delete(listener);
}

export function setRuntimeAuthState(next: RuntimeAuthState): void {
  const normalized: RuntimeAuthState = {
    ready: next.ready,
    signedIn: next.signedIn,
    token: trimOrNull(next.token),
    userId: trimOrNull(next.userId),
    email: trimOrNull(next.email)?.toLowerCase() ?? null,
  };
  const unchanged =
    runtimeAuthState.ready === normalized.ready &&
    runtimeAuthState.signedIn === normalized.signedIn &&
    runtimeAuthState.token === normalized.token &&
    runtimeAuthState.userId === normalized.userId &&
    runtimeAuthState.email === normalized.email;
  if (unchanged) return;
  runtimeAuthState = normalized;
  emitRuntimeAuthChange();
}

export function setRuntimeAuthActions(next: Partial<RuntimeAuthActions>): void {
  runtimeAuthActions = {
    ...runtimeAuthActions,
    ...next,
  };
}

export function resetRuntimeAuthState(ready: boolean = true): void {
  setRuntimeAuthState({ ...DEFAULT_RUNTIME_AUTH_STATE, ready });
}

export function getStoredAccessToken(): string | null {
  return trimOrNull(getFirstLocalStorageValue(ACCESS_TOKEN_KEY, LEGACY_ACCESS_TOKEN_KEY));
}

export function getAccessToken(): string | null {
  return trimOrNull(runtimeAuthState.token) ?? getStoredAccessToken();
}

export function setAccessToken(token: string): void {
  const value = token.trim();
  if (!value) {
    safeLocalStorageRemoveItem(ACCESS_TOKEN_KEY);
    safeLocalStorageRemoveItem(LEGACY_ACCESS_TOKEN_KEY);
    return;
  }
  safeLocalStorageRemoveItem(LEGACY_ACCESS_TOKEN_KEY);
  safeLocalStorageSetItem(ACCESS_TOKEN_KEY, value);
}

export function getStoredDevUserId(): string | null {
  return trimOrNull(getFirstLocalStorageValue(DEV_USER_ID_KEY, LEGACY_DEV_USER_ID_KEY));
}

export function getDevUserId(): string | null {
  if (!isInternalLoginEnabled()) return null;
  return getStoredDevUserId();
}

export function setDevUserId(userId: string): void {
  const value = userId.trim();
  if (!value) {
    safeLocalStorageRemoveItem(DEV_USER_ID_KEY);
    safeLocalStorageRemoveItem(LEGACY_DEV_USER_ID_KEY);
    return;
  }
  safeLocalStorageRemoveItem(LEGACY_DEV_USER_ID_KEY);
  safeLocalStorageSetItem(DEV_USER_ID_KEY, value);
}

export function getStoredDevEmail(): string | null {
  return trimOrNull(getFirstLocalStorageValue(DEV_EMAIL_KEY, LEGACY_DEV_EMAIL_KEY));
}

export function getDevEmail(): string | null {
  if (!isInternalLoginEnabled()) return null;
  return getStoredDevEmail();
}

export function setDevEmail(email: string): void {
  const value = email.trim();
  if (!value) {
    safeLocalStorageRemoveItem(DEV_EMAIL_KEY);
    safeLocalStorageRemoveItem(LEGACY_DEV_EMAIL_KEY);
    return;
  }
  safeLocalStorageRemoveItem(LEGACY_DEV_EMAIL_KEY);
  safeLocalStorageSetItem(DEV_EMAIL_KEY, value);
}

export async function beginPublicSignIn(redirectUrl: string): Promise<boolean> {
  const openSignIn = runtimeAuthActions.openSignIn;
  if (!openSignIn) return false;
  openSignIn(redirectUrl);
  return true;
}

export async function signOutPublicUser(redirectUrl: string): Promise<boolean> {
  const signOut = runtimeAuthActions.signOut;
  if (!signOut) return false;
  await signOut(redirectUrl);
  return true;
}
