import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { getFormConfig } from '../lib/formConfig';

export const useMultiStepForm = (formType) => {
  const { language } = useLanguage();
  const [formConfig, setFormConfig] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationProgress, setValidationProgress] = useState(0);

  useEffect(() => {
    try {
      const config = getFormConfig(formType);
      setFormConfig(config);
    } catch (error) {
      console.error('Failed to load form config:', error);
    }
  }, [formType]);

  const currentStep = formConfig?.steps[currentStepIndex];
  const totalSteps = formConfig?.steps.length || 0;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  const updateFormData = (stepId, data) => {
    setFormData(prev => ({
      ...prev,
      [stepId]: data
    }));
  };

  const clearErrors = (stepId) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[stepId];
      return newErrors;
    });
  };

  const getErrorMessage = useCallback((key, context = {}) => {
    const errorMessages = {
      en: {
        required: 'This field is required',
        email: 'Please enter a valid email address',
        phone: 'Please enter a valid phone number',
        maxLength: `Maximum ${context.maxLength || 'X'} characters allowed`,
        minLength: `Minimum ${context.minLength || 'X'} characters required`,
        pattern: 'Please enter a valid format',
        selection: 'Please make a selection',
        checkbox: 'Please select at least one option'
      },
      de: {
        required: 'Dieses Feld ist erforderlich',
        email: 'Bitte geben Sie eine gültige E-Mail-Adresse ein',
        phone: 'Bitte geben Sie eine gültige Telefonnummer ein',
        maxLength: `Maximal ${context.maxLength || 'X'} Zeichen erlaubt`,
        minLength: `Mindestens ${context.minLength || 'X'} Zeichen erforderlich`,
        pattern: 'Bitte geben Sie ein gültiges Format ein',
        selection: 'Bitte treffen Sie eine Auswahl',
        checkbox: 'Bitte wählen Sie mindestens eine Option aus'
      }
    };

    return errorMessages[language]?.[key] || errorMessages.en[key] || key;
  }, [language]);

  const validateStep = useCallback((step, data) => {
    const stepErrors = {};

    if (!step) return stepErrors;

    // Validate based on step type
    switch (step.type) {
      case 'radio':
        if (step.required && !data) {
          stepErrors.selection = getErrorMessage('selection');
        }
        break;

      case 'checkbox':
        if (step.required && (!data || Object.keys(data).length === 0)) {
          stepErrors.selection = getErrorMessage('checkbox');
        }
        // Check required checkboxes
        if (data && step.options) {
          step.options.forEach(option => {
            if (option.required && !data[option.id]) {
              stepErrors[option.id] = getErrorMessage('required');
            }
          });
        }
        break;

      case 'fields':
        if (step.fields) {
          step.fields.forEach(field => {
            const fieldValue = data?.[field.id];
            
            if (field.required && (!fieldValue || fieldValue.trim() === '')) {
              stepErrors[field.id] = getErrorMessage('required');
            }
            
            if (fieldValue) {
              // Email validation
              if (field.type === 'email') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(fieldValue)) {
                  stepErrors[field.id] = getErrorMessage('email');
                }
              }
              
              // Phone validation
              if (field.type === 'tel') {
                const phoneRegex = /^[\+]?[\s\-\(\)]*([0-9][\s\-\(\)]*){6,}$/;
                if (!phoneRegex.test(fieldValue)) {
                  stepErrors[field.id] = getErrorMessage('phone');
                }
              }
              
              // Pattern validation
              if (field.pattern && !field.pattern.test(fieldValue)) {
                stepErrors[field.id] = getErrorMessage('pattern');
              }
              
              // Length validation
              if (field.maxLength && fieldValue.length > field.maxLength) {
                stepErrors[field.id] = getErrorMessage('maxLength', { maxLength: field.maxLength });
              }
              
              if (field.minLength && fieldValue.length < field.minLength) {
                stepErrors[field.id] = getErrorMessage('minLength', { minLength: field.minLength });
              }
            }

            // Handle grouped fields
            if (field.type === 'group' && field.fields) {
              const groupData = data?.[field.id] || {};
              field.fields.forEach(groupField => {
                const groupFieldValue = groupData[groupField.id];
                
                if (groupField.required && (!groupFieldValue || groupFieldValue.trim() === '')) {
                  stepErrors[`${field.id}.${groupField.id}`] = getErrorMessage('required');
                }
                
                if (groupFieldValue) {
                  if (groupField.type === 'email') {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(groupFieldValue)) {
                      stepErrors[`${field.id}.${groupField.id}`] = getErrorMessage('email');
                    }
                  }
                  
                  if (groupField.type === 'tel') {
                    const phoneRegex = /^[\+]?[\s\-\(\)]*([0-9][\s\-\(\)]*){6,}$/;
                    if (!phoneRegex.test(groupFieldValue)) {
                      stepErrors[`${field.id}.${groupField.id}`] = getErrorMessage('phone');
                    }
                  }
                  
                  if (groupField.pattern && !groupField.pattern.test(groupFieldValue)) {
                    stepErrors[`${field.id}.${groupField.id}`] = getErrorMessage('pattern');
                  }
                }
              });
            }
          });
        }
        break;
    }

    return stepErrors;
  }, [language, getErrorMessage]);

  const validateStepWithProgress = async (step, data) => {
    setIsValidating(true);
    setValidationProgress(0);
    
    // Simulate validation progress for better UX
    const progressSteps = [20, 40, 60, 80, 100];
    for (const progress of progressSteps) {
      setValidationProgress(progress);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const stepErrors = validateStep(step, data);
    
    setIsValidating(false);
    setValidationProgress(0);
    
    return stepErrors;
  };

  const goToNext = async () => {
    if (!currentStep) return false;

    const stepData = formData[currentStep.id];
    const stepErrors = await validateStepWithProgress(currentStep, stepData);

    if (Object.keys(stepErrors).length > 0) {
      setErrors(prev => ({
        ...prev,
        [currentStep.id]: stepErrors
      }));
      
      // Add shake animation trigger
      setTimeout(() => {
        const errorElements = document.querySelectorAll('.animate-shake, [class*="border-red"]');
        errorElements.forEach(el => {
          el.classList.add('validation-error-flash');
          setTimeout(() => el.classList.remove('validation-error-flash'), 600);
        });
      }, 100);
      
      return false;
    }

    clearErrors(currentStep.id);
    
    if (!isLastStep) {
      setCurrentStepIndex(prev => prev + 1);
    }
    
    return true;
  };

  const goToPrevious = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const goToStep = (stepIndex) => {
    if (stepIndex >= 0 && stepIndex < totalSteps) {
      setCurrentStepIndex(stepIndex);
    }
  };

  const resetForm = () => {
    setCurrentStepIndex(0);
    setFormData({});
    setErrors({});
    setIsSubmitting(false);
  };

  const submitForm = async (onSubmit) => {
    if (!onSubmit || typeof onSubmit !== 'function') {
      throw new Error('onSubmit callback is required');
    }

    setIsSubmitting(true);

    try {
      const result = await onSubmit(formData);
      return result;
    } catch (error) {
      console.error('Form submission error:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProgress = () => {
    return {
      current: currentStepIndex + 1,
      total: totalSteps,
      percentage: ((currentStepIndex + 1) / totalSteps) * 100
    };
  };

  const getStepTitle = (step) => {
    if (!step) return '';
    return step.title[language] || step.title.en || step.title;
  };

  const getStepDescription = (step) => {
    if (!step) return '';
    return step.description[language] || step.description.en || step.description;
  };

  const getOptionLabel = (option) => {
    if (!option) return '';
    return option.label[language] || option.label.en || option.label;
  };

  const getOptionDescription = (option) => {
    if (!option) return '';
    return option.description?.[language] || option.description?.en || option.description;
  };

  return {
    // Form config
    formConfig,
    
    // Current state
    currentStep,
    currentStepIndex,
    totalSteps,
    isFirstStep,
    isLastStep,
    
    // Form data
    formData,
    updateFormData,
    
    // Errors
    errors,
    clearErrors,
    
    // Navigation
    goToNext,
    goToPrevious,
    goToStep,
    
    // Utilities
    resetForm,
    submitForm,
    getProgress,
    validateStep,
    
    // Localization helpers
    getStepTitle,
    getStepDescription,
    getOptionLabel,
    getOptionDescription,
    
    // Status
    isSubmitting,
    isValidating,
    validationProgress,
    
    // Enhanced validation
    getErrorMessage,
    validateStepWithProgress
  };
};