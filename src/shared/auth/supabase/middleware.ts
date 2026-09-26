import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes qui nécessitent une session active
const PROTECTED_ROUTES = [
  "/overview",
  "/customers",
  "/actions",
  "/integrations",
  "/settings",
  "/billing",
  "/support",
];

// Routes publiques (ne jamais rediriger)
const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/forgot-email",
  "/reset-password",
  "/auth/callback",
  "/auth/confirm",
];

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ne JAMAIS intercepter le callback auth
  if (pathname.startsWith("/auth/")) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Si l'utilisateur est connecté et va sur une page auth → rediriger vers overview
  if (user && PUBLIC_ROUTES.some((route) => pathname === route)) {
    const url = request.nextUrl.clone();
    url.pathname = "/overview";
    return NextResponse.redirect(url);
  }

  // Si l'utilisateur n'est PAS connecté et va sur une route protégée → rediriger vers login
  if (!user && PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
