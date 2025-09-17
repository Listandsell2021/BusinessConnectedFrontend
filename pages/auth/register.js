import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import ThemeToggle from '../../src/components/ui/ThemeToggle';
import LanguageToggle from '../../src/components/ui/LanguageToggle';


export default function PartnerRequest() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const { t, isGerman } = useLanguage();
  const { mounted } = useTheme();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    pursue: [],
    company: '',
    address: '',
    postcodeCity: '',
    country: '',
    agreeToTerms: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [loadingServiceTypes, setLoadingServiceTypes] = useState(true);
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
  const serviceDropdownRef = useRef(null);
  const previousErrorsRef = useRef({});

  useEffect(() => {
    if (isAuthenticated() && !loading) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, loading, router]);

  // Fetch service types from database
  useEffect(() => {
    const fetchServiceTypes = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/services');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.services) {
            // Map the services to the format expected by the dropdown
            setServiceTypes(data.services.map(service => ({
              id: service.type,
              name: service.name
            })));
          } else {
            throw new Error('Invalid API response format');
          }
        } else {
          throw new Error(`API returned ${response.status}`);
        }
      } catch (error) {
        console.error('Error fetching service types:', error);
        // Fallback to default service types
        setServiceTypes([
          { id: 'moving', name: isGerman ? 'Umzugsservice' : 'Moving Service' },
          { id: 'cleaning', name: isGerman ? 'Reinigungsservice' : 'Cleaning Service' },
          { id: 'handyman', name: isGerman ? 'Handwerkerservice' : 'Handyman Service' },
          { id: 'transport', name: isGerman ? 'Transportservice' : 'Transport Service' },
          { id: 'storage', name: isGerman ? 'Lagerservice' : 'Storage Service' },
          { id: 'other', name: isGerman ? 'Sonstiges' : 'Other' }
        ]);
      } finally {
        setLoadingServiceTypes(false);
      }
    };

    fetchServiceTypes();
  }, [isGerman]);

  // Update error messages when language changes
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      // Re-validate to update error messages in current language
      const newErrors = {};

      // First Name validation
      if (!formData.firstName.trim()) {
        newErrors.firstName = isGerman ? 'Vorname ist erforderlich' : 'First name is required';
      }

      // Last Name validation
      if (!formData.lastName.trim()) {
        newErrors.lastName = isGerman ? 'Nachname ist erforderlich' : 'Last name is required';
      }

      // Email validation
      if (!formData.email.trim()) {
        newErrors.email = isGerman ? 'E-Mail ist erforderlich' : 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        newErrors.email = isGerman ? 'E-Mail ist ungültig' : 'Email is invalid';
      }

      // Phone validation - removed as per request

      // Pursue validation
      if (!formData.pursue || formData.pursue.length === 0) {
        newErrors.pursue = isGerman ? 'Mindestens ein Service-Typ ist erforderlich' : 'At least one service type is required';
      }

      // Company validation
      if (!formData.company.trim()) {
        newErrors.company = isGerman ? 'Firmenname ist erforderlich' : 'Company name is required';
      }

      // Address validation
      if (!formData.address.trim()) {
        newErrors.address = isGerman ? 'Adresse ist erforderlich' : 'Address is required';
      }

      // Postcode City validation
      if (!formData.postcodeCity.trim()) {
        newErrors.postcodeCity = isGerman ? 'PLZ und Stadt sind erforderlich' : 'Postcode and city are required';
      }

      // Terms agreement validation
      if (!formData.agreeToTerms) {
        newErrors.agreeToTerms = isGerman ? 'Datenschutzerklärung muss akzeptiert werden' : 'Privacy policy must be accepted';
      }

      // Update errors only if there were existing errors for those fields
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
  }, [isGerman, formData.firstName, formData.lastName, formData.email, formData.phone, formData.pursue, formData.company, formData.address, formData.postcodeCity, formData.agreeToTerms, errors]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(event.target)) {
        setIsServiceDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'pursue') {
      // Handle multiple service selection
      setFormData(prev => ({
        ...prev,
        pursue: checked 
          ? [...prev.pursue, value]
          : prev.pursue.filter(service => service !== value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };



  const validateForm = () => {
    const newErrors = {};

    // First Name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = isGerman ? 'Vorname ist erforderlich' : 'First name is required';
    }

    // Last Name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = isGerman ? 'Nachname ist erforderlich' : 'Last name is required';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = isGerman ? 'E-Mail ist erforderlich' : 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = isGerman ? 'E-Mail ist ungültig' : 'Email is invalid';
    }

    // Phone validation - removed as per request

    // Pursue validation
    if (!formData.pursue || formData.pursue.length === 0) {
      newErrors.pursue = isGerman ? 'Mindestens ein Service-Typ ist erforderlich' : 'At least one service type is required';
    }

    // Company validation
    if (!formData.company.trim()) {
      newErrors.company = isGerman ? 'Firmenname ist erforderlich' : 'Company name is required';
    }

    // Address validation
    if (!formData.address.trim()) {
      newErrors.address = isGerman ? 'Adresse ist erforderlich' : 'Address is required';
    }

    // Postcode City validation
    if (!formData.postcodeCity.trim()) {
      newErrors.postcodeCity = isGerman ? 'PLZ und Stadt sind erforderlich' : 'Postcode and city are required';
    }

    // Terms agreement validation
    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = isGerman ? 'Datenschutzerklärung muss akzeptiert werden' : 'Privacy policy must be accepted';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Get the first error for top display and auto-focus
  const getFirstError = () => {
    const errorKeys = [
      'firstName', 'lastName', 'email', 'phone', 'pursue', 'company', 'address', 'postcodeCity', 'agreeToTerms'
    ];
    
    for (const key of errorKeys) {
      if (errors[key]) {
        return { field: key, message: errors[key] };
      }
    }
    
    return null;
  };

  // Auto-focus on problematic field
  const focusOnErrorField = () => {
    const firstError = getFirstError();
    if (firstError) {
      setTimeout(() => {
        const element = document.getElementById(firstError.field);
        if (element) {
          element.focus();
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      focusOnErrorField();
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Send partner registration request to backend
      const response = await fetch('http://localhost:5000/api/auth/register-partner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: formData.company,
          contactPerson: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone
          },
          address: {
            street: formData.address,
            city: formData.postcodeCity,
            postalCode: formData.postcodeCity.split(' ')[0] || '',
            country: formData.country
          },
          services: formData.pursue,
          partnerType: 'basic',
          language: isGerman ? 'de' : 'en' // Add current language preference
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSubmitSuccess(true);
        console.log('Registration successful:', result);
        
        // Clear any existing errors
        setErrors({});
        
        // Show brief success state before redirect
        setTimeout(() => {
          router.push('/auth/login?message=partner-registration-success');
        }, 1000);
      } else {
        // Handle validation errors
        if (result.errors && Array.isArray(result.errors)) {
          const newErrors = {};
          result.errors.forEach(error => {
            const field = error.path || error.param;
            // Map backend nested fields to frontend flat fields
            if (field === 'contactPerson.firstName') newErrors.firstName = error.msg;
            else if (field === 'contactPerson.lastName') newErrors.lastName = error.msg;
            else if (field === 'contactPerson.email') newErrors.email = error.msg;
            else if (field === 'contactPerson.phone') newErrors.phone = error.msg;
            else if (field === 'companyName') newErrors.company = error.msg;
            else if (field === 'address.street') newErrors.address = error.msg;
            else if (field === 'address.city' || field === 'address.postalCode') newErrors.postcodeCity = error.msg;
            else if (field === 'services') newErrors.pursue = error.msg;
            else newErrors.email = error.msg; // Default to email field
          });
          setErrors(newErrors);
        } else {
          // Handle specific error messages
          if (result.message?.includes('email already exists')) {
            setErrors({ 
              email: isGerman 
                ? 'Ein Partner mit dieser E-Mail-Adresse existiert bereits.' 
                : 'A partner with this email address already exists.' 
            });
          } else if (result.message?.includes('company name already exists')) {
            setErrors({ 
              company: isGerman 
                ? 'Ein Partner mit diesem Firmenname existiert bereits.' 
                : 'A partner with this company name already exists.' 
            });
          } else {
            setErrors({ 
              email: result.message || (isGerman 
                ? 'Partner-Registrierung fehlgeschlagen' 
                : 'Partner registration failed') 
            });
          }
        }
      }
      
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({ 
        email: isGerman 
          ? 'Netzwerkfehler. Bitte versuchen Sie es erneut.' 
          : 'Network error. Please try again.' 
      });
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
        style={{ 
          backgroundColor: 'var(--theme-bg)',
          backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(99, 102, 241, 0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(236, 72, 153, 0.1) 0%, transparent 50%)'
        }}
      >
        <motion.div
          className="flex flex-col items-center space-y-4"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p style={{ color: 'var(--theme-text)' }}>
            {isGerman ? 'Wird geladen...' : 'Loading...'}
          </p>
        </motion.div>
      </div>
    );
  }

  if (isAuthenticated()) {
    return null;
  }

  if (submitSuccess) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center relative overflow-hidden"
        style={{ 
          backgroundColor: 'var(--theme-bg)', 
          color: 'var(--theme-text)',
          backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(99, 102, 241, 0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(236, 72, 153, 0.1) 0%, transparent 50%)'
        }}
      >
        <motion.div
          className="text-center p-8 max-w-md mx-4"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="text-6xl mb-6"
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            ✅
          </motion.div>
          <h2 className="text-3xl font-bold mb-4">
            {isGerman ? 'Anfrage gesendet!' : 'Request Sent!'}
          </h2>
          <p className="text-lg mb-6" style={{ color: 'var(--theme-muted)' }}>
            {isGerman 
              ? 'Vielen Dank für Ihr Interesse! Wir werden uns bald bei Ihnen melden.'
              : 'Thank you for your interest! We will contact you soon.'
            }
          </p>
          <motion.div
            className="text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            {isGerman ? 'Sie werden automatisch weitergeleitet...' : 'You will be redirected automatically...'}
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>
          {isGerman ? 'Registrieren - Leadform CRM' : 'Register - Leadform CRM'}
        </title>
        <meta name="description" content={isGerman ? 'Erstellen Sie Ihr kostenloses Leadform CRM Konto' : 'Create your free Leadform CRM account'} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
      </Head>

      <div 
        className="min-h-screen flex flex-col lg:flex-row relative"
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
        </div>

        {/* Main Form Container */}
        <div className="flex-1 flex flex-col py-4 sm:py-6 px-4 sm:px-6 lg:px-8 relative z-10 overflow-y-auto">
          <div className="mx-auto w-full max-w-sm sm:max-w-md lg:max-w-2xl my-auto">
            {/* Header Controls */}
            <motion.div 
              className="flex items-center justify-between mb-2 sm:mb-3"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Link href="/" className="flex items-center space-x-2 sm:space-x-3 hover:opacity-75 transition-opacity">
                <motion.div
                  className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center"
                  whileHover={{ scale: 1.1, rotate: 10 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <span className="text-white text-sm sm:text-base">📋</span>
                </motion.div>
                <div>
                  <h1 className="text-base sm:text-lg font-bold" style={{ color: 'var(--theme-text)' }}>
                    Leadform CRM
                  </h1>
                  <p className="text-xs hidden sm:block" style={{ color: 'var(--theme-muted)' }}>
                    Professional Edition
                  </p>
                </div>
              </Link>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <LanguageToggle />
                <ThemeToggle />
              </div>
            </motion.div>

            {/* Partner Request Card */}
            <motion.div
              className="backdrop-blur-xl rounded-xl p-4 sm:p-6 border shadow-2xl relative"
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
                {/* Back Button */}
                <motion.div
                  className="mb-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Link 
                    href="/auth/login" 
                    className="inline-flex items-center text-sm font-medium transition-all duration-200 hover:opacity-75"
                    style={{ color: 'var(--theme-accent)' }}
                  >
                    <motion.span
                      animate={{ x: [-2, 0, -2] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      className="mr-2"
                    >
                      ←
                    </motion.span>
                    {isGerman ? 'Zurück zur Anmeldung' : 'Back to Login'}
                  </Link>
                </motion.div>

                <div className="text-center mb-4 sm:mb-5">
                  <motion.div
                    className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-2 bg-gradient-to-br from-green-500 via-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg"
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
                      boxShadow: "0 10px 25px rgba(34, 197, 94, 0.4)"
                    }}
                  >
                    <span className="text-xl sm:text-2xl text-white">🤝</span>
                  </motion.div>
                  <motion.h2 
                    className="text-xl sm:text-3xl font-bold mb-2 sm:mb-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    {isGerman ? 'Registrieren' : 'Create Account'}
                  </motion.h2>
                  <motion.p 
                    className="text-base sm" 
                    style={{ color: 'var(--theme-muted)' }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    {isGerman 
                      ? 'Erstellen Sie Ihr Leadform CRM Konto'
                      : 'Create your Leadform CRM Partner account'
                    }
                  </motion.p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                  {/* General Error Message */}
                  {getFirstError() && (
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
                      {getFirstError().message}
                    </motion.div>
                  )}

                  {/* Name Fields - Two Columns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* First Name */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 }}
                    >
                      <label 
                        htmlFor="firstName" 
                        className="block text-sm font-semibold mb-3"
                        style={{ color: 'var(--theme-text)' }}
                      >
                        👤 {isGerman ? 'Vorname' : 'First Name'}
                      </label>
                      <div className="relative">
                        <input
                          id="firstName"
                          name="firstName"
                          type="text"
                          required
                          value={formData.firstName}
                          onChange={handleChange}
                          onInvalid={(e) => {
                            e.target.setCustomValidity(
                              isGerman 
                                ? 'Bitte füllen Sie dieses Feld aus.' 
                                : 'Please fill in this field.'
                            );
                          }}
                          onInput={(e) => e.target.setCustomValidity('')}
                          className={`
                            appearance-none relative block w-full px-3 py-3 sm:px-4 sm:py-4 border-2 rounded-xl
                            backdrop-blur-sm transition-all duration-300
                            focus:outline-none focus:ring-4 focus:ring-opacity-30 focus:scale-105 text-sm sm:text-base
                            ${errors.firstName ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-gray-300 dark:border-gray-200/30 focus:border-blue-400 focus:ring-blue-400'}
                          `}
                          style={{
                            backgroundColor: 'var(--theme-bg-secondary, rgba(0, 0, 0, 0.05))',
                            borderColor: errors.firstName ? '#EF4444' : 'var(--theme-border)',
                            color: 'var(--theme-text)',
                            backdropFilter: 'blur(10px)'
                          }}
                          placeholder={isGerman ? 'Vorname eingeben' : 'Enter first name'}
                        />
                      </div>
                      {errors.firstName && (
                        <motion.p 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-2 text-sm text-red-400 flex items-center"
                        >
                          <span className="mr-1">❌</span>
                          {errors.firstName}
                        </motion.p>
                      )}
                    </motion.div>

                    {/* Last Name */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 }}
                    >
                      <label 
                        htmlFor="lastName" 
                        className="block text-sm font-semibold mb-3"
                        style={{ color: 'var(--theme-text)' }}
                      >
                        👤 {isGerman ? 'Nachname' : 'Last Name'}
                      </label>
                      <div className="relative">
                        <input
                          id="lastName"
                          name="lastName"
                          type="text"
                          required
                          value={formData.lastName}
                          onChange={handleChange}
                          onInvalid={(e) => {
                            e.target.setCustomValidity(
                              isGerman 
                                ? 'Bitte füllen Sie dieses Feld aus.' 
                                : 'Please fill in this field.'
                            );
                          }}
                          onInput={(e) => e.target.setCustomValidity('')}
                          className={`
                            appearance-none relative block w-full px-3 py-3 sm:px-4 sm:py-4 border-2 rounded-xl
                            backdrop-blur-sm transition-all duration-300
                            focus:outline-none focus:ring-4 focus:ring-opacity-30 focus:scale-105 text-sm sm:text-base
                            ${errors.lastName ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-gray-300 dark:border-gray-200/30 focus:border-blue-400 focus:ring-blue-400'}
                          `}
                          style={{
                            backgroundColor: 'var(--theme-bg-secondary, rgba(0, 0, 0, 0.05))',
                            borderColor: errors.lastName ? '#EF4444' : 'var(--theme-border)',
                            color: 'var(--theme-text)',
                            backdropFilter: 'blur(10px)'
                          }}
                          placeholder={isGerman ? 'Nachname eingeben' : 'Enter last name'}
                        />
                      </div>
                      {errors.lastName && (
                        <motion.p 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-2 text-sm text-red-400 flex items-center"
                        >
                          <span className="mr-1">❌</span>
                          {errors.lastName}
                        </motion.p>
                      )}
                    </motion.div>
                  </div>

                  {/* Email and Phone - Two Columns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Email */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.9 }}
                    >
                      <label 
                        htmlFor="email" 
                        className="block text-sm font-semibold mb-3"
                        style={{ color: 'var(--theme-text)' }}
                      >
                        📧 E-Mail
                      </label>
                      <div className="relative">
                        <input
                          id="email"
                          name="email"
                          type="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          onInvalid={(e) => {
                            e.target.setCustomValidity(
                              isGerman 
                                ? 'Bitte füllen Sie dieses Feld aus.' 
                                : 'Please fill in this field.'
                            );
                          }}
                          onInput={(e) => e.target.setCustomValidity('')}
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
                          placeholder={isGerman ? 'E-Mail-Adresse eingeben' : 'Enter email address'}
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

                    {/* Phone */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.0 }}
                    >
                      <label 
                        htmlFor="phone" 
                        className="block text-sm font-semibold mb-3"
                        style={{ color: 'var(--theme-text)' }}
                      >
                        📞 {isGerman ? 'Telefonnummer' : 'Phone Number'}
                      </label>
                      <div className="relative">
                        <input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={handleChange}
                          className={`
                            appearance-none relative block w-full px-3 py-3 sm:px-4 sm:py-4 border-2 rounded-xl
                            backdrop-blur-sm transition-all duration-300
                            focus:outline-none focus:ring-4 focus:ring-opacity-30 focus:scale-105 text-sm sm:text-base
                            ${errors.phone ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-gray-300 dark:border-gray-200/30 focus:border-blue-400 focus:ring-blue-400'}
                          `}
                          style={{
                            backgroundColor: 'var(--theme-bg-secondary, rgba(0, 0, 0, 0.05))',
                            borderColor: errors.phone ? '#EF4444' : 'var(--theme-border)',
                            color: 'var(--theme-text)',
                            backdropFilter: 'blur(10px)'
                          }}
                          placeholder={isGerman ? 'Telefonnummer eingeben' : 'Enter phone number'}
                        />
                      </div>
                      {errors.phone && (
                        <motion.p 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-2 text-sm text-red-400 flex items-center"
                        >
                          <span className="mr-1">❌</span>
                          {errors.phone}
                        </motion.p>
                      )}
                    </motion.div>
                  </div>

                  {/* Service Type and Company - Two Columns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Service Type */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.1 }}
                    >
                      <label 
                        htmlFor="pursue" 
                        className="block text-sm font-semibold mb-3"
                        style={{ color: 'var(--theme-text)' }}
                      >
                        🎯 {isGerman ? 'Service-Typen' : 'Service Types'}
                      </label>
                      <div className="relative" ref={serviceDropdownRef}>
                        {/* Dropdown Button */}
                        <button
                          type="button"
                          onClick={() => setIsServiceDropdownOpen(!isServiceDropdownOpen)}
                          disabled={loadingServiceTypes}
                          className={`
                            relative block w-full px-3 py-3 sm:px-4 sm:py-4 border-2 rounded-xl
                            backdrop-blur-sm transition-all duration-300 text-sm sm:text-base
                            focus:outline-none focus:ring-4 focus:ring-opacity-30 focus:scale-105
                            ${errors.pursue ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-gray-300 dark:border-gray-200/30 focus:border-blue-400 focus:ring-blue-400'}
                            ${loadingServiceTypes ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400'}
                            text-left
                          `}
                          style={{
                            backgroundColor: 'var(--theme-bg-secondary, rgba(0, 0, 0, 0.05))',
                            borderColor: errors.pursue ? '#EF4444' : 'var(--theme-border)',
                            color: 'var(--theme-text)',
                            backdropFilter: 'blur(10px)'
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span>
                              {loadingServiceTypes ? (
                                <div className="flex items-center">
                                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                                  {isGerman ? 'Service-Typen laden...' : 'Loading service types...'}
                                </div>
                              ) : formData.pursue.length === 0 ? (
                                <span style={{ color: 'var(--theme-muted)' }}>
                                  {isGerman ? 'Service-Typen auswählen' : 'Select service types'}
                                </span>
                              ) : (
                                <span 
                                  className="truncate block pr-8"
                                  style={{ color: 'var(--theme-text)' }}
                                  title={formData.pursue.map(serviceId => {
                                    const service = serviceTypes.find(s => s.id === serviceId);
                                    return service?.name;
                                  }).filter(Boolean).join(', ')}
                                >
                                  {formData.pursue.length === 1 
                                    ? serviceTypes.find(s => s.id === formData.pursue[0])?.name
                                    : `${formData.pursue.length} ${isGerman ? 'Services ausgewählt' : 'services selected'}`
                                  }
                                </span>
                              )}
                            </span>
                            <svg 
                              className={`w-4 h-4 transition-transform duration-200 ${isServiceDropdownOpen ? 'rotate-180' : ''}`}
                              style={{ color: 'var(--theme-text)' }} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>

                        {/* Dropdown Menu */}
                        {isServiceDropdownOpen && !loadingServiceTypes && serviceTypes.length > 0 && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="absolute z-20 w-full mt-2 rounded-xl border-2 shadow-2xl backdrop-blur-sm"
                            style={{
                              backgroundColor: 'var(--theme-bg-secondary, rgba(0, 0, 0, 0.05))',
                              borderColor: 'var(--theme-border)',
                              backdropFilter: 'blur(10px)',
                              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)'
                            }}
                          >
                            <div className="py-2 max-h-48 overflow-y-auto">
                              {serviceTypes.map((serviceType) => (
                                <motion.label 
                                  key={serviceType.id}
                                  whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                                  className="flex items-center space-x-3 px-4 py-3 cursor-pointer transition-all duration-200 hover:scale-[1.02]"
                                  style={{
                                    borderRadius: '8px',
                                    margin: '2px 8px'
                                  }}
                                >
                                  <input
                                    name="pursue"
                                    type="checkbox"
                                    value={serviceType.id}
                                    checked={formData.pursue.includes(serviceType.id)}
                                    onChange={handleChange}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                                  />
                                  <span 
                                    className="text-sm font-medium flex-1" 
                                    style={{ color: 'var(--theme-text)' }}
                                  >
                                    {serviceType.name}
                                  </span>
                                  {formData.pursue.includes(serviceType.id) && (
                                    <motion.span
                                      initial={{ opacity: 0, scale: 0 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      className="text-blue-600 text-sm"
                                    >
                                      ✓
                                    </motion.span>
                                  )}
                                </motion.label>
                              ))}
                            </div>
                            {formData.pursue.length > 0 && (
                              <div 
                                className="border-t px-4 py-2"
                                style={{ 
                                  borderColor: 'var(--theme-border)',
                                  backgroundColor: 'rgba(59, 130, 246, 0.05)'
                                }}
                              >
                                <span className="text-xs font-medium" style={{ color: 'var(--theme-muted)' }}>
                                  {formData.pursue.length} {isGerman ? 'Service(s) ausgewählt' : 'service(s) selected'}
                                </span>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </div>
                      {errors.pursue && (
                        <motion.p 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-2 text-sm text-red-400 flex items-center"
                        >
                          <span className="mr-1">❌</span>
                          {errors.pursue}
                        </motion.p>
                      )}
                    </motion.div>

                    {/* Company Name */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.2 }}
                    >
                      <label 
                        htmlFor="company" 
                        className="block text-sm font-semibold mb-3"
                        style={{ color: 'var(--theme-text)' }}
                      >
                        🏢 {isGerman ? 'Firmenname' : 'Company Name'}
                      </label>
                      <div className="relative">
                        <input
                          id="company"
                          name="company"
                          type="text"
                          required
                          value={formData.company}
                          onChange={handleChange}
                          onInvalid={(e) => {
                            e.target.setCustomValidity(
                              isGerman 
                                ? 'Bitte füllen Sie dieses Feld aus.' 
                                : 'Please fill in this field.'
                            );
                          }}
                          onInput={(e) => e.target.setCustomValidity('')}
                          className={`
                            appearance-none relative block w-full px-3 py-3 sm:px-4 sm:py-4 border-2 rounded-xl
                            backdrop-blur-sm transition-all duration-300
                            focus:outline-none focus:ring-4 focus:ring-opacity-30 focus:scale-105 text-sm sm:text-base
                            ${errors.company ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-gray-300 dark:border-gray-200/30 focus:border-blue-400 focus:ring-blue-400'}
                          `}
                          style={{
                            backgroundColor: 'var(--theme-bg-secondary, rgba(0, 0, 0, 0.05))',
                            borderColor: errors.company ? '#EF4444' : 'var(--theme-border)',
                            color: 'var(--theme-text)',
                            backdropFilter: 'blur(10px)'
                          }}
                          placeholder={isGerman ? 'Firmenname eingeben' : 'Enter company name'}
                        />
                      </div>
                      {errors.company && (
                        <motion.p 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-2 text-sm text-red-400 flex items-center"
                        >
                          <span className="mr-1">❌</span>
                          {errors.company}
                        </motion.p>
                      )}
                    </motion.div>
                  </div>

                  {/* Address and Postcode City - Two Columns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Address */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.3 }}
                    >
                      <label 
                        htmlFor="address" 
                        className="block text-sm font-semibold mb-3"
                        style={{ color: 'var(--theme-text)' }}
                      >
                        📍 {isGerman ? 'Adresse' : 'Address'}
                      </label>
                      <div className="relative">
                        <input
                          id="address"
                          name="address"
                          type="text"
                          required
                          value={formData.address}
                          onChange={handleChange}
                          onInvalid={(e) => {
                            e.target.setCustomValidity(
                              isGerman 
                                ? 'Bitte füllen Sie dieses Feld aus.' 
                                : 'Please fill in this field.'
                            );
                          }}
                          onInput={(e) => e.target.setCustomValidity('')}
                          className={`
                            appearance-none relative block w-full px-3 py-3 sm:px-4 sm:py-4 border-2 rounded-xl
                            backdrop-blur-sm transition-all duration-300
                            focus:outline-none focus:ring-4 focus:ring-opacity-30 focus:scale-105 text-sm sm:text-base
                            ${errors.address ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-gray-300 dark:border-gray-200/30 focus:border-blue-400 focus:ring-blue-400'}
                          `}
                          style={{
                            backgroundColor: 'var(--theme-bg-secondary, rgba(0, 0, 0, 0.05))',
                            borderColor: errors.address ? '#EF4444' : 'var(--theme-border)',
                            color: 'var(--theme-text)',
                            backdropFilter: 'blur(10px)'
                          }}
                          placeholder={isGerman ? 'Straße und Hausnummer' : 'Street and house number'}
                        />
                      </div>
                      {errors.address && (
                        <motion.p 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-2 text-sm text-red-400 flex items-center"
                        >
                          <span className="mr-1">❌</span>
                          {errors.address}
                        </motion.p>
                      )}
                    </motion.div>

                    {/* Postcode City */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.4 }}
                    >
                      <label 
                        htmlFor="postcodeCity" 
                        className="block text-sm font-semibold mb-3"
                        style={{ color: 'var(--theme-text)' }}
                      >
                        🏙️ {isGerman ? 'PLZ und Stadt' : 'Postcode and City'}
                      </label>
                      <div className="relative">
                        <input
                          id="postcodeCity"
                          name="postcodeCity"
                          type="text"
                          required
                          value={formData.postcodeCity}
                          onChange={handleChange}
                          onInvalid={(e) => {
                            e.target.setCustomValidity(
                              isGerman 
                                ? 'Bitte füllen Sie dieses Feld aus.' 
                                : 'Please fill in this field.'
                            );
                          }}
                          onInput={(e) => e.target.setCustomValidity('')}
                          className={`
                            appearance-none relative block w-full px-3 py-3 sm:px-4 sm:py-4 border-2 rounded-xl
                            backdrop-blur-sm transition-all duration-300
                            focus:outline-none focus:ring-4 focus:ring-opacity-30 focus:scale-105 text-sm sm:text-base
                            ${errors.postcodeCity ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-gray-300 dark:border-gray-200/30 focus:border-blue-400 focus:ring-blue-400'}
                          `}
                          style={{
                            backgroundColor: 'var(--theme-bg-secondary, rgba(0, 0, 0, 0.05))',
                            borderColor: errors.postcodeCity ? '#EF4444' : 'var(--theme-border)',
                            color: 'var(--theme-text)',
                            backdropFilter: 'blur(10px)'
                          }}
                          placeholder={isGerman ? '10115 Berlin' : '10115 Berlin'}
                        />
                      </div>
                      {errors.postcodeCity && (
                        <motion.p 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-2 text-sm text-red-400 flex items-center"
                        >
                          <span className="mr-1">❌</span>
                          {errors.postcodeCity}
                        </motion.p>
                      )}
                    </motion.div>
                  </div>


                  {/* Privacy Policy Checkbox */}
                  <motion.div 
                    className="flex items-center justify-center mb-4 sm:mb-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 }}
                  >
                    <div className="flex items-start space-x-3">
                      <input
                        id="agreeToTerms"
                        name="agreeToTerms"
                        type="checkbox"
                        required
                        checked={formData.agreeToTerms}
                        onChange={handleChange}
                        onInvalid={(e) => {
                          e.target.setCustomValidity(
                            isGerman 
                              ? 'Bitte kreuzen Sie dieses Kästchen an, wenn Sie fortfahren möchten.' 
                              : 'Please tick this box if you want to proceed.'
                          );
                        }}
                        onInput={(e) => e.target.setCustomValidity('')}
                        className={`mt-1 h-4 w-4 rounded focus:ring-blue-500 ${
                          errors.agreeToTerms 
                            ? 'border-red-400 text-red-600' 
                            : 'border-gray-300 text-blue-600'
                        }`}
                      />
                      <div className="flex-1">
                        <label htmlFor="agreeToTerms" className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                          {isGerman 
                            ? 'Datenschutzerklärung und AGB akzeptieren *'
                            : 'Accept privacy policy and terms *'
                          }
                        </label>
                        {errors.agreeToTerms && (
                          <motion.p 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-1 text-sm text-red-400 flex items-center"
                          >
                            <span className="mr-1">❌</span>
                            {errors.agreeToTerms}
                          </motion.p>
                        )}
                      </div>
                    </div>
                  </motion.div>

                  {/* Submit Button */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.6 }}
                  >
                    <motion.button
                      type="submit"
                      disabled={isSubmitting}
                      className={`
                        group relative w-full flex justify-center py-3 px-4 sm:py-4 sm:px-6 border-0 
                        text-sm sm:text-base font-bold rounded-xl text-white focus:outline-none focus:ring-4 
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
                          <span>{isGerman ? 'Partner-Registrierung läuft...' : 'Registering partner...'}</span>
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
                          <span>{isGerman ? 'Als Partner registrieren' : 'Register as Partner'}</span>
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

                  {/* Back to Login Link */}
                  <motion.div 
                    className="text-center mt-6 pt-4 sm:mt-8 sm:pt-6 border-t border-gray-200/20"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.6 }}
                  >
                    <span className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                      {isGerman ? 'Bereits registriert?' : 'Already registered?'}{' '}
                      <Link 
                        href="/auth/login" 
                        className="font-semibold transition-all duration-200 hover:underline bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
                      >
                        {isGerman ? 'Anmelden' : 'Sign In'}
                      </Link>
                    </span>
                  </motion.div>
                </form>
              </div>
            </motion.div>

            {/* Mobile Benefits Section - Only visible on mobile */}
            <motion.div
              className="lg:hidden mt-4 p-3 sm:p-4 rounded-xl border backdrop-blur-sm"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderColor: 'var(--theme-border)'
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <div className="text-center">
                <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {isGerman ? 'Partner-Vorteile' : 'Partner Benefits'}
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  {[
                    {
                      icon: '🎯',
                      title: isGerman ? 'Qualifizierte Leads' : 'Qualified Leads'
                    },
                    {
                      icon: '💰',
                      title: isGerman ? 'Mehr Umsatz' : 'More Revenue'
                    },
                    {
                      icon: '⚡',
                      title: isGerman ? 'Sofort-Updates' : 'Instant Updates'
                    }
                  ].map((benefit, index) => (
                    <div
                      key={index}
                      className="flex flex-col items-center p-2 rounded-lg border border-white/10 bg-white/5"
                    >
                      <div className="text-2xl mb-2">{benefit.icon}</div>
                      <div className="text-sm font-medium text-center" style={{ color: 'var(--theme-text)' }}>
                        {benefit.title}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center items-center space-x-4 text-sm">
                  <span className="font-bold text-green-400">27K+ {isGerman ? 'Umzüge' : 'Moves'}</span>
                  <span className="font-bold text-blue-400">86+ {isGerman ? 'Partner' : 'Partners'}</span>
                  <span className="font-bold text-purple-400">4.9★ {isGerman ? 'Bewertung' : 'Rating'}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Right Side - Partner Benefits - Mobile Hidden, Desktop Visible */}
        <div className="hidden lg:block relative lg:w-0 lg:flex-1 lg:overflow-y-auto">
          <motion.div 
            className="h-full w-full flex items-center justify-center backdrop-blur-xl py-8"
            style={{ 
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(59, 130, 246, 0.1) 50%, rgba(168, 85, 247, 0.1) 100%)',
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

            <div className="text-center p-4 sm:p-6 max-w-md relative z-10">
              <motion.div 
                className="text-5xl mb-6 relative"
                animate={{ 
                  scale: [1, 1.05, 1]
                }}
                transition={{ 
                  duration: 4, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                🤝
              </motion.div>
              
              <motion.h3 
                className="text-3xl font-bold mb-4 bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 bg-clip-text text-transparent"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                {isGerman ? 'Partner-Vorteile' : 'Partner Benefits'}
              </motion.h3>
              
              <motion.p 
                className="text-lg mb-6 leading-relaxed" 
                style={{ color: 'var(--theme-muted)' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                {isGerman 
                  ? 'Steigern Sie Ihren Umsatz mit qualifizierten Leads aus unserem Netzwerk.'
                  : 'Increase your revenue with qualified leads from our network.'
                }
              </motion.p>

              {/* Benefits */}
              <div className="space-y-3 mb-6">
                {[
                  {
                    icon: '🎯',
                    title: isGerman ? 'Qualifizierte Leads' : 'Qualified Leads',
                    desc: isGerman ? 'Nur echte Kundenanfragen' : 'Only genuine customer inquiries'
                  },
                  {
                    icon: '💰',
                    title: isGerman ? 'Mehr Umsatz' : 'More Revenue',
                    desc: isGerman ? 'Bis zu 30% mehr Aufträge' : 'Up to 30% more orders'
                  },
                  {
                    icon: '⚡',
                    title: isGerman ? 'Sofort-Updates' : 'Instant Updates',
                    desc: isGerman ? 'Neue Leads in Echtzeit' : 'New leads in real-time'
                  }
                ].map((benefit, index) => (
                  <motion.div
                    key={index}
                    className="flex items-center space-x-3 p-2 rounded-lg backdrop-blur-sm border border-white/10 bg-white/5"
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.7 + index * 0.15 }}
                    whileHover={{ x: 5, scale: 1.02 }}
                  >
                    <div className="text-xl">
                      {benefit.icon}
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-base" style={{ color: 'var(--theme-text)' }}>
                        {benefit.title}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--theme-muted)' }}>
                        {benefit.desc}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: '27K+', label: isGerman ? 'Umzüge' : 'Moves', delay: 0.8 },
                  { value: '86+', label: isGerman ? 'Partner' : 'Partners', delay: 0.9 },
                  { value: '4.9★', label: isGerman ? 'Bewertung' : 'Rating', delay: 1.0 }
                ].map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    className="p-2 rounded-lg backdrop-blur-sm bg-gradient-to-br from-white/10 to-white/5 border border-white/20"
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
                    <div className="font-bold text-lg bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                      {stat.value}
                    </div>
                    <div className="text-xs mt-1 font-medium" style={{ color: 'var(--theme-muted)' }}>
                      {stat.label}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Trust Badge */}
              <motion.div
                className="mt-6 p-3 rounded-lg bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2 }}
              >
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-sm">✅</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                    {isGerman ? 'Geprüfte Partner • SSL-gesichert' : 'Verified Partners • SSL Secured'}
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