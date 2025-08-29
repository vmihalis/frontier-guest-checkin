"use client"

import * as React from "react"

interface ToastProps {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

interface ToastContextType {
  toasts: Array<ToastProps & { id: string }>
  addToast: (toast: ToastProps) => void
  removeToast: (id: string) => void
}

const ToastContext = React.createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Array<ToastProps & { id: string }>>([])

  const addToast = React.useCallback((toast: ToastProps) => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts((prev) => [...prev, { ...toast, id }])
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{toasts, addToast, removeToast}}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

function ToastContainer() {
  const context = React.useContext(ToastContext)
  if (!context) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {context.toasts.map((toast) => (
        <div
          key={toast.id}
          className={`min-w-80 max-w-md p-4 rounded-lg shadow-lg border transition-all duration-300 transform translate-x-0 ${
            toast.variant === "destructive"
              ? "bg-red-50 border-red-200 text-red-800"
              : "bg-white border-gray-200 text-gray-900"
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              {toast.title && (
                <h3 className="text-sm font-medium mb-1">{toast.title}</h3>
              )}
              {toast.description && (
                <p className="text-sm opacity-80">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => context.removeToast(toast.id)}
              className="ml-4 text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    // Fallback for components not wrapped in ToastProvider
    return {
      toast: ({ title, description }: ToastProps) => {
        console.log("Toast:", { title, description })
        if (title && description) {
          alert(`${title}\n${description}`)
        } else if (title) {
          alert(title)
        }
      }
    }
  }

  return {
    toast: context.addToast
  }
}

export { useToast }