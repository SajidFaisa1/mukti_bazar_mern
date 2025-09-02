import React, { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])

  const push = useCallback((toast) => {
    const id = crypto.randomUUID()
    const t = { id, duration: 3500, ...toast }
    setToasts(ts => [...ts, t])
    if (t.duration !== 0) {
      setTimeout(() => setToasts(ts => ts.filter(x => x.id !== id)), t.duration)
    }
    return id
  }, [])

  const dismiss = useCallback((id) => setToasts(ts => ts.filter(t => t.id !== id)), [])

  return (
    <ToastContext.Provider value={{ push, dismiss }}>
      {children}
      {/* ARIA live region for screen readers */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {toasts.slice(-1).map(t => `${t.title || ''} ${t.message || ''}`)}
      </div>
      <div className="fixed z-[100] bottom-4 left-1/2 -translate-x-1/2 space-y-2 w-full max-w-sm px-4" role="region" aria-label="Notifications">
        {toasts.map(t => (
          <div key={t.id} className="rounded-lg shadow border border-gray-200 bg-white/90 backdrop-blur px-4 py-3 text-sm flex items-start gap-3 animate-fade-in">
            <div className="flex-1">
              {t.title && <p className="font-medium text-gray-800 leading-tight">{t.title}</p>}
              {t.message && <p className="text-gray-600 text-xs mt-0.5">{t.message}</p>}
              {t.action && (
                <button onClick={() => { t.action.onClick(); dismiss(t.id) }} className="mt-2 text-emerald-600 text-xs font-semibold hover:underline">
                  {t.action.label}
                </button>
              )}
            </div>
            <button onClick={() => dismiss(t.id)} className="ml-2 text-gray-400 hover:text-gray-600 text-xs">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

// CSS animation (can be placed globally; inline style kept minimal)