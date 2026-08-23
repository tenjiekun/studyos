"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { User, Session } from "@supabase/supabase-js";

const BYPASS_KEY = "study-os-bypass";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  isBypass: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<{ error?: string; message?: string }>;
  bypassLogin: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isConfigured: false,
  isBypass: false,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => ({}),
  signUpWithEmail: async () => ({}),
  bypassLogin: () => {},
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

/** Create a fake User-like object for bypass mode */
function createBypassUser(): User {
  return {
    id: "bypass-user",
    app_metadata: {},
    user_metadata: { name: "Local User" },
    aud: "authenticated",
    email: "local@bypass.dev",
    created_at: new Date().toISOString(),
  } as User;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isBypass, setIsBypass] = useState(false);

  useEffect(() => {
    // Check for bypass mode first
    const bypassActive = localStorage.getItem(BYPASS_KEY) === "true";
    if (bypassActive) {
      setUser(createBypassUser());
      setIsBypass(true);
      setLoading(false);
      return;
    }

    const sb = getSupabase();
    if (!sb) {
      setLoading(false);
      return;
    }
    setIsConfigured(true);

    // Get initial session
    sb.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes (fires after OAuth redirect too)
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      // Auto-create profile + settings if missing
      if (session?.user) {
        const { data: profile } = await sb
          .from("profiles")
          .select("id")
          .eq("id", session.user.id)
          .single();

        if (!profile) {
          await sb.from("profiles").insert({
            id: session.user.id,
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || "Student",
          });
          await sb.from("user_settings").insert({ user_id: session.user.id });
        }
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signInWithGoogle() {
    const sb = getSupabase();
    if (!sb) return;

    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error("Google sign-in error:", error.message);
      throw error;
    }
  }

  async function signInWithEmail(email: string, password: string) {
    const sb = getSupabase();
    if (!sb) return { error: "Supabase not configured" };

    const { error } = await sb.auth.signInWithPassword({ email, password });

    if (error) {
      return { error: error.message };
    }
    return {};
  }

  async function signUpWithEmail(email: string, password: string, name?: string) {
    const sb = getSupabase();
    if (!sb) return { error: "Supabase not configured" };

    const { error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name || "Student" },
      },
    });

    if (error) {
      return { error: error.message };
    }
    return { message: "Account created! Check your email for verification." };
  }

  function bypassLogin() {
    localStorage.setItem(BYPASS_KEY, "true");
    setUser(createBypassUser());
    setIsBypass(true);
  }

  async function signOut() {
    try {
      localStorage.removeItem(BYPASS_KEY);
      try {
        const sb = getSupabase();
        if (sb) await sb.auth.signOut();
      } catch (e) { /* ignore */ }
      localStorage.removeItem("study-os-data");
      localStorage.removeItem("study-os-community");
      localStorage.removeItem("study-os-timer");
      setUser(null);
      setSession(null);
      setIsBypass(false);
      window.location.href = "/login";
    } catch (err) {
      window.location.href = "/login";
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured,
        isBypass,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        bypassLogin,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
