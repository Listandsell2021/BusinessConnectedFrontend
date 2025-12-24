import React from 'react';
import { useLanguage } from '../src/contexts/LanguageContext';
import { useTheme } from '../src/contexts/ThemeContext';

function CustomError({ statusCode }) {
  const { isGerman } = useLanguage();
  const { isDark } = useTheme();

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--theme-bg)' }}
    >
      <div className="text-center">
        <div className="text-8xl font-bold mb-6" style={{ color: 'var(--theme-text)' }}>
          {statusCode || '500'}
        </div>

        <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--theme-text)' }}>
          {statusCode === 404
            ? isGerman
              ? 'Seite nicht gefunden'
              : 'Page Not Found'
            : isGerman
            ? 'Fehler'
            : 'Error'}
        </h1>

        <p className="text-lg" style={{ color: 'var(--theme-muted)' }}>
          {statusCode === 404
            ? isGerman
              ? 'Die gesuchte Seite existiert nicht.'
              : 'The page you are looking for does not exist.'
            : isGerman
            ? 'Ein Fehler ist aufgetreten.'
            : 'An error occurred.'}
        </p>
      </div>
    </div>
  );
}

export default CustomError;

// Force server-side rendering - avoid static generation of error pages
export async function getServerSideProps(context) {
  return {
    props: {
      statusCode: context.res?.statusCode || 500
    }
  };
}
