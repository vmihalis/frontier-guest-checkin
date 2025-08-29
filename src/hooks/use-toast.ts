"use client"

import * as React from "react"

interface ToastProps {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

function useToast() {
  const toast = React.useCallback(({ title, description }: ToastProps) => {
    // Simple console.log implementation for now
    // In a real app, this would show a toast notification
    console.log("Toast:", { title, description })
    
    // For demo purposes, we could also use browser alert
    if (title && description) {
      alert(`${title}\n${description}`)
    } else if (title) {
      alert(title)
    }
  }, [])

  return { toast }
}

export { useToast }