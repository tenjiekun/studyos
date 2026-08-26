"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { UsernameOnboarding } from "@/components/username-onboarding";
import { NotificationBell } from "@/components/notification-bell";
import { Flame } from "lucide-react";

const PUBLIC_ROUTES = ["/login", "/", "/dashboard"];

export function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isConfigured } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublic = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    if (!loading && isConfigured && !user && !isPublic) {
      router.push("/login");
    }
  }, [user, loading, isConfigured, router, isPublic]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Flame className="w-7 h-7 text-primary animate-pulse-soft" />
          <p className="text-[13px] text-muted-foreground font-medium">Loading StudyOS…</p>
        </div>
      </div>
    );
  }

  if (isPublic && isConfigured) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 min-h-screen pb-16 md:pb-0 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex items-center justify-end px-5 md:px-8 h-12 border-b border-border/40 bg-background/70 backdrop-blur-xl">
          <NotificationBell />
        </header>
        <main className="flex-1">
          {children}
        </main>
      </div>
      <UsernameOnboarding />
    </div>
  );
}
