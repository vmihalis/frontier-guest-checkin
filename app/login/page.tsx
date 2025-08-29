"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

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

  const handleSubmit = (e: React.FormEvent) => {
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

    // TODO: Replace with actual API call to authenticate user
    // Example: const response = await fetch('/api/auth/signin', { method: 'POST', body: JSON.stringify({ email, password }) })

    console.log({ email, password })

    toast({
      title: "Mock sign-in successful",
      description: "You would now be redirected to the dashboard.",
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-semibold">Frontier Tower</CardTitle>
          <CardDescription className="text-muted-foreground">Sign in to invite guests</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-describedby={emailError ? "email-error" : undefined}
                className={emailError ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {emailError && (
                <p id="email-error" className="text-sm text-destructive" aria-live="polite">
                  {emailError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-describedby={passwordError ? "password-error" : undefined}
                className={passwordError ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {passwordError && (
                <p id="password-error" className="text-sm text-destructive" aria-live="polite">
                  {passwordError}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={!isFormValid}>
              Sign In
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center">
            By continuing you agree to the{" "}
            <a href="#" className="underline hover:text-foreground">
              Terms
            </a>{" "}
            &{" "}
            <a href="#" className="underline hover:text-foreground">
              Privacy
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  )
}