/**
 * 认证相关工具函数
 */

export interface LoginCredentials {
  identifier: string; // email or username
  password: string;
}

export interface UserRole {
  id?: number;
  name?: string;
  type?: string;
  description?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  confirmed: boolean;
  blocked: boolean;
  role?: UserRole | null;
}

export interface AuthResponse {
  user: User;
}

/**
 * 登录
 */
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await fetch('/api/admin/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
    credentials: 'same-origin',
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    // 错误码由 UI 层按 locale 映射为文案（见 login 页）
    throw new Error(payload?.error || 'invalid_credentials');
  }

  return response.json();
}

/**
 * 获取当前会话信息
 */
export async function fetchSession(): Promise<User | null> {
  const response = await fetch('/api/admin/auth/session', {
    credentials: 'same-origin',
    cache: 'no-store',
  });

  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    throw new Error('session_fetch_failed');
  }

  const data = (await response.json()) as { user: User | null };
  return data.user;
}

/**
 * 登出
 */
export async function logout(): Promise<void> {
  await fetch('/api/admin/auth/logout', {
    method: 'POST',
    credentials: 'same-origin',
  });
}
