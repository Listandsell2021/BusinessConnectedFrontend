import React, { useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';
import { useLanguage } from '../src/contexts/LanguageContext';
import { useTheme } from '../src/contexts/ThemeContext';
import ThemeToggle from '../src/components/ui/ThemeToggle';
import LanguageToggle from '../src/components/ui/LanguageToggle';

export default function ThankYou() {
  const router = useRouter();
  const { service } = router.query;
  const { t, isGerman } = useLanguage();
  const { mounted, isDark } = useTheme();

  const getServiceName = () => {
    // Only moving service supported
    return isGerman ? 'Umzugsservice' : 'Moving Service';
  };

  if (!mounted) {
    return null;
  }

  return (
    <>
      <Head>
        <title>{isGerman ? 'Vielen Dank' : 'Thank You'} - Umzug Anbieter Vergleich</title>
        <meta name="description" content={isGerman ? 'Ihre Anfrage wurde erfolgreich gesendet' : 'Your request has been sent successfully'} />
      </Head>

      <div 
        className="min-h-screen transition-all duration-500"
        style={{ 
          backgroundColor: 'var(--theme-bg)',
          color: 'var(--theme-text)'
        }}
      >
        {/* Header */}
        <header className="border-b-2" style={{ borderColor: 'var(--theme-border)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <motion.div
                className="flex items-center space-x-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Link href="/" className="hover:opacity-75 transition-opacity">
                  <Image src={isDark ? "/logo-dark.svg" : "/logo-light.svg"} alt="Umzug Anbieter Vergleich" width={160} height={45} priority />
                </Link>
              </motion.div>

              {/* Controls */}
              <motion.div 
                className="flex items-center space-x-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <LanguageToggle />
                <ThemeToggle />
              </motion.div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            {/* Success Icon */}
            <motion.div 
              className="mb-8"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.5, type: "spring", stiffness: 200 }}
            >
              <div className="w-24 h-24 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-6">
                <motion.svg 
                  className="w-12 h-12 text-green-600"
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                >
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </motion.svg>
              </div>
            </motion.div>

            {/* Thank You Message */}
            <motion.h1 
              className="text-4xl sm:text-5xl font-bold mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              {isGerman ? 'Vielen Dank!' : 'Thank You!'}
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="space-y-4 mb-8"
            >
              <p className="text-xl mb-4">
                {isGerman 
                  ? `Ihre Anfrage für ${getServiceName()} wurde erfolgreich gesendet!`
                  : `Your request for ${getServiceName()} has been sent successfully!`
                }
              </p>

              <div className="max-w-2xl mx-auto" style={{ color: 'var(--theme-muted)' }}>
                <p className="mb-4">
                  {isGerman
                    ? 'Wir haben Ihre Anfrage erhalten und werden Sie in Kürze kontaktieren. Unsere Partner-Unternehmen werden Ihnen kostenlose und unverbindliche Angebote zusenden.'
                    : 'We have received your request and will contact you shortly. Our partner companies will send you free and non-binding offers.'
                  }
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.8 }}
                    className="text-center"
                  >
                    <div className="text-3xl mb-2">⏱️</div>
                    <h3 className="font-semibold mb-2" style={{ color: 'var(--theme-text)' }}>
                      {isGerman ? 'Schnelle Antwort' : 'Quick Response'}
                    </h3>
                    <p className="text-sm">
                      {isGerman 
                        ? 'Antwort innerhalb von 24 Stunden'
                        : 'Response within 24 hours'
                      }
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.9 }}
                    className="text-center"
                  >
                    <div className="text-3xl mb-2">💰</div>
                    <h3 className="font-semibold mb-2" style={{ color: 'var(--theme-text)' }}>
                      {isGerman ? 'Kostenlose Angebote' : 'Free Quotes'}
                    </h3>
                    <p className="text-sm">
                      {isGerman 
                        ? 'Bis zu 5 kostenlose Angebote'
                        : 'Up to 5 free quotes'
                      }
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 1.0 }}
                    className="text-center"
                  >
                    <div className="text-3xl mb-2">✅</div>
                    <h3 className="font-semibold mb-2" style={{ color: 'var(--theme-text)' }}>
                      {isGerman ? 'Geprüfte Partner' : 'Verified Partners'}
                    </h3>
                    <p className="text-sm">
                      {isGerman 
                        ? 'Nur qualifizierte Anbieter'
                        : 'Only qualified providers'
                      }
                    </p>
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div 
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <Link 
                href="/" 
                className="px-8 py-3 rounded-lg font-medium transition-all duration-200 hover:opacity-90 hover:scale-105"
                style={{
                  backgroundColor: 'var(--theme-button-bg)',
                  color: 'var(--theme-button-text)'
                }}
              >
                {isGerman ? 'Zur Startseite' : 'Back to Home'}
              </Link>

              <Link 
                href="/services" 
                className="px-8 py-3 rounded-lg font-medium transition-all duration-200 hover:opacity-80 hover:scale-105"
                style={{
                  backgroundColor: 'var(--theme-bg-secondary)',
                  color: 'var(--theme-text)',
                  border: '2px solid var(--theme-border)'
                }}
              >
                {isGerman ? 'Weitere Anfrage stellen' : 'Submit Another Request'}
              </Link>
            </motion.div>
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="border-t-2 mt-16" style={{ borderColor: 'var(--theme-border)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="text-center">
              <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                © 2024 Umzug Anbieter Vergleich. {isGerman ? 'Alle Rechte vorbehalten.' : 'All rights reserved.'}
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