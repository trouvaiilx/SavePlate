const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

export const api = async (path: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('sp_token');
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || 'Request failed') as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return data;
};