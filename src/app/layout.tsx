import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-provider";
import { AuthenticatedLayout } from "@/components/authenticated-layout";
import { ProProvider } from "@/lib/payments/pro-context";
import { Toaster } from "sonner";
import { ServiceWorkerRegister } from "@/components/service-worker-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#6366f1" },
    { media: "(prefers-color-scheme: dark)", color: "#6366f1" },
  ],
};

export const metadata: Metadata = {
  title: "StudyOS",
  description: "Your personal study command center",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "StudyOS",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen font-sans antialiased bg-background text-foreground`}
      >
        <ThemeProvider>
          <AuthProvider>
            <ProProvider>
              <TooltipProvider>
                <AuthenticatedLayout>{children}</AuthenticatedLayout>
              </TooltipProvider>
                <Toaster richColors position="bottom-right" />
              <ServiceWorkerRegister />
            </ProProvider>
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
