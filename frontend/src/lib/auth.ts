/**
 * 认证相关工具函数
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8083';

export interface LoginCredentials {
  identifier: string; // email or username
  password: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  confirmed: boolean;
  blocked: boolean;
}

export interface AuthResponse {
  jwt: string;
  user: User;
}

/**
 * 登录
 */
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/api/auth/local`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || '登录失败');
  }

  return response.json();
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(token: string): Promise<User> {
  const response = await fetch(`${API_URL}/api/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('获取用户信息失败');
  }

  return response.json();
}

/**
 * 存储 token 到 localStorage
 */
export function setAuthToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token);
  }
}

/**
 * 从 localStorage 获取 token
 */
export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
}

/**
 * 删除 token
 */
export function removeAuthToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
  }
}

/**
 * 检查是否已登录
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

/**
 * 登出
 */
export function logout(): void {
  removeAuthToken();
  if (typeof window !== 'undefined') {
    window.location.href = '/';
  }
}
