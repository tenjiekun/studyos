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
  signUpWithEmail: (email: string, password: string, name?: string, username?: string) => Promise<{ error?: string; message?: string }>;
  signOut: () => Promise<void>;
}  const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isConfigured: false,
  isBypass: false,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => ({}),
  signUpWithEmail: async () => ({}),
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isBypass, setIsBypass] = useState(false);

  useEffect(() => {
    // Clear any old bypass mode — force real login
    localStorage.removeItem(BYPASS_KEY);

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
          .select("id, username")
          .eq("id", session.user.id)
          .single();

        if (!profile) {
          const fullName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || "Student";
          const username = session.user.user_metadata?.username || null;
          await sb.from("profiles").insert({
            id: session.user.id,
            name: fullName,
            username: username,
          });
          await sb.from("user_settings").insert({ user_id: session.user.id });
        } else if (!profile.username && session.user.user_metadata?.username) {
          // Backfill username if it was provided during signup but profile already existed
          await sb.from("profiles")
            .update({ username: session.user.user_metadata.username })
            .eq("id", session.user.id);
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

  async function signUpWithEmail(email: string, password: string, name?: string, username?: string) {
    const sb = getSupabase();
    if (!sb) return { error: "Supabase not configured" };

    // Check username availability if provided
    if (username) {
      const trimmed = username.trim().toLowerCase();
      const { data: existing } = await sb
        .from("profiles")
        .select("id")
        .ilike("username", trimmed)
        .limit(1);
      if (existing && existing.length > 0) {
        return { error: "Username is already taken" };
      }
    }

    const { error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name || "Student", username: username || undefined },
      },
    });

    if (error) {
      return { error: error.message };
    }
    return { message: "Account created! Check your email for verification." };
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
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
