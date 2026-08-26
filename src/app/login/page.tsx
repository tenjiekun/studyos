"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense, useCallback } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle, Loader2, Mail, Lock, Eye, EyeOff, User,
  Shield, Lock as LockIcon, Users, ArrowLeft, RefreshCw, CheckCircle,
} from "lucide-react";
import { LoginScene3D } from "@/components/login/LoginScene3D";
import { getSupabase } from "@/lib/supabase/client";

function LoginPageInner() {
  const { user, loading, signInWithEmail, signUpWithEmail } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Verification states
  const [showVerification, setShowVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleEmailAuth = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setAuthError(null);

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
      } else {
        setVerificationEmail(email);
        setShowVerification(true);
      }
    } else {
      const result = await signInWithEmail(email, password);
      if (result.error) {
        // Check if it's an email-not-confirmed error
        if (result.error.includes("Email not confirmed") || result.error.includes("email_not_confirmed")) {
          setVerificationEmail(email);
          setShowVerification(true);
        } else {
          setAuthError(result.error);
        }
      }
    }
    setFormLoading(false);
  }, [email, password, isSignUp, username, signInWithEmail, signUpWithEmail]);

  const handleResendVerification = useCallback(async () => {
    if (resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    setResendSuccess(false);
    try {
      const sb = getSupabase();
      if (sb && verificationEmail) {
        await sb.auth.resend({ type: "signup", email: verificationEmail });
        setResendSuccess(true);
        setResendCooldown(30);
      }
    } catch {
      // Silently handle
    }
    setResendLoading(false);
  }, [verificationEmail, resendCooldown, resendLoading]);

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
        <div className="absolute inset-0">
          <LoginScene3D />
        </div>

        {/* Branding overlay */}
        <div className="relative z-10 h-full flex flex-col justify-between p-6 md:p-10 lg:p-14 pointer-events-none">
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

          <div className="flex-1 flex flex-col justify-center max-w-lg">
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-[11px] text-indigo-400/60 tracking-[0.25em] uppercase mb-3"
            >
              {showVerification ? "Verification" : "Welcome back"}
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
          <div className="relative rounded-2xl border border-white/[0.08] bg-[#0c0e1a]/80 backdrop-blur-2xl shadow-[0_0_60px_rgba(99,102,241,0.08)] overflow-hidden">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/[0.06] via-transparent to-purple-500/[0.04] pointer-events-none" />

            <div className="relative p-7 md:p-8 space-y-6">
              {/* ============================================ */}
              {/* VERIFICATION SCREEN — after signup or unverified login */}
              {/* ============================================ */}
              {showVerification ? (
                <VerificationPanel
                  email={verificationEmail}
                  resendLoading={resendLoading}
                  resendCooldown={resendCooldown}
                  resendSuccess={resendSuccess}
                  onResend={handleResendVerification}
                  onBack={() => {
                    setShowVerification(false);
                    setResendSuccess(false);
                    setResendCooldown(0);
                  }}
                />
              ) : (
                <>
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

                  {/* Auth Form */}
                  <motion.form
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.7 }}
                    onSubmit={handleEmailAuth}
                    className="space-y-3.5"
                  >
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

                    <p className="text-center text-xs text-white/30">
                      {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setIsSignUp(!isSignUp);
                          setAuthError(null);
                        }}
                        className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                      >
                        {isSignUp ? "Sign in" : "Sign up"}
                      </button>
                    </p>
                  </motion.form>

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
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ============================================
   VERIFICATION PANEL — "Check your email" screen
   ============================================ */
function VerificationPanel({
  email,
  resendLoading,
  resendCooldown,
  resendSuccess,
  onResend,
  onBack,
}: {
  email: string;
  resendLoading: boolean;
  resendCooldown: number;
  resendSuccess: boolean;
  onResend: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6 text-center">
      {/* Mail icon with pulse */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1, type: "spring", stiffness: 200 }}
        className="mx-auto"
      >
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center mx-auto relative">
          <Mail className="w-7 h-7 text-indigo-400" />
          <div className="absolute inset-0 rounded-2xl bg-indigo-500/10 animate-ping" />
        </div>
      </motion.div>

      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h2 className="text-xl md:text-2xl font-semibold text-white/95 tracking-tight">
          Check your email
        </h2>
        <p className="text-sm text-white/40 mt-2 leading-relaxed">
          We&apos;ve sent a verification link to:
        </p>
        <p className="text-sm text-indigo-300/80 font-medium mt-1.5 break-all">
          {email}
        </p>
      </motion.div>

      {/* Instructions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="space-y-4"
      >
        <p className="text-xs text-white/30 leading-relaxed">
          Click the link in the email to verify your StudyOS account.
          <br />
          You&apos;ll be able to sign in after verification.
        </p>

        {/* Resend success message */}
        {resendSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/15"
          >
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-sm text-emerald-300/80">Verification email sent! Check your inbox.</span>
          </motion.div>
        )}

        {/* Resend button */}
        <button
          onClick={onResend}
          disabled={resendCooldown > 0 || resendLoading}
          className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/60 text-sm font-medium flex items-center justify-center gap-2 hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {resendLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {resendCooldown > 0
            ? `Resend available in ${resendCooldown}s`
            : "Resend verification email"}
        </button>

        {/* Back to sign in */}
        <button
          onClick={onBack}
          className="w-full h-10 rounded-xl text-white/40 text-sm flex items-center justify-center gap-2 hover:text-white/60 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </button>
      </motion.div>
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
