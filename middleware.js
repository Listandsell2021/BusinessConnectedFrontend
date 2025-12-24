import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['en', 'de'],
  defaultLocale: 'de',
  localePrefix: 'as-needed' // /de/page or /page (for default locale)
});

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
