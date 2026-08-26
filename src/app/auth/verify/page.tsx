"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, AlertCircle, Mail, ArrowRight, RefreshCw } from "lucide-react";
import Link from "next/link";

function VerifyPageInner() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success") === "true";
  const status = searchParams.get("status");
  const message = searchParams.get("message");
  const [countdown, setCountdown] = useState(3);

  const isError = status === "error";
  const isAlreadyVerified = status === "already_verified";
  const showSuccess = success || isAlreadyVerified;

  // Auto-redirect countdown for success states
  useEffect(() => {
    if (!showSuccess) return;
    if (countdown <= 0) {
      window.location.href = "/dashboard";
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, showSuccess]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050510] p-6">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        {/* Glassmorphic panel */}
        <div className="relative rounded-2xl border border-white/[0.08] bg-[#0c0e1a]/80 backdrop-blur-2xl shadow-[0_0_60px_rgba(99,102,241,0.08)] overflow-hidden">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/[0.06] via-transparent to-purple-500/[0.04] pointer-events-none" />

          <div className="relative p-8 md:p-10 text-center space-y-6">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto"
            >
              {showSuccess ? (
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/20 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
              )}
            </motion.div>

            {/* Heading */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              {showSuccess ? (
                <>
                  <h1 className="text-2xl font-semibold text-white/95 tracking-tight">
                    {isAlreadyVerified ? "Already Verified" : "Email Verified"}
                  </h1>
                  <p className="text-sm text-white/40 mt-2">
                    {isAlreadyVerified
                      ? "Your StudyOS email is already verified."
                      : "Your StudyOS account has been successfully verified."}
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-semibold text-white/95 tracking-tight">
                    Verification Failed
                  </h1>
                  <p className="text-sm text-white/40 mt-2">
                    {message
                      ? "This verification link is no longer valid."
                      : "Something went wrong. Please try again."}
                  </p>
                </>
              )}
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="space-y-3 pt-2"
            >
              {showSuccess ? (
                <>
                  <Link
                    href="/dashboard"
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-sm font-medium flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(99,102,241,0.2)] hover:shadow-[0_0_35px_rgba(99,102,241,0.3)] hover:from-indigo-400 hover:to-indigo-500 transition-all duration-300 active:scale-[0.98]"
                  >
                    Continue to StudyOS
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <p className="text-[10px] text-white/25">
                    Redirecting in {countdown}s…
                  </p>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-sm font-medium flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(99,102,241,0.2)] hover:shadow-[0_0_35px_rgba(99,102,241,0.3)] hover:from-indigo-400 hover:to-indigo-500 transition-all duration-300 active:scale-[0.98]"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Back to Sign In
                  </Link>
                  <Link
                    href="/login"
                    className="w-full h-10 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/60 text-sm font-medium flex items-center justify-center gap-2 hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-200"
                  >
                    <Mail className="w-4 h-4" />
                    Resend Verification Email
                  </Link>
                </>
              )}
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function VerifyPage() {
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
      <VerifyPageInner />
    </Suspense>
  );
}
