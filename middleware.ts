import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // Skip middleware if Supabase env vars are not configured
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const isLoginPage = request.nextUrl.pathname === "/login"
  const isPublicPage =
    request.nextUrl.pathname === "/" ||
    request.nextUrl.pathname.startsWith("/api/") ||
    request.nextUrl.pathname.startsWith("/callback")

  // Refresh session with timeout to prevent middleware from hanging
  let user = null
  try {
    const userPromise = supabase.auth.getUser()
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Supabase auth timeout")), 5000)
    )
    const { data } = (await Promise.race([userPromise, timeoutPromise])) as Awaited<
      ReturnType<typeof supabase.auth.getUser>
    >
    user = data.user
  } catch {
    // On timeout or error, allow public pages and login, redirect others to login
    if (!isLoginPage && !isPublicPage) {
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // Not authenticated and trying to access protected route
  if (!user && !isLoginPage && !isPublicPage) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  // Authenticated user on login page
  if (user && isLoginPage) {
    // If signout=1 flag is set, the user has no profile in the users table.
    // Sign them out here (middleware CAN write cookies) and let them see the login page.
    if (request.nextUrl.searchParams.get("signout") === "1") {
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.searchParams.delete("signout")
      url.pathname = "/login"
      // Return supabaseResponse so the signOut cookies are applied
      return supabaseResponse
    }
    // Normal case: redirect authenticated users to dashboard
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
