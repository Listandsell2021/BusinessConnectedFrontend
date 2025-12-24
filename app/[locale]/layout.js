import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

export default async function LocaleLayout({ children, params }) {
  const messages = await getMessages();
  const locale = params.locale;

  // Update the html lang attribute
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale;
  }

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      {children}
    </NextIntlClientProvider>
  );
}

export function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'de' }];
}
