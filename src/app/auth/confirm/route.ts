import { NextResponse } from "next/server";
import { createClient } from "@/shared/auth/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as
    | "signup"
    | "email"
    | "recovery"
    | "invite"
    | null;

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    });

    if (!error) {
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/reset-password`);
      }
      // Confirmation réussie → login
      return NextResponse.redirect(
        `${origin}/login?confirmed=true`
      );
    }
    console.error("Auth confirm error:", error.message);
  }

  return NextResponse.redirect(
    `${origin}/login?error=confirmation_failed`
  );
}
