import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { routing } from '@/lib/i18n/routing';

const intl = createIntlMiddleware(routing);

const PUBLIC_ADMIN_PATHS = /^\/(ar|fr)\/admin\/(login|forgot|reset)(\/|$)/;

// The one public address (DECISIONS.md → Domain). www.borj.tn and the old workers.dev address
// redirect here; API routes are not matched, so callbacks and trackers keep working on any host.
const CANONICAL_HOST = 'borj.tn';
const OLD_HOSTS = new Set(['www.borj.tn', 'www.elborj.workers.dev']);

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const host = request.headers.get('host')?.toLowerCase();
  if (host && OLD_HOSTS.has(host)) {
    const url = new URL(`${pathname}${request.nextUrl.search}`, `https://${CANONICAL_HOST}`);
    return NextResponse.redirect(url, 301);
  }

  // The newspaper is Arabic only and the admin French only (DECISIONS.md → Languages).
  if (pathname === '/') return NextResponse.redirect(new URL('/ar', request.url), 307);
  if (/^\/ar\/admin(\/|$)/.test(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/ar/, '/fr');
    return NextResponse.redirect(url, 308);
  }
  if (/^\/fr(\/|$)/.test(pathname) && !/^\/fr\/admin(\/|$)/.test(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/fr/, '/ar');
    return NextResponse.redirect(url, 308);
  }

  // No trailing slashes (SEO doc).
  if (pathname.length > 1 && pathname.endsWith('/')) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/\/+$/, '');
    return NextResponse.redirect(url, 308);
  }

  // ?page=N on listings → internal /page/N rewrite, so listing pages stay statically
  // cached (reading searchParams would render them on every request).
  const page = request.nextUrl.searchParams.get('page');
  if (page && /^\/(ar|fr)\/(section\/[a-z0-9-]+|latest|author\/[a-z0-9-]+|topic\/[a-z0-9-]+|format\/[a-z0-9-]+)$/.test(pathname)) {
    const n = Number(page);
    const url = request.nextUrl.clone();
    url.searchParams.delete('page');
    if (!Number.isInteger(n) || n < 2 || n > 9999) return NextResponse.redirect(url, 308);
    url.pathname = `${pathname}/page/${n}`;
    return NextResponse.rewrite(url);
  }

  const isAdmin = /^\/(ar|fr)\/admin(\/|$)/.test(pathname);
  if (!isAdmin) return intl(request);

  // Admin: refresh the Supabase session cookie and require a logged-in user.
  // Role checks happen again in every server action and RLS policy.
  let response = intl(request);
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = intl(request);
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');

  if (!data.user && !PUBLIC_ADMIN_PATHS.test(pathname)) {
    const locale = pathname.split('/')[1] ?? 'ar';
    const url = new URL(`/${locale}/admin/login`, request.url);
    if (pathname !== `/${locale}/admin`) url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  // Everything except API routes, Next internals, files with an extension and feeds.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
