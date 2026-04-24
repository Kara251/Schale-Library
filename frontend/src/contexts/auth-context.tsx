'use client'

import { createContext, useCallback, useContext, useState, useEffect, ReactNode, useMemo } from 'react'
import { User, fetchSession, logout as logoutRequest } from '@/lib/auth'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    fetchSession()
      .then((currentUser) => {
        if (!cancelled) {
          setUser(currentUser)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const logout = useCallback(async () => {
    setUser(null)

    try {
      await logoutRequest()
    } catch {
      // ignore network logout failure and continue clearing local state
    }

    const localeMatch = window.location.pathname.match(/^\/(zh-Hans|en|ja)(?:\/|$)/)
    const nextPath = localeMatch ? `/${localeMatch[1]}` : '/'
    window.location.href = nextPath
  }, [])

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      setUser,
      logout,
    }),
    [user, isLoading, logout]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    // 返回默认值而不是抛出错误，以支持错误页面等特殊场景
    return {
      user: null,
      isLoading: false,
      isAuthenticated: false,
      setUser: () => {},
      logout: async () => {},
    }
  }
  return context
}
