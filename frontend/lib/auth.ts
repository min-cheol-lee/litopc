const ACCESS_TOKEN_KEY = "litopc_access_token_v1";
const LEGACY_ACCESS_TOKEN_KEY = "opclab_access_token_v1";
const DEV_USER_ID_KEY = "litopc_user_id_v1";
const LEGACY_DEV_USER_ID_KEY = "opclab_user_id_v1";
const DEV_EMAIL_KEY = "litopc_email_v1";
const LEGACY_DEV_EMAIL_KEY = "opclab_email_v1";

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

export function getAccessToken(): string | null {
  const raw = getFirstLocalStorageValue(ACCESS_TOKEN_KEY, LEGACY_ACCESS_TOKEN_KEY);
  if (!raw) return null;
  const token = raw.trim();
  return token.length > 0 ? token : null;
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

export function getDevUserId(): string | null {
  const raw = getFirstLocalStorageValue(DEV_USER_ID_KEY, LEGACY_DEV_USER_ID_KEY);
  if (!raw) return null;
  const userId = raw.trim();
  return userId.length > 0 ? userId : null;
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

export function getDevEmail(): string | null {
  const raw = getFirstLocalStorageValue(DEV_EMAIL_KEY, LEGACY_DEV_EMAIL_KEY);
  if (!raw) return null;
  const email = raw.trim();
  return email.length > 0 ? email : null;
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
