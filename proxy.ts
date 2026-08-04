import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session (important: always call getUser, not getSession)
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect unauthenticated users to login (except for auth routes)
  const isAuthRoute =
    request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/cadastro')
  // /conta-excluida is reached right after account deletion signs the session out, so it must
  // stay reachable without a session — same reason it lives outside the (app) route group.
  const isPublicRoute = request.nextUrl.pathname === '/' || request.nextUrl.pathname === '/conta-excluida'

  if (!user && !isAuthRoute && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from login
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/home'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // robots.txt must stay reachable without a session — a crawler never authenticates, so
    // without this exclusion the auth redirect below sends it to /login instead of the actual
    // `Disallow: /` rules (see CLAUDE.md "SEO — indexação bloqueada temporariamente"), silently
    // defeating the block instead of enforcing it.
    '/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json|robots.txt|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
