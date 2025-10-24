import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useMultiStepForm } from '../../hooks/useMultiStepForm';
import { leadsAPI } from '../../lib/api/api';
import ThemeToggle from '../ui/ThemeToggle';
import LanguageToggle from '../ui/LanguageToggle';
import FormProgress from './FormProgress';
import FormStep from './FormStep';
import { toast } from 'react-hot-toast';

const MultiStepForm = ({ formType }) => {
  const { t, isGerman } = useLanguage();
  const { mounted, isDark } = useTheme();
  
  const {
    formConfig,
    currentStep,
    currentStepIndex,
    totalSteps,
    isFirstStep,
    isLastStep,
    formData,
    updateFormData,
    errors,
    goToNext,
    goToPrevious,
    goToStep,
    getProgress,
    submitForm,
    isSubmitting
  } = useMultiStepForm(formType);

  const handleStepChange = (stepData) => {
    if (currentStep) {
      updateFormData(currentStep.id, stepData);
    }
  };

  const handleNext = () => {
    const success = goToNext();
    if (success && isLastStep) {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    try {
      const leadData = {
        serviceType: formType,
        formData: formData,
        timestamp: new Date().toISOString(),
        source: 'website_form'
      };

      await submitForm(async (data) => {
        if (formType === 'cleaning') {
          return await leadsAPI.createCleaningLead(leadData);
        } else if (formType === 'moving') {
          return await leadsAPI.createMovingLead(leadData);
        } else {
          return await leadsAPI.create(leadData);
        }
      });

      toast.success(
        isGerman 
          ? 'Ihre Anfrage wurde erfolgreich gesendet!' 
          : 'Your request has been sent successfully!'
      );

      // Redirect to thank you page or show success message
      window.location.href = `/thank-you?service=${formType}`;

    } catch (error) {
      console.error('Form submission error:', error);
      toast.error(
        isGerman 
          ? 'Es gab ein Problem beim Senden Ihrer Anfrage.' 
          : 'There was a problem sending your request.'
      );
    }
  };

  if (!mounted || !formConfig) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--theme-bg)' }}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--theme-text)' }}></div>
      </div>
    );
  }

  const getFormTitle = () => {
    return formConfig.title?.[isGerman ? 'de' : 'en'] || formConfig.title;
  };

  const getFormDescription = () => {
    return formConfig.description?.[isGerman ? 'de' : 'en'] || formConfig.description;
  };

  return (
    <>
      <Head>
        <title>{getFormTitle()} - ProvenHub</title>
        <meta name="description" content={getFormDescription()} />
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
                  <Image src={isDark ? "/blackThemeLogo.svg" : "/logo.png"} alt="ProvenHub" width={140} height={40} priority />
                </Link>
                
                <div className="hidden md:block text-sm" style={{ color: 'var(--theme-muted)' }}>
                  / {getFormTitle()}
                </div>
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

        {/* Main Form Container */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Form Header */}
          <motion.div 
            className="text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <h1 className="text-3xl sm:text-4xl font-bold mb-4">
              {getFormTitle()}
            </h1>
            <p className="text-lg" style={{ color: 'var(--theme-muted)' }}>
              {getFormDescription()}
            </p>
          </motion.div>

          {/* Progress Indicator */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <FormProgress
              current={getProgress().current}
              total={getProgress().total}
              percentage={getProgress().percentage}
              steps={formConfig.steps}
              currentStepIndex={currentStepIndex}
              onStepClick={goToStep}
            />
          </motion.div>

          {/* Form Step */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <AnimatePresence mode="wait">
              <FormStep
                key={currentStep?.id}
                step={currentStep}
                data={formData[currentStep?.id]}
                errors={errors[currentStep?.id]}
                onChange={handleStepChange}
                onNext={handleNext}
                onPrevious={goToPrevious}
                isFirstStep={isFirstStep}
                isLastStep={isLastStep}
                isSubmitting={isSubmitting}
              />
            </AnimatePresence>
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="border-t-2 mt-12" style={{ borderColor: 'var(--theme-border)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="text-sm mb-4 md:mb-0" style={{ color: 'var(--theme-muted)' }}>
                © 2024 ProvenHub. {isGerman ? 'Alle Rechte vorbehalten.' : 'All rights reserved.'}
              </div>
              
              <div className="flex items-center space-x-6 text-sm">
                <Link 
                  href="/privacy" 
                  className="hover:opacity-75 transition-opacity"
                  style={{ color: 'var(--theme-muted)' }}
                >
                  {isGerman ? 'Datenschutz' : 'Privacy Policy'}
                </Link>
                <Link 
                  href="/terms" 
                  className="hover:opacity-75 transition-opacity"
                  style={{ color: 'var(--theme-muted)' }}
                >
                  {isGerman ? 'AGB' : 'Terms of Service'}
                </Link>
                <Link 
                  href="/contact" 
                  className="hover:opacity-75 transition-opacity"
                  style={{ color: 'var(--theme-muted)' }}
                >
                  {isGerman ? 'Kontakt' : 'Contact'}
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default MultiStepForm;