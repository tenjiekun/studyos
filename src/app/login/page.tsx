"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Flame, AlertCircle, Loader2, Mail, Lock, Eye, EyeOff, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

function LoginPageInner() {
  const { user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, bypassLogin, isConfigured } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Flame className="w-8 h-8 text-primary animate-pulse-soft" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) return null;

  async function handleGoogleSignIn() {
    if (!isConfigured) {
      setAuthError("Google sign-in requires Supabase to be configured.");
      return;
    }
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch {
      setSigningIn(false);
    }
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    setAuthError(null);
    setAuthMessage(null);

    if (!email || !password) {
      setAuthError("Please fill in all fields.");
      setFormLoading(false);
      return;
    }

    if (password.length < 6) {
      setAuthError("Password must be at least 6 characters.");
      setFormLoading(false);
      return;
    }

    if (isSignUp && !username.trim()) {
      setAuthError("Please enter a username.");
      setFormLoading(false);
      return;
    }

    if (isSignUp) {
      const result = await signUpWithEmail(email, password, username.trim());
      if (result.error) {
        setAuthError(result.error);
      } else if (result.message) {
        setAuthMessage(result.message);
      }
    } else {
      const result = await signInWithEmail(email, password);
      if (result.error) {
        setAuthError(result.error);
      }
    }
    setFormLoading(false);
  }

  function handleBypass() {
    bypassLogin();
    router.push("/");
  }

  const displayError = authError || (error === "auth_failed" ? "Authentication failed. Please try again." : error ? "Something went wrong. Please try again." : null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-8 animate-fade-in">
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Flame className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">StudyOS</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your personal study command center
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-lg font-medium">Welcome</h2>
            <p className="text-sm text-muted-foreground">
              {isSignUp ? "Create your account" : "Sign in to sync your study data across devices"}
            </p>
          </div>

          {/* Error message */}
          {displayError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{displayError}</span>
            </div>
          )}

          {/* Success message */}
          {authMessage && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 text-emerald-600 text-sm">
              <Mail className="w-4 h-4 shrink-0" />
              <span>{authMessage}</span>
            </div>
          )}

          {/* Email/Password Form — always visible */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {/* Username field (signup only) */}
            {isSignUp && (
              <div className="space-y-2 animate-fade-in">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Your display name"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-9 h-10"
                    disabled={formLoading}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 h-10"
                  disabled={formLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-9 h-10"
                  disabled={formLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-10 gap-2 text-sm font-medium"
              disabled={formLoading}
            >
              {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {formLoading
                ? isSignUp ? "Creating account..." : "Signing in..."
                : isSignUp ? "Create Account" : "Sign In"}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setAuthError(null);
                  setAuthMessage(null);
                }}
                className="text-primary hover:underline font-medium"
              >
                {isSignUp ? "Sign in" : "Sign up"}
              </button>
            </p>
          </form>

          {/* Divider + Google (only if Supabase configured) */}
          {isConfigured && (
            <>
              <div className="relative">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                  or
                </span>
              </div>

              <Button
                variant="outline"
                className="w-full h-10 gap-3 text-sm font-medium"
                onClick={handleGoogleSignIn}
                disabled={signingIn}
              >
                {signingIn ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
                {signingIn ? "Signing in..." : "Continue with Google"}
              </Button>
            </>
          )}

          {/* Bypass Button */}
          <Button
            variant="ghost"
            className="w-full h-10 gap-2 text-xs text-muted-foreground"
            onClick={handleBypass}
          >
            Skip login — use local mode
          </Button>
        </div>

        <p className="text-center text-[10px] text-muted-foreground">
          Your data is synced securely to the cloud
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Flame className="w-8 h-8 text-primary animate-pulse-soft" />
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
