/**
 * Admin token handling for the destructive endpoints (record delete, dataset
 * reset, price-band and COP edits).
 *
 * The token is held in localStorage on the admin's own device and sent as the
 * x-admin-token header. It is deliberately never bundled into the app: the
 * build is public, so a token compiled into it would be a token published to
 * every farmer who opens the page.
 */

const STORAGE_KEY = 'pepper_index_admin_token';

export function getAdminToken(): string | null {
  try {
    const token = localStorage.getItem(STORAGE_KEY);
    return token && token.trim().length > 0 ? token : null;
  } catch {
    // Private browsing can throw on access rather than returning null.
    return null;
  }
}

export function setAdminToken(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, token.trim());
  } catch {
    // Non-fatal: the caller still holds the token for this request.
  }
}

export function clearAdminToken(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do.
  }
}

/** Returns the stored token, asking for one if this device has none. */
export function promptForAdminToken(): string | null {
  const existing = getAdminToken();
  if (existing) return existing;

  const entered = window.prompt(
    'Admin token required for this action.\nAsk the group administrator for the token configured on the server.',
  );
  if (!entered || entered.trim().length === 0) return null;

  setAdminToken(entered);
  return entered.trim();
}

export interface AdminRequestResult {
  ok: boolean;
  status: number;
  error?: string;
  data?: unknown;
}

/** Performs an admin-gated call, clearing a rejected token so the next attempt re-prompts. */
export async function adminRequest(path: string, init: RequestInit = {}): Promise<AdminRequestResult> {
  const token = promptForAdminToken();
  if (!token) {
    return { ok: false, status: 401, error: 'Admin token required.' };
  }

  try {
    const res = await fetch(path, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        'x-admin-token': token,
      },
    });

    const json = await res.json().catch(() => ({}));

    if (res.status === 401) {
      clearAdminToken();
      return { ok: false, status: 401, error: 'Admin token rejected. Please re-enter it.' };
    }

    if (!res.ok) {
      return { ok: false, status: res.status, error: json.error || `Request failed (${res.status})` };
    }

    return { ok: true, status: res.status, data: json.data };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}
