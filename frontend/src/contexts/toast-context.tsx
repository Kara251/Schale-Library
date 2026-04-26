'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ToastVariant = 'success' | 'error' | 'info'

interface ToastInput {
  title?: string
  message: string
  variant?: ToastVariant
}

interface ToastItem extends ToastInput {
  id: number
  variant: ToastVariant
}

interface ToastContextValue {
  showToast: (toast: ToastInput) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback((toast: ToastInput) => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    const nextToast: ToastItem = {
      id,
      variant: toast.variant || 'info',
      title: toast.title,
      message: toast.message,
    }

    setToasts((current) => [...current.slice(-3), nextToast])
    window.setTimeout(() => dismissToast(id), 4500)
  }, [dismissToast])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map((toast) => {
          const Icon = icons[toast.variant]
          return (
            <div
              key={toast.id}
              className={cn(
                'pointer-events-auto rounded-lg border bg-card p-4 text-card-foreground shadow-lg',
                toast.variant === 'success' && 'border-primary/30',
                toast.variant === 'error' && 'border-destructive/40',
                toast.variant === 'info' && 'border-border'
              )}
              role="status"
            >
              <div className="flex items-start gap-3">
                <Icon
                  className={cn(
                    'mt-0.5 h-5 w-5 shrink-0',
                    toast.variant === 'success' && 'text-primary',
                    toast.variant === 'error' && 'text-destructive',
                    toast.variant === 'info' && 'text-muted-foreground'
                  )}
                />
                <div className="min-w-0 flex-1">
                  {toast.title ? <p className="font-medium">{toast.title}</p> : null}
                  <p className="text-sm leading-6 text-muted-foreground">{toast.message}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => dismissToast(toast.id)}
                  aria-label="Dismiss notification"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }

  return context
}
