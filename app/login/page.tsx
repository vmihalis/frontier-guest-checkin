"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Logo } from "@/components/ui/logo"
import { PageCard } from "@/components/ui/page-card"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [isFormValid, setIsFormValid] = useState(false)
  const { toast } = useToast()

  // Basic email validation
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Validate form fields
  useEffect(() => {
    const emailValid = email.length > 0 && validateEmail(email)
    const passwordValid = password.length > 0

    setEmailError(email.length > 0 && !validateEmail(email) ? "Please enter a valid email address" : "")
    setPasswordError(password.length > 0 && password.length < 1 ? "Password is required" : "")

    setIsFormValid(emailValid && passwordValid)
  }, [email, password])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Basic validation
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address")
      return
    }

    if (password.length === 0) {
      setPasswordError("Password is required")
      return
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: "Sign-in failed",
          description: data.error || "Please check your credentials.",
          variant: "destructive"
        });
        return;
      }

      // Clear any existing auth data and store new token
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('auth-token', data.token);
      localStorage.setItem('current-user', JSON.stringify(data.user));

      toast({
        title: "Sign-in successful",
        description: `Welcome, ${data.user.name}!`,
      });

      // Redirect to invites page
      window.location.href = '/invites';
    } catch (error) {
      console.error('Sign-in error:', error);
      toast({
        title: "Sign-in failed",
        description: "Network error. Please try again.",
        variant: "destructive"
      });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 space-y-3">
          <div className="mx-auto mb-2 flex justify-center">
            <Logo size="md" priority className="rounded-xl" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Frontier Tower</h1>
          <p className="text-muted-foreground">Sign in to invite guests</p>
        </div>
        
        <PageCard
          title="Sign In"
          description="Enter your credentials to access the host dashboard"
          className="w-full shadow-lg"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-describedby={emailError ? "email-error" : undefined}
className={emailError ? "border-red-500 focus:border-red-500 focus:ring-red-200" : ""}
              />
              {emailError && (
                <div className="bg-red-500/10 dark:bg-red-500/20 border border-red-500/20 dark:border-red-500/30 rounded-lg p-4">
                  <p id="email-error" className="text-sm text-red-700 dark:text-red-400" aria-live="polite">
                    {emailError}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-describedby={passwordError ? "password-error" : undefined}
className={passwordError ? "border-red-500 focus:border-red-500 focus:ring-red-200" : ""}
              />
              {passwordError && (
                <div className="bg-red-500/10 dark:bg-red-500/20 border border-red-500/20 dark:border-red-500/30 rounded-lg p-4">
                  <p id="password-error" className="text-sm text-red-700 dark:text-red-400" aria-live="polite">
                    {passwordError}
                  </p>
                </div>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-3 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
              disabled={!isFormValid}
            >
              Sign In
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center">
            By continuing you agree to the{" "}
            <a href="#" className="underline text-primary hover:text-primary/80">
              Terms
            </a>{" "}
            &{" "}
            <a href="#" className="underline text-primary hover:text-primary/80">
              Privacy
            </a>
            .
          </p>
        </PageCard>
      </div>
    </div>
  )
}