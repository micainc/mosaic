// Talks to the mosaic-backend API. Set VITE_API_URL in .env.local (see .env.example).
export const API_URL = import.meta.env.VITE_API_URL as string | undefined;

const TOKEN_KEY = 'mosaic-token';

export interface User {
  id: string;
  email: string;
  organizationId: string;
  role: 'admin' | 'member';
}

function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

// fetch wrapper that attaches the session token; use for any authenticated API call
export function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
}

export async function login(email: string, password: string): Promise<User> {
  const res = await apiFetch('/api/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Sign-in failed');
  localStorage.setItem(TOKEN_KEY, data.token);
  return data.user;
}

// Returns the signed-in user, or null if there's no valid session
export async function getCurrentUser(): Promise<User | null> {
  if (!getToken()) return null;
  const res = await apiFetch('/api/me');
  if (!res.ok) {
    logout();
    return null;
  }
  return (await res.json()).user;
}

export function logout() {
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
}
