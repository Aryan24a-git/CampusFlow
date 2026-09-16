import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Role → default redirect after login
const ROLE_DASHBOARDS: Record<string, string> = {
  student: '/dashboard',
  faculty: '/dashboard',
  staff: '/queue',
  admin: '/admin/dashboard',
  grievance_authority: '/admin/dashboard',
};

// Routes accessible without login
const PUBLIC_ROUTES = ['/login', '/'];

export async function middleware(request: NextRequest) {
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

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  // Allow public routes
  if (PUBLIC_ROUTES.some(r => pathname === r || pathname.startsWith(r + '?'))) {
    // If logged in and hits /login → redirect to their dashboard
    if (user && pathname === '/login') {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      // Fallback to JWT metadata if DB query returns null (RLS or timing)
      const role = profile?.role ?? (user.user_metadata?.role as string) ?? 'student';
      const dest = ROLE_DASHBOARDS[role] ?? '/dashboard';
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return supabaseResponse;
  }

  // Not logged in → redirect to login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Role-based route protection — fallback to JWT metadata if DB returns null
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role ?? (user.user_metadata?.role as string) ?? 'student';

  // Staff can't access /admin routes
  if (pathname.startsWith('/admin') && !['admin', 'grievance_authority'].includes(role)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Non-staff can't access /queue
  if (pathname.startsWith('/queue') && !['staff', 'admin'].includes(role)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
