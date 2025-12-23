'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, getAuthToken, removeAuthToken, getCurrentUser } from '@/lib/auth'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 检查是否有 token
    const token = getAuthToken()
    if (token) {
      // 获取用户信息
      getCurrentUser(token)
        .then(setUser)
        .catch(() => {
          // token 无效，清除
          removeAuthToken()
        })
        .finally(() => {
          setIsLoading(false)
        })
    } else {
      setIsLoading(false)
    }
  }, [])

  const logout = () => {
    setUser(null)
    removeAuthToken()
    window.location.href = '/'
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        setUser,
        logout,
      }}
    >
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
      logout: () => {},
    }
  }
  return context
}
