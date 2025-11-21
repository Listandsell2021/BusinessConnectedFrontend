import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import ThemeToggle from '../../src/components/ui/ThemeToggle';
import LanguageToggle from '../../src/components/ui/LanguageToggle';
import Logo from '../../src/components/ui/Logo';

export default function Login() {
  const router = useRouter();
  const { login, isAuthenticated, loading } = useAuth();
  const { t, isGerman } = useLanguage();
  const { mounted, isDark } = useTheme();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const redirectAfterLogin = useRef(false);

useEffect(() => {
  if (!loading && isAuthenticated()) {
    router.replace('/dashboard');
  }
}, [loading, isAuthenticated, router]);

// Update error messages when language changes
useEffect(() => {
  if (Object.keys(errors).length > 0) {
    const newErrors = {};

    // Re-validate form field errors
    if (!formData.email) {
      newErrors.email = isGerman ? 'E-Mail ist erforderlich' : 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = isGerman ? 'E-Mail ist ungültig' : 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = isGerman ? 'Passwort ist erforderlich' : 'Password is required';
    }

    // Translate general error message
    if (errors.general) {
      const generalError = errors.general;

      if (isGerman) {
        // Translate to German
        if (generalError.toLowerCase().includes('invalid') || generalError === 'Invalid credentials' || generalError === 'Invalid admin credentials') {
          newErrors.general = 'Ungültige Admin-Anmeldedaten';
        } else if (generalError === 'Validation error' || generalError.toLowerCase().includes('validation error')) {
          newErrors.general = 'Validierungsfehler';
        } else if (generalError.toLowerCase().includes('access denied') || generalError.toLowerCase().includes('admin privileges')) {
          newErrors.general = 'Zugriff verweigert. Admin-Berechtigungen erforderlich.';
        } else if (generalError.toLowerCase().includes('login failed') || generalError.toLowerCase().includes('authentication failed')) {
          newErrors.general = 'Anmeldung fehlgeschlagen';
        } else if (generalError.toLowerCase().includes('unexpected error')) {
          newErrors.general = 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
        } else {
          newErrors.general = 'Ungültige Admin-Anmeldedaten';
        }
      } else {
        // Translate to English
        if (generalError.includes('Ungültige Anmeldedaten') || generalError.includes('Ungültige Admin-Anmeldedaten')) {
          newErrors.general = 'Invalid admin credentials';
        } else if (generalError.includes('Validierungsfehler')) {
          newErrors.general = 'Validation error';
        } else if (generalError.includes('Zugriff verweigert') || generalError.includes('Admin-Berechtigungen')) {
          newErrors.general = 'Access denied. Admin privileges required.';
        } else if (generalError.includes('Anmeldung fehlgeschlagen')) {
          newErrors.general = 'Login failed';
        } else if (generalError.includes('unerwarteter Fehler')) {
          newErrors.general = 'An unexpected error occurred. Please try again.';
        } else {
          newErrors.general = 'Invalid admin credentials';
        }
      }
    }

    // Update errors
    const updatedErrors = {};
    Object.keys(errors).forEach(key => {
      if (newErrors[key]) {
        updatedErrors[key] = newErrors[key];
      }
    });

    if (Object.keys(updatedErrors).length > 0) {
      setErrors(updatedErrors);
    }
  }
}, [isGerman, formData.email, formData.password, errors]);

  // // Additional useEffect to handle post-login redirect
  // useEffect(() => {
  //   if (redirectAfterLogin.current && !loading && isAuthenticated()) {
  //     redirectAfterLogin.current = false;
  //     router.push('/dashboard');
  //   }
  // }, [loading, isAuthenticated, router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = t('auth.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('auth.emailInvalid');
    }

    if (!formData.password) {
      newErrors.password = t('auth.passwordRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

const handleSubmit = async (e) => {
  e.preventDefault();

  if (!validateForm()) return;

  setIsSubmitting(true);

  try {
    // Pass isAdminLogin=true as the 4th parameter to ensure only admins can log in
    const result = await login(formData.email, formData.password, null, true);

    if (result && result.success) {
      // ✅ Save immediately
      if (result.token) {
        localStorage.setItem("token", result.token);
      }
      if (result.user) {
        localStorage.setItem("user", JSON.stringify(result.user));
      }

      // ✅ update global auth state (if your login doesn’t already do this)
      // example: dispatch or context update
      // setAuthState({ user: result.user, token: result.token });

      // ✅ Immediate redirect
      router.reload()
      router.replace("/dashboard");
    } else {
      // Use backend error message with language support
      let errorMessage = result?.error || result?.message;

      // Check if backend provided German translation
      if (result?.messageDE && isGerman) {
        errorMessage = result.messageDE;
      }

      // Translate common error messages
      if (isGerman) {
        if (!errorMessage || errorMessage === 'Login failed' || errorMessage === 'Authentication failed') {
          errorMessage = 'Anmeldung fehlgeschlagen';
        } else if (errorMessage === 'Invalid credentials' || errorMessage === 'Invalid admin credentials') {
          errorMessage = 'Ungültige Admin-Anmeldedaten';
        } else if (errorMessage === 'Validation error') {
          errorMessage = 'Validierungsfehler';
        } else if (errorMessage.includes('Access denied') || errorMessage.includes('Admin privileges required')) {
          errorMessage = 'Zugriff verweigert. Admin-Berechtigungen erforderlich.';
        } else if (errorMessage.includes('Invalid credentials')) {
          errorMessage = errorMessage.replace('Invalid credentials', 'Ungültige Anmeldedaten');
        } else if (errorMessage.includes('Validation error')) {
          errorMessage = errorMessage.replace('Validation error', 'Validierungsfehler');
        } else if (errorMessage.includes('Login failed')) {
          errorMessage = 'Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.';
        }
      } else if (!errorMessage) {
        errorMessage = 'Login failed. Please try again.';
      }

      setErrors({ general: errorMessage });
    }
  } catch (error) {
    const errorMessage = isGerman
      ? 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.'
      : 'An unexpected error occurred. Please try again.';
    setErrors({ general: errorMessage });
  } finally {
    setIsSubmitting(false);
  }
};


  if (!mounted) {
    return null;
  }

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--theme-bg)' }}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--theme-text)' }}></div>
      </div>
    );
  }

  if (isAuthenticated()) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--theme-bg)' }}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--theme-text)' }}></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{t('auth.login')} - Umzug Anbieter Vergleich</title>
        <meta name="description" content={t('auth.loginDescription')} />
      </Head>

      <div 
        className="min-h-screen flex relative overflow-hidden"
        style={{ 
          backgroundColor: 'var(--theme-bg)', 
          color: 'var(--theme-text)',
          backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(99, 102, 241, 0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(236, 72, 153, 0.1) 0%, transparent 50%)'
        }}
      >
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full opacity-20 blur-3xl"
            animate={{
              x: [0, 50, 0],
              y: [0, -30, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute bottom-20 right-20 w-48 h-48 bg-gradient-to-r from-pink-400 to-red-500 rounded-full opacity-20 blur-3xl"
            animate={{
              x: [0, -40, 0],
              y: [0, 20, 0],
              scale: [1, 0.8, 1],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute top-1/2 left-1/3 w-20 h-20 bg-gradient-to-r from-green-400 to-cyan-500 rounded-full opacity-30 blur-2xl"
            animate={{
              rotate: [0, 360],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        </div>

        {/* Left Side - Form */}
        <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 relative z-10">
          <div className="mx-auto w-full max-w-md lg:w-[420px]">
            {/* Header Controls */}
            <motion.div
              className="flex items-center justify-between mb-12"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Logo />
              <div className="flex items-center space-x-3">
                <LanguageToggle />
                <ThemeToggle />
              </div>
            </motion.div>

            {/* Login Card */}
            <motion.div
              className="backdrop-blur-xl rounded-2xl p-8 border shadow-2xl relative"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderColor: 'var(--theme-border)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
              }}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              {/* Glass Effect Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl pointer-events-none" />
              
              <div className="relative z-10">
                <div className="text-center mb-10">
                  <motion.div
                    className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      damping: 15,
                      delay: 0.4
                    }}
                    whileHover={{
                      scale: 1.1,
                      rotate: 10,
                      boxShadow: "0 10px 25px rgba(99, 102, 241, 0.4)"
                    }}
                  >
                    <span className="text-3xl text-white">🏢</span>
                  </motion.div>
                  <motion.h2
                    className="text-3xl font-bold mb-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    {isGerman ? 'Admin-Anmeldung' : 'Admin Login'}
                  </motion.h2>
                  <motion.p
                    className="text-lg"
                    style={{ color: 'var(--theme-muted)' }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    {isGerman
                      ? 'Verwalten Sie das System als Administrator'
                      : 'Manage the system as administrator'
                    }
                  </motion.p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* General Error Message */}
                  {errors.general && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 rounded-xl border border-red-400/30 bg-gradient-to-r from-red-50 to-red-100 text-red-700 text-sm text-center backdrop-blur-sm"
                      style={{ 
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        borderColor: 'rgba(239, 68, 68, 0.3)'
                      }}
                    >
                      <motion.span
                        animate={{ rotate: [0, -5, 5, 0] }}
                        transition={{ duration: 0.5 }}
                        className="inline-block mr-2"
                      >
                        ⚠️
                      </motion.span>
                      {errors.general}
                    </motion.div>
                  )}

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 }}
                  >
                    <label
                      htmlFor="email"
                      className="block text-sm font-semibold mb-3"
                      style={{ color: 'var(--theme-text)' }}
                    >
                      📧 {isGerman ? 'E-Mail' : 'Email'}
                    </label>
                    <div className="relative">
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className={`
                          appearance-none relative block w-full px-3 py-3 sm:px-4 sm:py-4 border-2 rounded-xl
                          backdrop-blur-sm transition-all duration-300
                          focus:outline-none focus:ring-4 focus:ring-opacity-30 focus:scale-105 text-sm sm:text-base
                          ${errors.email ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-gray-300 dark:border-gray-200/30 focus:border-blue-400 focus:ring-blue-400'}
                        `}
                        style={{
                          backgroundColor: 'var(--theme-bg-secondary, rgba(0, 0, 0, 0.05))',
                          borderColor: errors.email ? '#EF4444' : 'var(--theme-border)',
                          color: 'var(--theme-text)',
                          backdropFilter: 'blur(10px)'
                        }}
                        placeholder={isGerman ? 'E-Mail eingeben' : 'Enter email'}
                      />
                    </div>
                    {errors.email && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 text-sm text-red-400 flex items-center"
                      >
                        <span className="mr-1">❌</span>
                        {errors.email}
                      </motion.p>
                    )}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    <label
                      htmlFor="password"
                      className="block text-sm font-semibold mb-3"
                      style={{ color: 'var(--theme-text)' }}
                    >
                      🔐 {isGerman ? 'Passwort' : 'Password'}
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        value={formData.password}
                        onChange={handleChange}
                        className={`
                          appearance-none relative block w-full px-3 py-3 pr-10 sm:px-4 sm:py-4 sm:pr-12 border-2 rounded-xl
                          backdrop-blur-sm transition-all duration-300
                          focus:outline-none focus:ring-4 focus:ring-opacity-30 focus:scale-105 text-sm sm:text-base
                          ${errors.password ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-gray-300 dark:border-gray-200/30 focus:border-blue-400 focus:ring-blue-400'}
                        `}
                        style={{
                          backgroundColor: 'var(--theme-bg-secondary, rgba(0, 0, 0, 0.05))',
                          borderColor: errors.password ? '#EF4444' : 'var(--theme-border)',
                          color: 'var(--theme-text)',
                          backdropFilter: 'blur(10px)'
                        }}
                        placeholder={isGerman ? 'Passwort eingeben' : 'Enter password'}
                      />
                      {/* Password Toggle Button */}
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                      >
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                          style={{ color: 'var(--theme-muted)' }}
                        >
                          {showPassword ? (
                            // Eye Slash (Hide password)
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                            </svg>
                          ) : (
                            // Eye (Show password)
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </motion.div>
                      </button>
                    </div>
                    {errors.password && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 text-sm text-red-400 flex items-center"
                      >
                        <span className="mr-1">❌</span>
                        {errors.password}
                      </motion.p>
                    )}
                  </motion.div>

                  <motion.div
                    className="flex items-center justify-end mb-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 }}
                  >
                    <div className="text-xs" style={{ color: 'var(--theme-muted)' }}>
                      {isGerman ? 'Sichere Admin-Anmeldung' : 'Secure Admin Login'}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.0 }}
                  >
                    <motion.button
                      type="submit"
                      disabled={isSubmitting}
                      className={`
                        group relative w-full flex justify-center py-4 px-6 border-0 
                        text-base font-bold rounded-xl text-white focus:outline-none focus:ring-4 
                        focus:ring-blue-500/30 transition-all duration-300
                        bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600
                        hover:from-blue-700 hover:via-purple-700 hover:to-pink-700
                        ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-2xl hover:shadow-blue-500/25 hover:scale-105'}
                      `}
                      style={{
                        backgroundSize: '200% 200%',
                        backgroundPosition: 'left center'
                      }}
                      whileHover={{ 
                        backgroundPosition: 'right center',
                        scale: isSubmitting ? 1 : 1.02
                      }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 rounded-xl transition-opacity duration-300" />
                      {isSubmitting ? (
                        <div className="flex items-center relative z-10">
                          <motion.div
                            className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-3"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          />
                          <span>{t('auth.signingIn')}</span>
                        </div>
                      ) : (
                        <div className="flex items-center relative z-10">
                          <motion.span
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            className="mr-2 text-lg"
                          >
                            🚀
                          </motion.span>
                          <span>{t('auth.signIn')}</span>
                          <motion.span
                            animate={{ x: [0, 5, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                            className="ml-2"
                          >
                            →
                          </motion.span>
                        </div>
                      )}
                    </motion.button>
                  </motion.div>

                  {/* Admin Login Link */}
                  <motion.div
                    className="text-center mt-6 pt-4 border-t border-gray-200/20"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.05 }}
                  >
                    <p className="text-xs mb-2" style={{ color: 'var(--theme-muted)' }}>
                      {isGerman ? 'Oder melden Sie sich als Partner an:' : 'Or sign in as partner:'}
                    </p>
                    <Link
                      href="/auth/login"
                      className="text-sm font-medium transition-all duration-200 hover:underline"
                      style={{ color: 'var(--theme-accent)' }}
                    >
                      🤝 {isGerman ? 'Partner-Anmeldung' : 'Partner Login'}
                    </Link>
                  </motion.div>

                </form>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Right Side - Business Benefits */}
        <div className="hidden lg:block relative w-0 flex-1">
          <motion.div 
            className="absolute inset-0 h-full w-full flex items-center justify-center backdrop-blur-xl"
            style={{ 
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(236, 72, 153, 0.1) 50%, rgba(168, 85, 247, 0.1) 100%)',
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)'
            }}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <svg width="100%" height="100%" className="absolute inset-0">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            <div className="text-center p-8 max-w-lg relative z-10">
              {/* Floating Icons */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                  className="absolute top-10 left-10 text-4xl opacity-30"
                  animate={{ y: [0, -20, 0], rotate: [0, 10, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                >
                  📊
                </motion.div>
                <motion.div
                  className="absolute top-20 right-16 text-3xl opacity-40"
                  animate={{ y: [0, 15, 0], rotate: [0, -15, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                >
                  🎯
                </motion.div>
                <motion.div
                  className="absolute bottom-20 left-8 text-2xl opacity-25"
                  animate={{ y: [0, -10, 0], x: [0, 10, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                >
                  💰
                </motion.div>
              </div>

              <motion.div 
                className="text-8xl mb-8 relative"
                animate={{ 
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.05, 1]
                }}
                transition={{ 
                  duration: 6, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <div className="relative">
                  💼
                  <motion.div
                    className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-green-400 to-blue-500 rounded-full"
                    animate={{ 
                      scale: [1, 1.3, 1],
                      opacity: [0.7, 1, 0.7]
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                </div>
              </motion.div>
              
              <motion.h3
                className="text-4xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                {isGerman ? 'CRM-Dashboard' : 'CRM Dashboard'}
              </motion.h3>
              
              <motion.p 
                className="text-xl mb-10 leading-relaxed" 
                style={{ color: 'var(--theme-muted)' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                {isGerman 
                  ? 'Verwalten Sie Leads professionell, steigern Sie Conversions und wachsen Sie mit unserem fortschrittlichen CRM-System.'
                  : 'Manage leads professionally, boost conversions, and grow your business with our advanced CRM system.'
                }
              </motion.p>

              {/* Business Features */}
              <div className="space-y-4 mb-10">
                {[
                  {
                    icon: '📊',
                    title: isGerman ? 'Lead-Analytik' : 'Lead Analytics',
                    desc: isGerman ? 'Erweiterte Statistiken' : 'Advanced statistics'
                  },
                  {
                    icon: '🔔',
                    title: isGerman ? 'Echtzeit-Updates' : 'Live Updates',
                    desc: isGerman ? 'Sofortige Benachrichtigungen' : 'Real-time notifications'
                  },
                  {
                    icon: '💰',
                    title: isGerman ? 'Umsatzverfolgung' : 'Revenue Tracking',
                    desc: isGerman ? 'Einnahmen überwachen' : 'Monitor earnings'
                  }
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    className="flex items-center space-x-4 p-4 rounded-xl backdrop-blur-sm border border-white/10 bg-white/5"
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.7 + index * 0.15 }}
                    whileHover={{ x: 5, scale: 1.02 }}
                  >
                    <motion.div 
                      className="text-3xl p-2 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20"
                      animate={{ 
                        rotate: [0, 10, -10, 0],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{ 
                        duration: 4, 
                        repeat: Infinity, 
                        ease: "easeInOut",
                        delay: index * 0.5
                      }}
                    >
                      {feature.icon}
                    </motion.div>
                    <div className="text-left">
                      <div className="font-bold text-lg" style={{ color: 'var(--theme-text)' }}>
                        {feature.title}
                      </div>
                      <div className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                        {feature.desc}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-3 gap-6">
                {[
                  { value: '2.5K+', label: isGerman ? 'Partner' : 'Partners', delay: 0.8 },
                  { value: '150K+', label: isGerman ? 'Leads' : 'Leads', delay: 0.9 },
                  { value: '€8M+', label: isGerman ? 'Umsatz' : 'Revenue', delay: 1.0 }
                ].map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    className="p-4 rounded-xl backdrop-blur-sm bg-gradient-to-br from-white/10 to-white/5 border border-white/20"
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ 
                      delay: stat.delay, 
                      type: "spring", 
                      stiffness: 200 
                    }}
                    whileHover={{ 
                      scale: 1.05,
                      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)"
                    }}
                  >
                    <motion.div 
                      className="font-bold text-2xl bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity, 
                        ease: "easeInOut",
                        delay: index * 0.3
                      }}
                    >
                      {stat.value}
                    </motion.div>
                    <div className="text-xs mt-1 font-medium" style={{ color: 'var(--theme-muted)' }}>
                      {stat.label}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Trust Badge */}
              <motion.div
                className="mt-8 p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2 }}
              >
                <div className="flex items-center justify-center space-x-2">
                  <motion.span
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="text-lg"
                  >
                    🔒
                  </motion.span>
                  <span className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                    {isGerman ? 'Sicher & DSGVO-konform' : 'Secure & GDPR Compliant'}
                  </span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}