import React, { useState, useEffect } from 'react';
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
import { toast } from 'react-hot-toast';

// Import step components
import RadioStep from './steps/RadioStep';
import CheckboxStep from './steps/CheckboxStep';
import FormFieldsStep from './steps/FormFieldsStep';

const EnhancedMultiStepForm = ({ formType }) => {
  const { t, isGerman } = useLanguage();
  const { mounted, isDark } = useTheme();
  const [showSummary, setShowSummary] = useState(false);
  
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
    isSubmitting,
    isValidating,
    validationProgress
  } = useMultiStepForm(formType);

  const handleStepChange = (stepData) => {
    if (currentStep) {
      updateFormData(currentStep.id, stepData);
    }
  };

  const handleNext = async () => {
    const success = await goToNext();
    if (success && isLastStep) {
      setShowSummary(true);
    }
  };

  const handleSubmit = async () => {
    try {
      const leadData = {
        serviceType: formType,
        formData: formData,
        timestamp: new Date().toISOString(),
        source: 'website_form_enhanced'
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
        <motion.div 
          className="flex flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <motion.p 
            className="mt-4 text-lg"
            style={{ color: 'var(--theme-muted)' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {isGerman ? 'Formular wird geladen...' : 'Loading form...'}
          </motion.p>
        </motion.div>
      </div>
    );
  }

  const getFormTitle = () => {
    return formConfig.title?.[isGerman ? 'de' : 'en'] || formConfig.title;
  };

  const getFormDescription = () => {
    return formConfig.description?.[isGerman ? 'de' : 'en'] || formConfig.description;
  };

  const progress = getProgress();

  return (
    <>
      <Head>
        <title>{getFormTitle()} - Umzug Anbieter Vergleich</title>
        <meta name="description" content={getFormDescription()} />
      </Head>

      <div 
        className="min-h-screen transition-all duration-500 relative overflow-hidden"
        style={{ 
          backgroundColor: 'var(--theme-bg)',
          color: 'var(--theme-text)'
        }}
      >
        {/* Animated Background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -inset-10 opacity-10">
            <motion.div 
              className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl"
              animate={{ 
                x: [0, 100, 0],
                y: [0, -100, 0],
                scale: [1, 1.2, 1]
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            />
            <motion.div 
              className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl"
              animate={{ 
                x: [0, -100, 0],
                y: [0, 100, 0],
                scale: [1.2, 1, 1.2]
              }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            />
            <motion.div 
              className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-green-500 rounded-full mix-blend-multiply filter blur-xl"
              animate={{ 
                x: [0, -50, 0],
                y: [0, -50, 0],
                scale: [1, 1.3, 1]
              }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            />
          </div>
        </div>

        {/* Header */}
        <motion.header 
          className="relative z-10 backdrop-blur-lg border-b"
          style={{ 
            borderColor: 'var(--theme-border)', 
            backgroundColor: 'rgba(var(--theme-card-bg-rgb), 0.8)' 
          }}
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              {/* Logo and Progress */}
              <div className="flex items-center space-x-6">
                <Link href="/" className="hover:opacity-75 transition-opacity">
                  <Image src={isDark ? "/logo-dark.svg" : "/logo-light.svg"} alt="Umzug Anbieter Vergleich" width={160} height={45} priority />
                </Link>
                
                <div className="flex items-center space-x-2 md:space-x-4">
                  <div className="text-xs md:text-sm font-medium" style={{ color: 'var(--theme-muted)' }}>
                    {progress.current}/{progress.total}
                  </div>
                  <div className="w-16 md:w-32 h-2 bg-gray-200 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
                    <motion.div 
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress.percentage}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                  <div className="text-xs md:text-sm font-bold" style={{ color: 'var(--theme-text)' }}>
                    {Math.round(progress.percentage)}%
                  </div>
                </div>
              </div>

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
        </motion.header>

        {/* Main Form Container */}
        <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Form Header */}
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <motion.h1 
              className="text-4xl sm:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              {getFormTitle()}
            </motion.h1>
            
            <motion.p 
              className="text-xl max-w-2xl mx-auto"
              style={{ color: 'var(--theme-muted)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              {getFormDescription()}
            </motion.p>
          </motion.div>

          {/* Enhanced Progress Indicator */}
          <motion.div 
            className="mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className="flex items-center justify-center mb-8 px-4">
              <div className="flex items-center space-x-1 md:space-x-4 overflow-x-auto pb-4 max-w-full">
                {formConfig.steps.map((step, index) => {
                  const isActive = index === currentStepIndex;
                  const isCompleted = index < currentStepIndex;
                  const isClickable = index <= currentStepIndex;

                  return (
                    <div key={step.id} className="flex items-center">
                      <motion.button
                        onClick={isClickable ? () => goToStep(index) : undefined}
                        disabled={!isClickable}
                        className={`
                          relative w-8 h-8 md:w-12 md:h-12 rounded-full border-2 md:border-3 flex items-center justify-center font-bold text-xs md:text-sm transition-all duration-300
                          ${isClickable ? 'cursor-pointer' : 'cursor-default'}
                        `}
                        style={{
                          backgroundColor: isActive 
                            ? 'var(--theme-button-bg)' 
                            : isCompleted 
                            ? '#10B981' 
                            : 'var(--theme-card-bg)',
                          color: isActive || isCompleted 
                            ? 'white' 
                            : 'var(--theme-muted)',
                          borderColor: isActive 
                            ? 'var(--theme-button-bg)' 
                            : isCompleted 
                            ? '#10B981' 
                            : 'var(--theme-border)',
                        }}
                        whileHover={isClickable ? { scale: 1.1 } : {}}
                        whileTap={isClickable ? { scale: 0.95 } : {}}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        {isCompleted ? (
                          <motion.svg 
                            className="w-3 h-3 md:w-6 md:h-6" 
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, delay: 0.2 }}
                          >
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </motion.svg>
                        ) : (
                          <span>{index + 1}</span>
                        )}
                        
                        {/* Active pulse effect */}
                        {isActive && (
                          <motion.div
                            className="absolute inset-0 rounded-full border-3"
                            style={{ borderColor: 'var(--theme-button-bg)' }}
                            animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0, 0.8] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        )}
                      </motion.button>

                      {/* Connector Line */}
                      {index < formConfig.steps.length - 1 && (
                        <motion.div 
                          className="w-4 md:w-16 h-0.5 md:h-1 mx-1 md:mx-2 rounded-full transition-all duration-500"
                          style={{ 
                            backgroundColor: isCompleted ? '#10B981' : 'var(--theme-border)' 
                          }}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Form Step Content */}
          <motion.div
            className="backdrop-blur-lg rounded-3xl p-8 md:p-12 border-2 shadow-2xl"
            style={{
              backgroundColor: 'rgba(var(--theme-card-bg-rgb), 0.8)',
              borderColor: 'var(--theme-border)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <AnimatePresence mode="wait">
              {showSummary ? (
                <FormSummary
                  key="summary"
                  formData={formData}
                  formConfig={formConfig}
                  onSubmit={handleSubmit}
                  onBack={() => setShowSummary(false)}
                  isSubmitting={isSubmitting}
                />
              ) : (
                <EnhancedFormStep
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
              )}
            </AnimatePresence>
          </motion.div>
        </main>

        {/* Floating Help Button */}
        <motion.button
          className="fixed bottom-4 right-4 md:bottom-8 md:right-8 w-12 h-12 md:w-14 md:h-14 bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center text-xl md:text-2xl z-50"
          whileHover={{ 
            scale: 1.1,
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            y: -2
          }}
          whileTap={{ scale: 0.9 }}
          initial={{ scale: 0, opacity: 0, y: 100 }}
          animate={{ 
            scale: 1, 
            opacity: 1, 
            y: 0,
            rotate: [0, 10, -10, 0]
          }}
          transition={{ 
            delay: 1, 
            type: "spring", 
            stiffness: 500,
            rotate: { duration: 2, repeat: Infinity, repeatDelay: 3 }
          }}
        >
          💬
        </motion.button>

        {/* Success Particles */}
        {mounted && (
          <motion.div
            className="fixed inset-0 pointer-events-none z-40"
            initial={{ opacity: 0 }}
          >
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-blue-400 rounded-full"
                initial={{ 
                  opacity: 0, 
                  scale: 0,
                  x: typeof window !== 'undefined' ? Math.random() * window.innerWidth : Math.random() * 1000,
                  y: typeof window !== 'undefined' ? Math.random() * window.innerHeight : Math.random() * 1000
                }}
                animate={{ 
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                  y: [0, -100],
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  delay: i * 0.5,
                  repeatDelay: 2
                }}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* Global Validation Styles */}
      <style jsx global>{`
        .validation-error-flash {
          animation: errorFlash 0.6s ease-out;
        }
        
        @keyframes errorFlash {
          0% { 
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
            border-color: #EF4444;
          }
          50% { 
            box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
            border-color: #DC2626;
          }
          100% { 
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
            border-color: #EF4444;
          }
        }
      `}</style>
    </>
  );
};

// Enhanced Form Step Component
const EnhancedFormStep = ({ 
  step, 
  data, 
  errors, 
  onChange, 
  onNext, 
  onPrevious, 
  isFirstStep, 
  isLastStep,
  isSubmitting 
}) => {
  const { language, t } = useLanguage();

  if (!step) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p style={{ color: 'var(--theme-muted)' }}>Loading...</p>
      </div>
    );
  }

  const getStepTitle = () => {
    return step.title?.[language] || step.title?.en || step.title;
  };

  const getStepDescription = () => {
    return step.description?.[language] || step.description?.en || step.description;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full max-w-4xl mx-auto"
    >
      {/* Step Header */}
      <div className="text-center mb-8">
        <motion.h2 
          className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 px-4 text-center"
          style={{ color: 'var(--theme-text)' }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {getStepTitle()}
        </motion.h2>
        
        {getStepDescription() && (
          <motion.p 
            className="text-base md:text-lg lg:text-xl max-w-2xl mx-auto px-4 text-center"
            style={{ color: 'var(--theme-muted)' }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {getStepDescription()}
          </motion.p>
        )}
      </div>

      {/* Step Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mb-8"
      >
        {step.type === 'radio' && (
          <RadioStep 
            step={step}
            data={data}
            errors={errors}
            onChange={onChange}
            language={language}
          />
        )}
        
        {step.type === 'checkbox' && (
          <CheckboxStep 
            step={step}
            data={data}
            errors={errors}
            onChange={onChange}
            language={language}
          />
        )}
        
        {step.type === 'fields' && (
          <FormFieldsStep 
            step={step}
            data={data}
            errors={errors}
            onChange={onChange}
            language={language}
          />
        )}
        
        {/* Additional step types can be added here */}
        {!['radio', 'checkbox', 'fields'].includes(step.type) && (
          <div className="text-center py-8">
            <p style={{ color: 'var(--theme-muted)' }}>
              Unsupported step type: {step.type}
            </p>
          </div>
        )}
      </motion.div>

      {/* Navigation Buttons */}
      <motion.div 
        className="flex flex-col sm:flex-row items-center justify-between pt-8 gap-4 px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <motion.button
          onClick={onPrevious}
          disabled={isFirstStep}
          className={`
            flex items-center justify-center px-4 py-3 md:px-6 md:py-4 rounded-full font-semibold transition-all duration-300 border-2 w-full sm:w-auto order-2 sm:order-1
            ${isFirstStep 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:scale-105 hover:shadow-lg'
            }
          `}
          style={{
            backgroundColor: 'transparent',
            color: 'var(--theme-text)',
            borderColor: 'var(--theme-border)'
          }}
          whileHover={!isFirstStep ? { scale: 1.05 } : {}}
          whileTap={!isFirstStep ? { scale: 0.95 } : {}}
        >
          <svg className="w-4 h-4 md:w-5 md:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('forms.back')}
        </motion.button>

        <motion.button
          onClick={onNext}
          disabled={isSubmitting || isValidating}
          className={`
            flex items-center justify-center px-6 py-3 md:px-8 md:py-4 rounded-full font-semibold transition-all duration-300 w-full sm:w-auto order-1 sm:order-2 relative overflow-hidden
            ${(isSubmitting || isValidating)
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:scale-105 hover:shadow-xl'
            }
          `}
          style={{
            backgroundColor: 'var(--theme-button-bg)',
            color: 'var(--theme-button-text)'
          }}
          whileHover={!(isSubmitting || isValidating) ? { scale: 1.05 } : {}}
          whileTap={!(isSubmitting || isValidating) ? { scale: 0.95 } : {}}
        >
          {/* Validation Progress Bar */}
          {isValidating && (
            <motion.div
              className="absolute bottom-0 left-0 h-1 bg-white bg-opacity-40 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${validationProgress}%` }}
              transition={{ duration: 0.1 }}
            />
          )}
          
          {isSubmitting ? (
            <>
              <motion.div
                className="w-4 h-4 md:w-5 md:h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              {t('forms.submitting')}
            </>
          ) : isValidating ? (
            <>
              <motion.div
                className="w-4 h-4 md:w-5 md:h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              />
              {isGerman ? 'Validiert...' : 'Validating...'}
            </>
          ) : (
            <>
              {isLastStep ? t('forms.submit') : t('forms.next')}
              <motion.svg 
                className="w-4 h-4 md:w-5 md:h-5 ml-2" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                whileHover={{ x: 2 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </motion.svg>
            </>
          )}
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

// Form Summary Component
const FormSummary = ({ formData, formConfig, onSubmit, onBack, isSubmitting }) => {
  const { t, isGerman } = useLanguage();

  const renderSummarySection = (step, stepData) => {
    if (!stepData || (typeof stepData === 'object' && Object.keys(stepData).length === 0)) {
      return null;
    }

    const getStepTitle = () => {
      return step.title?.[isGerman ? 'de' : 'en'] || step.title?.en || step.title;
    };

    const formatValue = (value, step) => {
      if (step.type === 'radio') {
        const option = step.options?.find(opt => opt.id === value);
        return option?.label?.[isGerman ? 'de' : 'en'] || option?.label?.en || value;
      } else if (step.type === 'checkbox') {
        const selectedOptions = Object.keys(value || {}).map(optionId => {
          const option = step.options?.find(opt => opt.id === optionId);
          return option?.label?.[isGerman ? 'de' : 'en'] || option?.label?.en || optionId;
        });
        return selectedOptions.join(', ');
      } else if (typeof value === 'object') {
        return Object.entries(value).map(([key, val]) => {
          if (typeof val === 'object') {
            return Object.entries(val).map(([subKey, subVal]) => `${subKey}: ${subVal}`).join(', ');
          }
          return `${key}: ${val}`;
        }).join(' | ');
      }
      return value?.toString() || '';
    };

    return (
      <motion.div
        key={step.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="p-4 rounded-xl border-2 mb-4"
        style={{
          backgroundColor: 'var(--theme-card-bg)',
          borderColor: 'var(--theme-border)'
        }}
      >
        <h4 className="font-bold text-lg mb-2" style={{ color: 'var(--theme-text)' }}>
          {getStepTitle()}
        </h4>
        <p className="text-sm break-words" style={{ color: 'var(--theme-muted)' }}>
          {formatValue(stepData, step)}
        </p>
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto"
    >
      {/* Header */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <div className="text-6xl mb-4">✨</div>
        <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--theme-text)' }}>
          {isGerman ? 'Zusammenfassung Ihrer Anfrage' : 'Summary of Your Request'}
        </h2>
        <p className="text-lg" style={{ color: 'var(--theme-muted)' }}>
          {isGerman 
            ? 'Überprüfen Sie Ihre Angaben bevor Sie die Anfrage absenden'
            : 'Review your information before submitting your request'
          }
        </p>
      </motion.div>
      
      {/* Service Info */}
      <motion.div
        className="mb-8 p-6 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 border-2"
        style={{ 
          backgroundColor: 'var(--theme-bg-secondary)',
          borderColor: 'var(--theme-border)'
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="flex items-center mb-4">
          <div className="text-4xl mr-4">
            {formConfig.icon || (formConfig.title?.includes('moving') || formConfig.title?.includes('Umzug') ? '🚛' : '🧽')}
          </div>
          <div>
            <h3 className="text-2xl font-bold" style={{ color: 'var(--theme-text)' }}>
              {formConfig.title?.[isGerman ? 'de' : 'en'] || formConfig.title}
            </h3>
            <p style={{ color: 'var(--theme-muted)' }}>
              {formConfig.description?.[isGerman ? 'de' : 'en'] || formConfig.description}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--theme-card-bg)' }}>
            <div className="text-2xl mb-1">⏱️</div>
            <div className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
              {isGerman ? '24h Antwort' : '24h Response'}
            </div>
          </div>
          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--theme-card-bg)' }}>
            <div className="text-2xl mb-1">💰</div>
            <div className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
              {isGerman ? 'Kostenlos' : 'Free Quotes'}
            </div>
          </div>
          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--theme-card-bg)' }}>
            <div className="text-2xl mb-1">✅</div>
            <div className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
              {isGerman ? 'Geprüft' : 'Verified'}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Form Data Summary */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <h3 className="text-xl font-bold mb-6 text-center" style={{ color: 'var(--theme-text)' }}>
          {isGerman ? 'Ihre Angaben:' : 'Your Information:'}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {formConfig.steps?.map(step => {
            const stepData = formData[step.id];
            return renderSummarySection(step, stepData);
          }).filter(Boolean)}
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <motion.button
          onClick={onBack}
          className="px-6 py-3 rounded-full font-semibold border-2 transition-all duration-300 w-full sm:w-auto"
          style={{
            borderColor: 'var(--theme-border)',
            color: 'var(--theme-text)',
            backgroundColor: 'transparent'
          }}
          whileHover={{ scale: 1.05, borderColor: 'var(--theme-button-bg)' }}
          whileTap={{ scale: 0.95 }}
        >
          ✏️ {isGerman ? 'Bearbeiten' : 'Edit'}
        </motion.button>

        <motion.button
          onClick={onSubmit}
          disabled={isSubmitting}
          className={`
            px-8 py-4 rounded-full font-bold transition-all duration-300 w-full sm:w-auto text-lg
            ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:shadow-xl'}
          `}
          style={{
            backgroundColor: 'var(--theme-button-bg)',
            color: 'var(--theme-button-text)',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
          }}
          whileHover={!isSubmitting ? { 
            scale: 1.05, 
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)' 
          } : {}}
          whileTap={!isSubmitting ? { scale: 0.95 } : {}}
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center">
              <motion.div
                className="w-6 h-6 border-3 border-white border-t-transparent rounded-full mr-3"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              {isGerman ? 'Wird gesendet...' : 'Submitting...'}
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <motion.span
                className="mr-2"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                🚀
              </motion.span>
              {isGerman ? 'Kostenlose Angebote anfordern' : 'Request Free Quotes'}
            </div>
          )}
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default EnhancedMultiStepForm;