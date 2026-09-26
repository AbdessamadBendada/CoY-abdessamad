import { NextResponse } from "next/server";
import { createClient } from "@/shared/auth/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/overview";

  const supabase = await createClient();

  // Cas 1 : PKCE flow (code d'autorisation)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("Auth callback error (code):", error.message);
    return NextResponse.redirect(
      `${origin}/login?error=callback_failed&message=${encodeURIComponent(error.message)}`
    );
  }

  // Cas 2 : Magic link / Email OTP (token_hash)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as "signup" | "email" | "recovery" | "invite",
    });
    if (!error) {
      // Si c'est un recovery, rediriger vers reset-password
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/reset-password`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("Auth callback error (token_hash):", error.message);
    return NextResponse.redirect(
      `${origin}/login?error=callback_failed&message=${encodeURIComponent(error.message)}`
    );
  }

  // Cas 3 : Aucun paramètre reconnu
  console.error("Auth callback: no code or token_hash provided", {
    searchParams: Object.fromEntries(searchParams.entries()),
  });
  return NextResponse.redirect(
    `${origin}/login?error=missing_params`
  );
}
