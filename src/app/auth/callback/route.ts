import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// Handles OAuth callback AND email verification callback
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/dashboard";

  const supabase = await createServerClient();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Handle email verification callback
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "signup" | "magiclink" | "recovery" | "email_change",
    });

    if (!error) {
      // Verification successful — redirect to success page
      return NextResponse.redirect(`${origin}/auth/verify?success=true`);
    }

    console.error("Email verification error:", error.message);

    // Check if already verified
    if (error.message.includes("already") || error.message.includes("expired")) {
      return NextResponse.redirect(`${origin}/auth/verify?status=already_verified`);
    }

    return NextResponse.redirect(`${origin}/auth/verify?status=error&message=${encodeURIComponent(error.message)}`);
  }

  // Handle OAuth code exchange
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("Auth callback error:", error.message);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
