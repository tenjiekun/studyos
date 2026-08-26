"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense, useCallback } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle, Loader2, Mail, Lock, Eye, EyeOff, User,
  Shield, Lock as LockIcon, Users,
} from "lucide-react";
import { LoginScene3D } from "@/components/login/LoginScene3D";

function LoginPageInner() {
  const { user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, isConfigured } = useAuth();
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
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  const handleGoogleSignIn = useCallback(async () => {
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
  }, [isConfigured, signInWithGoogle]);

  const handleEmailAuth = useCallback(async (e: React.FormEvent) => {
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
      const result = await signUpWithEmail(email, password, username.trim(), username.trim());
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
  }, [email, password, isSignUp, username, signInWithEmail, signUpWithEmail]);

  const displayError = authError || (error === "auth_failed" ? "Authentication failed. Please try again." : error ? "Something went wrong. Please try again." : null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050510]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center animate-pulse">
            <div className="w-5 h-5 rounded-sm bg-indigo-400" />
          </div>
          <p className="text-xs text-white/40 tracking-wider">Loading StudyOS…</p>
        </div>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#050510]">
      {/* === LEFT SIDE — 3D StudyOS Environment (65%) === */}
      <div className="relative w-full lg:w-[65%] min-h-[40vh] lg:min-h-screen overflow-hidden">
        {/* 3D Canvas */}
        <div className="absolute inset-0">
          <LoginScene3D />
        </div>

        {/* Branding overlay */}
        <div className="relative z-10 h-full flex flex-col justify-between p-6 md:p-10 lg:p-14 pointer-events-none">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex items-center gap-2.5"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
              <div className="w-4 h-4 rounded-sm bg-indigo-400" />
            </div>
            <span className="text-sm font-medium tracking-wider text-white/90">StudyOS</span>
          </motion.div>

          {/* Hero text */}
          <div className="flex-1 flex flex-col justify-center max-w-lg">
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-[11px] text-indigo-400/60 tracking-[0.25em] uppercase mb-3"
            >
              Welcome back
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight mb-5"
              style={{ textShadow: "0 0 60px rgba(99,102,241,0.15)" }}
            >
              STUDYOS
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.65 }}
              className="text-base md:text-lg text-white/50 font-light leading-relaxed mb-1"
            >
              Your entire study system.
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.75 }}
              className="text-base md:text-lg text-white/50 font-light leading-relaxed mb-5"
            >
              In one place.
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.85 }}
              className="text-sm text-indigo-400/70 tracking-wider"
            >
              Plan. Focus. Measure. Improve.
            </motion.p>
          </div>

          {/* Trust */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.2 }}
            className="flex items-center gap-2"
          >
            <div className="w-5 h-5 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <div className="w-2 h-2 rounded-sm bg-emerald-400" />
            </div>
            <div>
              <p className="text-[11px] text-white/30">Built for serious students.</p>
              <p className="text-[11px] text-white/20">Privacy first. Secure. Always.</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* === RIGHT SIDE — Authentication Panel (35%) === */}
      <div className="relative w-full lg:w-[35%] flex items-center justify-center p-6 md:p-10 lg:p-14 min-h-[60vh] lg:min-h-screen">
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
          className="relative w-full max-w-[380px]"
        >
          {/* Glassmorphic panel */}
          <div className="relative rounded-2xl border border-white/[0.08] bg-[#0c0e1a]/80 backdrop-blur-2xl shadow-[0_0_60px_rgba(99,102,241,0.08)] overflow-hidden">
            {/* Gradient overlay */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/[0.06] via-transparent to-purple-500/[0.04] pointer-events-none" />

            <div className="relative p-7 md:p-8 space-y-6">
              {/* Icon */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-md bg-indigo-400/80" />
                </div>
              </motion.div>

              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <h1 className="text-xl md:text-2xl font-semibold text-white/95 tracking-tight">
                  {isSignUp ? "Create your account" : "Welcome back"}
                </h1>
                <p className="text-sm text-white/40 mt-1.5">
                  {isSignUp ? "Start your StudyOS journey." : "Continue your study journey."}
                </p>
              </motion.div>

              {/* Error */}
              {displayError && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/15"
                >
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="text-sm text-red-300/80">{displayError}</span>
                </motion.div>
              )}

              {/* Success */}
              {authMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/15"
                >
                  <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-sm text-emerald-300/80">{authMessage}</span>
                </motion.div>
              )}

              {/* Auth Form */}
              <motion.form
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                onSubmit={handleEmailAuth}
                className="space-y-3.5"
              >
                {/* Username (signup only) */}
                {isSignUp && (
                  <div className="space-y-1.5 animate-fade-in">
                    <label className="text-xs text-white/50 font-medium">Unique Username</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                      <input
                        type="text"
                        placeholder="e.g. study_master42"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                        className="w-full h-10 pl-9 pr-3 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white/90 text-sm placeholder:text-white/20 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                        disabled={formLoading}
                        maxLength={20}
                      />
                    </div>
                    <p className="text-[10px] text-white/25">3–20 characters. Letters, numbers, and underscores only.</p>
                  </div>
                )}

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs text-white/50 font-medium">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-10 pl-9 pr-3 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white/90 text-sm placeholder:text-white/20 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                      disabled={formLoading}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-xs text-white/50 font-medium">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-10 pl-9 pr-9 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white/90 text-sm placeholder:text-white/20 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                      disabled={formLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={formLoading}
                  className={`w-full h-11 rounded-xl text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                    formLoading
                      ? "bg-white/[0.04] text-white/20 cursor-not-allowed"
                      : "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-[0_0_25px_rgba(99,102,241,0.2)] hover:shadow-[0_0_35px_rgba(99,102,241,0.3)] hover:from-indigo-400 hover:to-indigo-500 active:scale-[0.98]"
                  }`}
                >
                  {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {formLoading
                    ? isSignUp ? "Creating account..." : "Signing in..."
                    : isSignUp ? "Create Account" : "Sign In"}
                </button>

                {/* Toggle signup/login */}
                <p className="text-center text-xs text-white/30">
                  {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setAuthError(null);
                      setAuthMessage(null);
                    }}
                    className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                  >
                    {isSignUp ? "Sign in" : "Sign up"}
                  </button>
                </p>
              </motion.form>

              {/* Divider + Google */}
              {isConfigured && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                  className="space-y-3.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-[1px] bg-white/[0.06]" />
                    <span className="text-[10px] text-white/25 tracking-wider uppercase">or</span>
                    <div className="flex-1 h-[1px] bg-white/[0.06]" />
                  </div>

                  <button
                    onClick={handleGoogleSignIn}
                    disabled={signingIn}
                    className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/70 text-sm font-medium flex items-center justify-center gap-3 hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
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
                  </button>
                </motion.div>
              )}

              {/* Trust badges */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 1.0 }}
                className="pt-4 border-t border-white/[0.05]"
              >
                <div className="flex items-center justify-center gap-5">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3 h-3 text-emerald-500/60" />
                    <span className="text-[10px] text-white/25">Secure</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <LockIcon className="w-3 h-3 text-emerald-500/60" />
                    <span className="text-[10px] text-white/25">Private</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3 h-3 text-emerald-500/60" />
                    <span className="text-[10px] text-white/25">Built for students</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#050510]">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center animate-pulse">
            <div className="w-5 h-5 rounded-sm bg-indigo-400" />
          </div>
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
