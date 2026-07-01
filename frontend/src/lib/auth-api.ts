import { api } from './api';

export interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'TENANT' | 'OWNER' | 'ADMIN';
  avatarUrl?: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserData;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'TENANT' | 'OWNER';
  phone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export function registerUser(data: RegisterRequest) {
  return api.post<AuthResponse>('/auth/register', data);
}

export function loginUser(data: LoginRequest) {
  return api.post<AuthResponse>('/auth/login', data);
}

export function refreshToken(token: string) {
  return api.post<AuthResponse>('/auth/refresh', { refreshToken: token });
}

export function getMe() {
  return api.get<{ user: UserData & { tenantProfile?: unknown } }>('/auth/me');
}

export function logoutUser() {
  return api.post('/auth/logout');
}
