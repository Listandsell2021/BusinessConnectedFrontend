import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useLanguage } from '../src/contexts/LanguageContext';
import { useTheme } from '../src/contexts/ThemeContext';
import ThemeToggle from '../src/components/ui/ThemeToggle';
import LanguageToggle from '../src/components/ui/LanguageToggle';

export default function Services() {
  const { t, isGerman } = useLanguage();
  const { mounted, isDark } = useTheme();

  const services = [
    {
      id: 'moving',
      title: isGerman ? 'Umzugsservice' : 'Moving Service',
      description: isGerman
        ? 'Professionelle Umzugsunternehmen für jeden Umzugswunsch'
        : 'Professional moving companies for every relocation need',
      icon: '🚛',
      gradient: 'from-blue-500 via-purple-500 to-pink-500',
      features: [
        isGerman ? 'Haushalts- und Geschäftsumzüge' : 'Residential and commercial moves',
        isGerman ? 'Fernumzüge deutschlandweit' : 'Long-distance moves nationwide',
        isGerman ? 'Spezialtransporte' : 'Special transports',
        isGerman ? 'Professionelle Verpackung' : 'Professional packing'
      ],
      href: '/forms/enhanced-moving',
      color: 'blue'
    }
  ];

  if (!mounted) {
    return null;
  }

  return (
    <>
      <Head>
        <title>{isGerman ? 'Umzugsservice - Angebot anfordern' : 'Moving Service - Request Quote'} - Umzug Anbieter Vergleich</title>
        <meta name="description" content={isGerman ? 'Fordern Sie kostenlose Angebote für Umzug an' : 'Request free quotes for moving services'} />
      </Head>

      <div 
        className="min-h-screen transition-all duration-500"
        style={{ 
          backgroundColor: 'var(--theme-bg)',
          color: 'var(--theme-text)'
        }}
      >
        {/* Animated Background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -inset-10 opacity-20">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
            <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
            <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-green-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
          </div>
        </div>

        {/* Header */}
        <header className="relative z-10 border-b backdrop-blur-lg" style={{ 
          borderColor: 'var(--theme-border)', 
          backgroundColor: 'rgba(var(--theme-card-bg-rgb), 0.8)' 
        }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              {/* Logo */}
              <motion.div
                className="flex items-center space-x-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Link href="/" className="hover:opacity-75 transition-opacity">
                  <Image src={isDark ? "/logo-dark.svg" : "/logo-light.svg"} alt="Umzug Anbieter Vergleich" width={180} height={50} priority />
                </Link>
              </motion.div>

              {/* Controls */}
              <motion.div 
                className="flex items-center space-x-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                {/* Business Login Button */}
                <Link
                  href="/partner-login"
                  className="hidden sm:inline-flex items-center px-4 py-2 rounded-full font-medium transition-all duration-300 hover:scale-105 border-2"
                  style={{
                    borderColor: 'var(--theme-border)',
                    color: 'var(--theme-text)',
                    backgroundColor: 'transparent'
                  }}
                >
                  🏢 {isGerman ? 'Partner Login' : 'Business Login'}
                </Link>
                
                <LanguageToggle />
                <ThemeToggle />
              </motion.div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Hero Section */}
          <motion.div 
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <motion.h1 
              className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <span className="block">
                {isGerman ? 'Wählen Sie Ihren' : 'Choose Your'}
              </span>
              <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                {isGerman ? 'Service' : 'Service'}
              </span>
            </motion.h1>
            
            <motion.p 
              className="text-xl sm:text-2xl mb-12 max-w-4xl mx-auto leading-relaxed"
              style={{ color: 'var(--theme-muted)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              {isGerman 
                ? 'Erhalten Sie kostenlose und unverbindliche Angebote von geprüften Fachunternehmen in Ihrer Nähe.'
                : 'Get free and non-binding quotes from verified professional companies in your area.'
              }
            </motion.p>

            {/* Stats */}
            <motion.div 
              className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              {[
                { number: '50K+', label: isGerman ? 'Zufriedene Kunden' : 'Happy Customers' },
                { number: '500+', label: isGerman ? 'Partner-Unternehmen' : 'Partner Companies' },
                { number: '4.8★', label: isGerman ? 'Durchschnittsbewertung' : 'Average Rating' },
                { number: '24h', label: isGerman ? 'Antwortzeit' : 'Response Time' }
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  className="text-center"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
                >
                  <div className="text-3xl font-bold mb-1" style={{ color: 'var(--theme-text)' }}>
                    {stat.number}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Service Cards */}
          <motion.div 
            className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            {services.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 + index * 0.2 }}
                whileHover={{ y: -8, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group relative"
              >
                <Link href={service.href} className="block">
                  <div className="relative overflow-hidden rounded-3xl p-8 h-full min-h-[500px] backdrop-blur-lg border-2 transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-blue-500/25"
                    style={{
                      backgroundColor: 'rgba(var(--theme-card-bg-rgb), 0.8)',
                      borderColor: 'var(--theme-border)'
                    }}
                  >
                    {/* Gradient Background */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${service.gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-500`}></div>
                    
                    {/* Floating Elements */}
                    <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                      <div className="text-8xl">{service.icon}</div>
                    </div>

                    {/* Content */}
                    <div className="relative z-10">
                      {/* Service Icon */}
                      <motion.div 
                        className="text-6xl mb-6"
                        whileHover={{ rotate: 10, scale: 1.1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        {service.icon}
                      </motion.div>

                      {/* Title */}
                      <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--theme-text)' }}>
                        {service.title}
                      </h2>

                      {/* Description */}
                      <p className="text-lg mb-8 leading-relaxed" style={{ color: 'var(--theme-muted)' }}>
                        {service.description}
                      </p>

                      {/* Features */}
                      <div className="space-y-3 mb-8">
                        {service.features.map((feature, featureIndex) => (
                          <motion.div
                            key={featureIndex}
                            className="flex items-center space-x-3"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.7 + featureIndex * 0.1 }}
                          >
                            <div className={`w-5 h-5 rounded-full bg-${service.color}-500 flex items-center justify-center`}>
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <span className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                              {feature}
                            </span>
                          </motion.div>
                        ))}
                      </div>

                      {/* CTA Button */}
                      <div className="flex items-center justify-between">
                        <motion.div
                          className="inline-flex items-center px-6 py-3 rounded-full font-semibold text-white transition-all duration-300 group-hover:scale-110"
                          style={{ backgroundColor: `var(--theme-button-bg)` }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <span>{isGerman ? 'Angebot anfordern' : 'Request Quote'}</span>
                          <motion.svg 
                            className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                            whileHover={{ x: 5 }}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </motion.svg>
                        </motion.div>

                        <motion.div
                          className="text-sm font-medium opacity-70 group-hover:opacity-100 transition-opacity duration-300"
                          style={{ color: 'var(--theme-text)' }}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 0.7, x: 0 }}
                          transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
                        >
                          {isGerman ? 'Kostenlos & Unverbindlich' : 'Free & Non-binding'}
                        </motion.div>
                      </div>
                    </div>

                    {/* Hover Glow Effect */}
                    <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                      style={{
                        background: `linear-gradient(135deg, transparent, rgba(59, 130, 246, 0.1), transparent)`,
                        filter: 'blur(1px)'
                      }}
                    ></div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>

          {/* Bottom CTA Section */}
          <motion.div 
            className="text-center mt-20 p-12 rounded-3xl"
            style={{ backgroundColor: 'var(--theme-bg-secondary)' }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <h3 className="text-3xl font-bold mb-4" style={{ color: 'var(--theme-text)' }}>
              {isGerman ? 'Noch Fragen?' : 'Questions?'}
            </h3>
            <p className="text-lg mb-8" style={{ color: 'var(--theme-muted)' }}>
              {isGerman 
                ? 'Unser Kundenservice hilft Ihnen gerne weiter.'
                : 'Our customer service team is happy to help.'
              }
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <a 
                href="tel:+49123456789" 
                className="inline-flex items-center px-6 py-3 rounded-full font-semibold transition-all duration-300 hover:scale-105"
                style={{
                  backgroundColor: 'var(--theme-button-bg)',
                  color: 'var(--theme-button-text)'
                }}
              >
                📞 +49 123 456 789
              </a>
              <a 
                href="mailto:info@leadform.com" 
                className="inline-flex items-center px-6 py-3 rounded-full font-semibold border-2 transition-all duration-300 hover:scale-105"
                style={{
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)'
                }}
              >
                ✉️ info@leadform.com
              </a>
            </div>

            {/* Business Partner Section */}
            <div className="border-t pt-8" style={{ borderColor: 'var(--theme-border)' }}>
              <h4 className="text-xl font-bold mb-4" style={{ color: 'var(--theme-text)' }}>
                {isGerman ? 'Sind Sie ein Dienstleister?' : 'Are you a service provider?'}
              </h4>
              <p className="text-base mb-6" style={{ color: 'var(--theme-muted)' }}>
                {isGerman 
                  ? 'Werden Sie unser Partner und erhalten Sie qualifizierte Kundenanfragen.'
                  : 'Become our partner and receive qualified customer inquiries.'
                }
              </p>
              <Link
                href="/partner-login"
                className="inline-flex items-center px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
                style={{
                  backgroundColor: 'var(--theme-button-bg)',
                  color: 'var(--theme-button-text)',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
                }}
              >
                🏢 {isGerman ? 'Partner-Bereich' : 'Partner Login'}
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="relative z-10 border-t mt-20 backdrop-blur-lg" style={{ 
          borderColor: 'var(--theme-border)',
          backgroundColor: 'rgba(var(--theme-card-bg-rgb), 0.8)'
        }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <p className="text-sm mb-4" style={{ color: 'var(--theme-muted)' }}>
                © 2024 Umzug Anbieter Vergleich. {isGerman ? 'Alle Rechte vorbehalten.' : 'All rights reserved.'}
              </p>
              <div className="flex items-center justify-center space-x-6 text-sm">
                <Link href="/privacy" className="hover:opacity-75 transition-opacity" style={{ color: 'var(--theme-muted)' }}>
                  {isGerman ? 'Datenschutz' : 'Privacy'}
                </Link>
                <Link href="/terms" className="hover:opacity-75 transition-opacity" style={{ color: 'var(--theme-muted)' }}>
                  {isGerman ? 'AGB' : 'Terms'}
                </Link>
                <Link href="/contact" className="hover:opacity-75 transition-opacity" style={{ color: 'var(--theme-muted)' }}>
                  {isGerman ? 'Kontakt' : 'Contact'}
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>

      <style jsx>{`
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </>
  );
}

// Force server-side rendering to avoid static generation issues
export async function getServerSideProps() {
  return {
    props: {}
  };
}