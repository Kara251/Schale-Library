import 'server-only'

import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import type { User } from '@/lib/auth'

const STRAPI_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8083'
const DEFAULT_ALLOWED_ROLES = 'authenticated'
const SESSION_MAX_AGE = 60 * 60 * 8

export const ADMIN_SESSION_COOKIE = 'schale_admin_session'

interface UserRole {
  id?: number
  name?: string
  type?: string
  description?: string
}

export interface AdminUser extends User {
  role?: UserRole | null
  createdAt?: string
  updatedAt?: string
}

export interface AdminSession {
  token: string
  user: AdminUser
}

function getAllowedRoles(): Set<string> {
  const configuredRoles = process.env.ADMIN_PANEL_ALLOWED_ROLES || DEFAULT_ALLOWED_ROLES

  return new Set(
    configuredRoles
      .split(',')
      .map((role) => role.trim().toLowerCase())
      .filter(Boolean)
  )
}

export function isAllowedAdminUser(user: AdminUser): boolean {
  if (user.blocked) {
    return false
  }

  const allowedRoles = getAllowedRoles()
  const roleCandidates = [user.role?.type, user.role?.name]
    .filter((role): role is string => Boolean(role))
    .map((role) => role.toLowerCase())

  if (roleCandidates.length === 0) {
    return process.env.ADMIN_PANEL_ALLOW_MISSING_ROLE === 'true'
  }

  return roleCandidates.some((role) => allowedRoles.has(role))
}

export async function fetchStrapiCurrentUser(token: string): Promise<AdminUser | null> {
  const response = await fetch(`${STRAPI_URL}/api/users/me?populate=role`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    return null
  }

  const user = (await response.json()) as AdminUser
  return isAllowedAdminUser(user) ? user : null
}

export function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  }
}

export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value

  if (!token) {
    return null
  }

  const user = await fetchStrapiCurrentUser(token)
  if (!user) {
    return null
  }

  return { token, user }
})

export async function requireAdminSession(locale: string, nextPath: string): Promise<AdminSession> {
  const session = await getAdminSession()

  if (!session) {
    redirect(`/${locale}/login?next=${encodeURIComponent(nextPath)}`)
  }

  return session
}
