// src/api/auth.ts
import { api, ensureCsrfCookie } from './client'

export interface Me {
  id: string;
  username: string;
  email: string;
  role: "PATIENT" | "PHYSICIAN";
}

export async function login(username: string, password: string): Promise<Me> {
  await ensureCsrfCookie()
  const { data } = await api.post('/auth/login/', { username, password })
  // keep token fresh for subsequent requests
  if (data?.csrfToken) api.defaults.headers['X-CSRFToken'] = data.csrfToken
  return data.user
}

export async function me(): Promise<Me | null> {
  try {
    const { data } = await api.get('/auth/me/')
    return data.user
  } catch (error) {
    return null
  }
}

export async function getMe(): Promise<Me | null> {
  return me()
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout/')
}