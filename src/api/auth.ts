import { api } from './client';
import type { AuthMeResponse } from '@/types/api';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  [key: string]: unknown;
}

export interface SignupResponse {
  userId: string;
  email: string;
}

// Accounts are created auto-confirmed but signup itself returns no session —
// callers must follow up with login().
export function signup(email: string, password: string, fullName?: string) {
  return api.post<SignupResponse>('/auth/signup', { email, password, fullName }, { auth: false });
}

export function login(email: string, password: string) {
  return api.post<LoginResponse>('/auth/login', { email, password }, { auth: false });
}

export function forgotPassword(email: string) {
  return api.post<{ message: string }>('/auth/forgot-password', { email }, { auth: false });
}

export function logout() {
  return api.post<{ message: string }>('/auth/logout');
}

export function getMe() {
  return api.get<AuthMeResponse>('/auth/me');
}
