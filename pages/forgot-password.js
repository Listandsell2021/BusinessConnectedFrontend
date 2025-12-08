import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useLanguage } from '../src/contexts/LanguageContext';
import { useTheme } from '../src/contexts/ThemeContext';
import ThemeToggle from '../src/components/ui/ThemeToggle';
import LanguageToggle from '../src/components/ui/LanguageToggle';
import Logo from '../src/components/ui/Logo';

export default function ForgotPassword() {
  const router = useRouter();
  const { isGerman } = useLanguage();
  const { mounted, isDark } = useTheme();

  // Error message translations
  const translateError = (errorMsg) => {
    if (!isGerman) return errorMsg;

    const translations = {
      // Network errors
      'Network error': 'Netzwerkfehler',
      'Failed to send OTP': 'Fehler beim Senden der OTP',
      'Failed to resend': 'Fehler beim erneuten Senden',

      // OTP errors
      'Invalid OTP': 'Ungültige OTP',
      'OTP already used': 'OTP wurde bereits verwendet',
      'OTP expired': 'OTP ist abgelaufen',
      'Maximum attempts exceeded': 'Maximale Anzahl an Versuchen überschritten',
      'OTP ID and OTP code are required': 'OTP-ID und OTP-Code sind erforderlich',
      'Invalid OTP request': 'Ungültige OTP-Anfrage',
      'Failed to verify OTP': 'OTP-Verifizierung fehlgeschlagen',

      // Password reset errors
      'Failed to reset password': 'Fehler beim Zurücksetzen des Passworts',
      'Reset token is required': 'Reset-Token ist erforderlich',
      'Password must be at least 8 characters long': 'Passwort muss mindestens 8 Zeichen lang sein',

      // Email errors
      'Email is required': 'E-Mail ist erforderlich',
      'Email is invalid': 'E-Mail ist ungültig',
      'No user found with this email': 'Kein Benutzer mit dieser E-Mail gefunden',
      'User not found': 'Benutzer nicht gefunden',

      // Service errors
      'Service selection is required': 'Service-Auswahl ist erforderlich',
      'Invalid service type': 'Ungültiger Service-Typ'
    };

    return translations[errorMsg] || errorMsg;
  };

  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [formData, setFormData] = useState({
    email: '',
    service: 'moving', // Default service
    otp: '',
    newPassword: '',
    confirmPassword: ''
  });

  const availableServices = [
    { id: 'moving', name: { en: 'Moving Services', de: 'Umzugsservice' }, icon: '🚛' }
  ];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [otpId, setOtpId] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [showPasswords, setShowPasswords] = useState({
    newPassword: false,
    confirmPassword: false
  });
  const [countdown, setCountdown] = useState(0);

  // Countdown timer for OTP expiry
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

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

  const validateEmail = () => {
    const newErrors = {};
    if (!formData.email) {
      newErrors.email = isGerman ? 'E-Mail ist erforderlich' : 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = isGerman ? 'E-Mail ist ungültig' : 'Email is invalid';
    }

    // Service is always 'moving', no validation needed

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateOTP = () => {
    const newErrors = {};
    if (!formData.otp) {
      newErrors.otp = isGerman ? 'OTP ist erforderlich' : 'OTP is required';
    } else if (formData.otp.length !== 6) {
      newErrors.otp = isGerman ? 'OTP muss 6 Ziffern haben' : 'OTP must be 6 digits';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = () => {
    const newErrors = {};
    if (!formData.newPassword) {
      newErrors.newPassword = isGerman ? 'Neues Passwort ist erforderlich' : 'New password is required';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = isGerman ? 'Passwort muss mindestens 8 Zeichen haben' : 'Password must be at least 8 characters';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = isGerman ? 'Passwort bestätigen ist erforderlich' : 'Confirm password is required';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = isGerman ? 'Passwörter stimmen nicht überein' : 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!validateEmail()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          service: formData.service
        })
      });

      const data = await response.json();

      if (response.ok) {
        setOtpId(data.otpId);
        setStep(2);
        setCountdown(900); // 15 minutes countdown
        toast.success(
          isGerman
            ? 'OTP wurde an Ihre E-Mail gesendet'
            : 'OTP sent to your email'
        );
      } else {
        const errorMessage = translateError(data.message || data.error || 'Failed to send OTP');
        setErrors({ email: errorMessage });
        toast.error(errorMessage);
      }
    } catch (error) {
      const errorMessage = translateError('Network error');
      setErrors({ email: errorMessage });
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!validateOTP()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          otpId: otpId,
          otp: formData.otp 
        })
      });

      const data = await response.json();

      if (response.ok) {
        setResetToken(data.resetToken);
        setStep(3);
        toast.success(
          isGerman
            ? 'OTP erfolgreich verifiziert'
            : 'OTP verified successfully'
        );
      } else {
        const errorMessage = translateError(data.message || data.error || 'Invalid OTP');
        setErrors({ otp: errorMessage });
        toast.error(errorMessage);
      }
    } catch (error) {
      const errorMessage = translateError('Network error');
      setErrors({ otp: errorMessage });
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!validatePassword()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          resetToken: resetToken,
          newPassword: formData.newPassword 
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(
          isGerman
            ? 'Passwort erfolgreich zurückgesetzt!'
            : 'Password reset successfully!'
        );

        // Redirect to appropriate login page
        setTimeout(() => {
          router.push('/partner-login');
        }, 2000);
      } else {
        const errorMessage = translateError(data.message || data.error || 'Failed to reset password');
        setErrors({ newPassword: errorMessage });
        toast.error(errorMessage);
      }
    } catch (error) {
      const errorMessage = translateError('Network error');
      setErrors({ newPassword: errorMessage });
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          service: formData.service
        })
      });

      const data = await response.json();

      if (response.ok) {
        setOtpId(data.otpId);
        setCountdown(900);
        setFormData(prev => ({ ...prev, otp: '' }));
        toast.success(
          isGerman
            ? 'Neue OTP wurde gesendet'
            : 'New OTP sent'
        );
      } else {
        toast.error(translateError(data.message || 'Failed to resend'));
      }
    } catch (error) {
      toast.error(translateError('Network error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) {
    return null;
  }

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Head>
        <title>
          {isGerman ? 'Passwort vergessen - Umzug Anbieter Vergleich' : 'Forgot Password - Umzug Anbieter Vergleich'}
        </title>
        <meta name="description" content={isGerman ? 'Setzen Sie Ihr Passwort zurück' : 'Reset your password'} />
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
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center py-6 sm:py-8 lg:py-12 px-4 sm:px-6 lg:px-20 xl:px-24 relative z-10">
          <div className="mx-auto w-full max-w-sm sm:max-w-md lg:w-[420px]">
            {/* Header Controls */}
            <motion.div
              className="flex items-center justify-between mb-6 sm:mb-8 lg:mb-12"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Logo />
              <div className="flex items-center space-x-2 sm:space-x-3">
                <LanguageToggle />
                <ThemeToggle />
              </div>
            </motion.div>

            {/* Forgot Password Card */}
            <motion.div
              className="backdrop-blur-xl rounded-2xl p-6 sm:p-8 border shadow-2xl relative"
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
                <div className="text-center mb-6 sm:mb-8 lg:mb-10">
                  <motion.div
                    className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg"
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
                      boxShadow: "0 10px 25px rgba(249, 115, 22, 0.4)"
                    }}
                  >
                    <span className="text-2xl sm:text-3xl text-white">🔑</span>
                  </motion.div>
                  <motion.h2 
                    className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3 bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 bg-clip-text text-transparent"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    {isGerman ? 'Passwort zurücksetzen' : 'Reset Password'}
                  </motion.h2>
                  <motion.p 
                    className="text-base sm:text-lg" 
                    style={{ color: 'var(--theme-muted)' }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    {step === 1 && (isGerman 
                      ? 'Geben Sie Ihre E-Mail-Adresse ein'
                      : 'Enter your email address'
                    )}
                    {step === 2 && (isGerman 
                      ? 'Geben Sie den OTP-Code ein'
                      : 'Enter the OTP code'
                    )}
                    {step === 3 && (isGerman 
                      ? 'Erstellen Sie ein neues Passwort'
                      : 'Create a new password'
                    )}
                  </motion.p>
                </div>

                {/* Step 1: Email Form */}
                {step === 1 && (
                  <form onSubmit={handleSendOTP} className="space-y-4 sm:space-y-6">
                    {/* Service is fixed to moving - no selection needed */}

                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 }}
                    >
                      <label
                        htmlFor="email"
                        className="block text-sm font-semibold mb-3"
                        style={{ color: 'var(--theme-text)' }}
                      >
                        📧 {isGerman ? 'E-Mail-Adresse' : 'Email Address'}
                      </label>

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
                          ${errors.email ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-gray-300 dark:border-gray-200/30 focus:border-orange-400 focus:ring-orange-400'}
                        `}
                        style={{
                          backgroundColor: 'var(--theme-bg-secondary, rgba(0, 0, 0, 0.05))',
                          borderColor: errors.email ? '#EF4444' : 'var(--theme-border)',
                          color: 'var(--theme-text)',
                          backdropFilter: 'blur(10px)'
                        }}
                        placeholder={isGerman ? 'E-Mail eingeben' : 'Enter email'}
                      />

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
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.9 }}
                    >
                      <motion.button
                        type="submit"
                        disabled={isSubmitting}
                        className={`
                          group relative w-full flex justify-center items-center py-3 px-4 sm:py-3 sm:px-5 border-0
                          text-sm font-semibold rounded-xl text-white focus:outline-none focus:ring-4
                          focus:ring-orange-500/30 transition-all duration-300
                          bg-gradient-to-r from-orange-600 via-red-600 to-pink-600
                          hover:from-orange-700 hover:via-red-700 hover:to-pink-700
                          ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-lg hover:shadow-orange-500/25 hover:scale-102'}
                        `}
                        whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {isSubmitting ? (
                          <div className="flex items-center">
                            <motion.div
                              className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            />
                            <span>{isGerman ? 'Senden...' : 'Sending...'}</span>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <span className="mr-2">📤</span>
                            <span>{isGerman ? 'OTP senden' : 'Send OTP'}</span>
                          </div>
                        )}
                      </motion.button>
                    </motion.div>
                  </form>
                )}

                {/* Step 2: OTP Form */}
                {step === 2 && (
                  <form onSubmit={handleVerifyOTP} className="space-y-4 sm:space-y-6">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 }}
                    >
                      <label 
                        htmlFor="otp" 
                        className="block text-sm font-semibold mb-3"
                        style={{ color: 'var(--theme-text)' }}
                      >
                        🔢 {isGerman ? 'OTP-Code (6 Ziffern)' : 'OTP Code (6 digits)'}
                      </label>
                      <input
                        id="otp"
                        name="otp"
                        type="text"
                        maxLength="6"
                        required
                        value={formData.otp}
                        onChange={handleChange}
                        className={`
                          appearance-none relative block w-full px-3 py-3 sm:px-4 sm:py-4 border-2 rounded-xl
                          backdrop-blur-sm transition-all duration-300 text-center text-2xl tracking-widest
                          focus:outline-none focus:ring-4 focus:ring-opacity-30 focus:scale-105
                          ${errors.otp ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-gray-300 dark:border-gray-200/30 focus:border-orange-400 focus:ring-orange-400'}
                        `}
                        style={{
                          backgroundColor: 'var(--theme-bg-secondary, rgba(0, 0, 0, 0.05))',
                          borderColor: errors.otp ? '#EF4444' : 'var(--theme-border)',
                          color: 'var(--theme-text)',
                          backdropFilter: 'blur(10px)'
                        }}
                        placeholder="123456"
                      />
                      {errors.otp && (
                        <motion.p 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-2 text-sm text-red-400 flex items-center"
                        >
                          <span className="mr-1">❌</span>
                          {errors.otp}
                        </motion.p>
                      )}
                    </motion.div>

                    {/* Countdown Timer */}
                    {countdown > 0 && (
                      <div className="text-center">
                        <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                          {isGerman ? 'OTP läuft ab in:' : 'OTP expires in:'} <span className="font-mono font-bold">{formatTime(countdown)}</span>
                        </p>
                      </div>
                    )}

                    <motion.button
                      type="submit"
                      disabled={isSubmitting}
                      className={`
                        group relative w-full flex justify-center py-3 px-4 sm:py-4 sm:px-6 border-0 
                        text-sm sm:text-base font-bold rounded-xl text-white focus:outline-none focus:ring-4 
                        focus:ring-orange-500/30 transition-all duration-300
                        bg-gradient-to-r from-orange-600 via-red-600 to-pink-600
                        hover:from-orange-700 hover:via-red-700 hover:to-pink-700
                        ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-2xl hover:shadow-orange-500/25 hover:scale-105'}
                      `}
                      whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isSubmitting ? (
                        <div className="flex items-center">
                          <motion.div
                            className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-3"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          />
                          <span>{isGerman ? 'Verifizieren...' : 'Verifying...'}</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <span className="mr-2">✅</span>
                          <span>{isGerman ? 'OTP verifizieren' : 'Verify OTP'}</span>
                        </div>
                      )}
                    </motion.button>

                    {/* Resend OTP Button */}
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={handleResendOTP}
                        disabled={countdown > 0 || isSubmitting}
                        className={`
                          text-sm font-medium transition-all duration-200 hover:underline
                          ${countdown > 0 || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                        style={{ color: 'var(--theme-accent)' }}
                      >
                        <span className="mr-1">📧</span>
                        {isGerman ? 'OTP erneut senden' : 'Resend OTP'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Step 3: New Password Form */}
                {step === 3 && (
                  <form onSubmit={handleResetPassword} className="space-y-4 sm:space-y-6">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 }}
                    >
                      <label 
                        htmlFor="newPassword" 
                        className="block text-sm font-semibold mb-3"
                        style={{ color: 'var(--theme-text)' }}
                      >
                        🔐 {isGerman ? 'Neues Passwort' : 'New Password'}
                      </label>
                      <div className="relative">
                        <input
                          id="newPassword"
                          name="newPassword"
                          type={showPasswords.newPassword ? "text" : "password"}
                          required
                          value={formData.newPassword}
                          onChange={handleChange}
                          className={`
                            appearance-none relative block w-full px-3 py-3 pr-10 sm:px-4 sm:py-4 sm:pr-12 border-2 rounded-xl
                            backdrop-blur-sm transition-all duration-300
                            focus:outline-none focus:ring-4 focus:ring-opacity-30 focus:scale-105 text-sm sm:text-base
                            ${errors.newPassword ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-gray-300 dark:border-gray-200/30 focus:border-orange-400 focus:ring-orange-400'}
                          `}
                          style={{
                            backgroundColor: 'var(--theme-bg-secondary, rgba(0, 0, 0, 0.05))',
                            borderColor: errors.newPassword ? '#EF4444' : 'var(--theme-border)',
                            color: 'var(--theme-text)',
                            backdropFilter: 'blur(10px)'
                          }}
                          placeholder={isGerman ? 'Neues Passwort eingeben' : 'Enter new password'}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => setShowPasswords(prev => ({...prev, newPassword: !prev.newPassword}))}
                          tabIndex={-1}
                        >
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                            style={{ color: 'var(--theme-muted)' }}
                          >
                            {showPasswords.newPassword ? (
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
                      {errors.newPassword && (
                        <motion.p 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-2 text-sm text-red-400 flex items-center"
                        >
                          <span className="mr-1">❌</span>
                          {errors.newPassword}
                        </motion.p>
                      )}
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 }}
                    >
                      <label 
                        htmlFor="confirmPassword" 
                        className="block text-sm font-semibold mb-3"
                        style={{ color: 'var(--theme-text)' }}
                      >
                        🔐 {isGerman ? 'Passwort bestätigen' : 'Confirm Password'}
                      </label>
                      <div className="relative">
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showPasswords.confirmPassword ? "text" : "password"}
                          required
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          className={`
                            appearance-none relative block w-full px-3 py-3 pr-10 sm:px-4 sm:py-4 sm:pr-12 border-2 rounded-xl
                            backdrop-blur-sm transition-all duration-300
                            focus:outline-none focus:ring-4 focus:ring-opacity-30 focus:scale-105 text-sm sm:text-base
                            ${errors.confirmPassword ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-gray-300 dark:border-gray-200/30 focus:border-orange-400 focus:ring-orange-400'}
                          `}
                          style={{
                            backgroundColor: 'var(--theme-bg-secondary, rgba(0, 0, 0, 0.05))',
                            borderColor: errors.confirmPassword ? '#EF4444' : 'var(--theme-border)',
                            color: 'var(--theme-text)',
                            backdropFilter: 'blur(10px)'
                          }}
                          placeholder={isGerman ? 'Passwort erneut eingeben' : 'Confirm your password'}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => setShowPasswords(prev => ({...prev, confirmPassword: !prev.confirmPassword}))}
                          tabIndex={-1}
                        >
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                            style={{ color: 'var(--theme-muted)' }}
                          >
                            {showPasswords.confirmPassword ? (
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
                      {errors.confirmPassword && (
                        <motion.p 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-2 text-sm text-red-400 flex items-center"
                        >
                          <span className="mr-1">❌</span>
                          {errors.confirmPassword}
                        </motion.p>
                      )}
                    </motion.div>

                    <motion.button
                      type="submit"
                      disabled={isSubmitting}
                      className={`
                        group relative w-full flex justify-center py-3 px-4 sm:py-4 sm:px-6 border-0 
                        text-sm sm:text-base font-bold rounded-xl text-white focus:outline-none focus:ring-4 
                        focus:ring-green-500/30 transition-all duration-300
                        bg-gradient-to-r from-green-600 via-blue-600 to-purple-600
                        hover:from-green-700 hover:via-blue-700 hover:to-purple-700
                        ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-2xl hover:shadow-green-500/25 hover:scale-105'}
                      `}
                      whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isSubmitting ? (
                        <div className="flex items-center">
                          <motion.div
                            className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-3"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          />
                          <span>{isGerman ? 'Zurücksetzen...' : 'Resetting...'}</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <span className="mr-2">🔄</span>
                          <span>{isGerman ? 'Passwort zurücksetzen' : 'Reset Password'}</span>
                        </div>
                      )}
                    </motion.button>
                  </form>
                )}

                {/* Back to Login Link */}
                <motion.div 
                  className="text-center mt-6 pt-4 sm:mt-8 sm:pt-6 border-t border-gray-200/20"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.1 }}
                >
                  <Link
                    href="/partner-login"
                    className="inline-flex items-center space-x-2 text-sm font-medium transition-all duration-200 hover:underline px-4 py-2 rounded-lg hover:bg-gray-100/10"
                    style={{ color: 'var(--theme-accent)' }}
                  >
                    <span>←</span>
                    <span>{isGerman ? 'Zurück zur Anmeldung' : 'Back to Login'}</span>
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Right Side - Process Steps Visualization */}
        <div className="hidden md:block relative w-0 flex-1">
          <motion.div 
            className="absolute inset-0 h-full w-full flex items-center justify-center backdrop-blur-xl"
            style={{ 
              background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(239, 68, 68, 0.1) 50%, rgba(236, 72, 153, 0.1) 100%)',
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)'
            }}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
          >
            <div className="text-center p-6 sm:p-8 max-w-lg relative z-10">
              <motion.h3 
                className="text-2xl sm:text-4xl font-bold mb-6 sm:mb-8 bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 bg-clip-text text-transparent"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                {isGerman ? 'Passwort-Reset' : 'Password Reset'}
              </motion.h3>

              {/* Process Steps */}
              <div className="space-y-6">
                {[
                  {
                    step: 1,
                    icon: '📧',
                    title: isGerman ? 'E-Mail' : 'Email',
                    desc: isGerman ? 'E-Mail eingeben' : 'Enter your email',
                    active: step === 1,
                    completed: step > 1
                  },
                  {
                    step: 2,
                    icon: '🔢',
                    title: isGerman ? 'OTP verifizieren' : 'Verify OTP',
                    desc: isGerman ? '6-stelliger Code per E-Mail' : '6-digit code via email',
                    active: step === 2,
                    completed: step > 2
                  },
                  {
                    step: 3,
                    icon: '🔐',
                    title: isGerman ? 'Neues Passwort' : 'New Password',
                    desc: isGerman ? 'Sicheres Passwort erstellen' : 'Create secure password',
                    active: step === 3,
                    completed: false
                  }
                ].map((processStep, index) => (
                  <motion.div
                    key={processStep.step}
                    className={`flex items-center space-x-4 p-4 rounded-xl backdrop-blur-sm border transition-all duration-300 ${
                      processStep.completed 
                        ? 'border-green-400/30 bg-green-500/10'
                        : processStep.active 
                          ? 'border-orange-400/30 bg-orange-500/10'
                          : 'border-gray-400/20 bg-white/5'
                    }`}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.7 + index * 0.15 }}
                  >
                    <div className={`text-2xl p-3 rounded-lg transition-all duration-300 ${
                      processStep.completed 
                        ? 'bg-gradient-to-r from-green-500/20 to-green-600/20'
                        : processStep.active 
                          ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20'
                          : 'bg-gradient-to-r from-gray-500/20 to-gray-600/20'
                    }`}>
                      {processStep.completed ? '✅' : processStep.icon}
                    </div>
                    <div className="text-left">
                      <div className={`font-bold text-base sm:text-lg transition-all duration-300 ${
                        processStep.completed ? 'text-green-400' : 
                        processStep.active ? 'text-orange-400' : 'text-gray-400'
                      }`}>
                        {processStep.title}
                      </div>
                      <div className="text-xs sm:text-sm" style={{ color: 'var(--theme-muted)' }}>
                        {processStep.desc}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Security Badge */}
              <motion.div
                className="mt-8 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-green-500/10 border border-blue-500/20"
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
                    {isGerman ? 'Sicherer OTP-Reset' : 'Secure OTP Reset'}
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