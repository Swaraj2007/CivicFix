export interface User {
  id: number;
  full_name: string;
  email: string;
  role: 'CITIZEN' | 'ADMIN';
}

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000';

export async function login(email: string, password: string):Promise<{token:string, user:User}> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Login failed');
  }
  const data = await res.json();
  return { token: data.access_token, user: data.user };
}

export async function signup(full_name: string, email: string, password: string, phone?: string):Promise<{token:string, user:User}> {
  const res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ full_name, email, password, phone })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Signup failed');
  }
  const data = await res.json();
  return { token: data.access_token, user: data.user };
}

export async function getMe(): Promise<User> {
  const token = localStorage.getItem('civicfix_token');
  if (!token) throw new Error("No token");
  const res = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Not authenticated");
  return res.json();
}
