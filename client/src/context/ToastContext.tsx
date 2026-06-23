import React, { createContext, useContext, useState, useCallback } from 'react'
import type { ToastMessage } from '../types'

interface ToastCtx { addToast: (msg: string, type?: ToastMessage['type']) => void }

const ToastContext = createContext<ToastCtx | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = useCallback((message: string, type: ToastMessage['type'] = 'error') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(p => [...p, { id, message, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-xs">
        {toasts.map(t => (
          <div key={t.id}
            className={[
              'animate-fade-up flex items-center gap-2.5 px-4 py-3 rounded-card shadow-card',
              'text-sm font-medium border-l-4',
              t.type === 'error'   ? 'bg-white border-berry-red   text-berry-red' : '',
              t.type === 'success' ? 'bg-white border-berry-green text-berry-green' : '',
              t.type === 'info'    ? 'bg-white border-berry       text-berry' : '',
            ].join(' ')}
          >
            {t.type === 'error' ? '✕' : t.type === 'success' ? '✓' : 'ℹ'}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastCtx {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast: missing ToastProvider')
  return ctx
}
