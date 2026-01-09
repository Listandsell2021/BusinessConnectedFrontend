import React from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useTheme } from '../src/contexts/ThemeContext';

export default function ThankYou() {
  const { mounted, isDark } = useTheme();

  if (!mounted) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Vielen Dank - Business Connected</title>
        <meta name="description" content="Ihre Anfrage wurde erfolgreich gesendet" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div
        className="min-h-screen transition-all duration-500 flex flex-col w-full"
        style={{
          backgroundColor: 'var(--theme-bg)',
          color: 'var(--theme-text)'
        }}
      >
        {/* Header */}
        <header className="border-b-2 w-full" style={{ borderColor: 'var(--theme-border)' }}>
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center sm:justify-start h-14 sm:h-16">
              {/* Logo */}
              <motion.div
                className="flex items-center"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Image
                  src="/business-connected-logo.svg"
                  alt="Business Connected"
                  width={140}
                  height={40}
                  priority
                  style={{ width: 'auto', height: 'auto' }}
                />
              </motion.div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 flex items-center justify-center">
          <motion.div
            className="text-center w-full max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            {/* Success Icon */}
            <motion.div
              className="mb-6 sm:mb-8"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.5, type: "spring", stiffness: 200 }}
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mb-4 sm:mb-6 shadow-lg">
                <motion.svg
                  className="w-10 h-10 sm:w-14 sm:h-14 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                >
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </motion.svg>
              </div>
            </motion.div>

            {/* Thank You Message */}
            <motion.h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              style={{ color: 'var(--theme-text)' }}
            >
              Vielen Dank!
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="space-y-4 sm:space-y-6"
            >
              <p className="text-lg sm:text-xl lg:text-2xl font-semibold" style={{ color: 'var(--theme-text)' }}>
                Ihre Anfrage wurde erfolgreich gesendet!
              </p>

              <div className="rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8" style={{ backgroundColor: 'var(--theme-bg-secondary)', border: '2px solid var(--theme-border)' }}>
                <p className="text-base sm:text-lg lg:text-lg leading-relaxed mb-4 sm:mb-6" style={{ color: 'var(--theme-text)' }}>
                  Wir haben Ihre Anfrage erhalten und werden Sie in Kürze kontaktieren. Unsere Partner-Unternehmen werden Ihnen kostenlose und unverbindliche Angebote zusenden.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.7 }}
                    className="p-4 sm:p-5 lg:p-6 rounded-lg" style={{ backgroundColor: 'var(--theme-bg)' }}
                  >
                    <div className="text-3xl sm:text-3xl lg:text-4xl mb-2 sm:mb-3">⚡</div>
                    <h3 className="font-bold mb-1 sm:mb-2 text-sm sm:text-base lg:text-lg" style={{ color: 'var(--theme-text)' }}>
                      Schnelle Antwort
                    </h3>
                    <p className="text-xs sm:text-sm" style={{ color: 'var(--theme-muted)' }}>
                      Innerhalb von 24 Stunden
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.8 }}
                    className="p-4 sm:p-5 lg:p-6 rounded-lg" style={{ backgroundColor: 'var(--theme-bg)' }}
                  >
                    <div className="text-3xl sm:text-3xl lg:text-4xl mb-2 sm:mb-3">💰</div>
                    <h3 className="font-bold mb-1 sm:mb-2 text-sm sm:text-base lg:text-lg" style={{ color: 'var(--theme-text)' }}>
                      Kostenlose Angebote
                    </h3>
                    <p className="text-xs sm:text-sm" style={{ color: 'var(--theme-muted)' }}>
                      Bis zu 5 Angebote
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.9 }}
                    className="p-4 sm:p-5 lg:p-6 rounded-lg" style={{ backgroundColor: 'var(--theme-bg)' }}
                  >
                    <div className="text-3xl sm:text-3xl lg:text-4xl mb-2 sm:mb-3">✅</div>
                    <h3 className="font-bold mb-1 sm:mb-2 text-sm sm:text-base lg:text-lg" style={{ color: 'var(--theme-text)' }}>
                      Geprüfte Partner
                    </h3>
                    <p className="text-xs sm:text-sm" style={{ color: 'var(--theme-muted)' }}>
                      Nur qualifiziert
                    </p>
                  </motion.div>
                </div>
              </div>

              {/* Contact Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.0 }}
                className="mt-6 sm:mt-8 p-4 sm:p-6 rounded-lg" style={{ backgroundColor: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border)' }}
              >
                <p className="font-semibold mb-2 text-sm sm:text-base" style={{ color: 'var(--theme-text)' }}>
                  Haben Sie Fragen?
                </p>
                <p className="text-xs sm:text-sm" style={{ color: 'var(--theme-muted)' }}>
                  Kontaktieren Sie uns unter: <br className="sm:hidden" /><span className="font-semibold" style={{ color: 'var(--theme-text)' }}>info@business-connected24.de</span>
                </p>
              </motion.div>

              {/* Submit Another Request Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.1 }}
                className="mt-8 sm:mt-10"
              >
                <Link
                  href="/Kunde"
                  className="inline-block px-8 py-3 sm:py-4 rounded-lg font-semibold text-base sm:text-lg transition-all duration-300 hover:opacity-90 hover:scale-105"
                  style={{
                    backgroundColor: 'var(--theme-button-bg)',
                    color: 'var(--theme-button-text)'
                  }}
                >
                  Weitere Anfrage stellen
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="border-t-2 w-full" style={{ borderColor: 'var(--theme-border)' }}>
          <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <div className="text-center">
              <p className="text-xs sm:text-sm" style={{ color: 'var(--theme-muted)' }}>
                © 2024 Business Connected. Alle Rechte vorbehalten.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

// Force server-side rendering to avoid NextRouter errors during static generation
export async function getServerSideProps() {
  return {
    props: {}
  };
}
