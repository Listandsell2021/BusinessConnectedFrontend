import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLanguage } from '../src/contexts/LanguageContext';
import { useTheme } from '../src/contexts/ThemeContext';

export default function Custom500() {
  const { isGerman } = useLanguage();
  const { isDark } = useTheme();

  return (
    <>
      <Head>
        <title>500 - {isGerman ? 'Interner Fehler' : 'Server Error'}</title>
      </Head>

      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: 'var(--theme-bg)' }}
      >
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="text-8xl font-bold mb-6"
            animate={{ shake: [0, -2, 2, -2, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
          >
            500
          </motion.div>

          <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--theme-text)' }}>
            {isGerman ? 'Interner Fehler' : 'Server Error'}
          </h1>

          <p className="text-lg mb-8" style={{ color: 'var(--theme-muted)' }}>
            {isGerman
              ? 'Entschuldigung, ein Fehler ist aufgetreten.'
              : 'Sorry, something went wrong on our end.'}
          </p>

          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 rounded-lg font-semibold text-white transition-all duration-300 hover:scale-105"
            style={{ backgroundColor: 'var(--theme-button-bg)' }}
          >
            {isGerman ? 'Zurück zur Startseite' : 'Back to Home'}
          </Link>
        </motion.div>
      </div>
    </>
  );
}
