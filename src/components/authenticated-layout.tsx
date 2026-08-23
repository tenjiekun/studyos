"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { Flame } from "lucide-react";

const PUBLIC_ROUTES = ["/login"];

export function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isConfigured } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublic = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    // Only redirect to login if Supabase is configured and user isn't logged in
    if (!loading && isConfigured && !user && !isPublic) {
      router.push("/login");
    }
  }, [user, loading, isConfigured, router, isPublic]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Flame className="w-8 h-8 text-primary animate-pulse-soft" />
          <p className="text-sm text-muted-foreground">Loading StudyOS...</p>
        </div>
      </div>
    );
  }

  // Public routes (login) — only show when Supabase is configured
  if (isPublic && isConfigured) {
    return <>{children}</>;
  }

  // Not configured (local mode) or authenticated — show sidebar + content
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );
}
