import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import RadioStep from './steps/RadioStep';
import CheckboxStep from './steps/CheckboxStep';
import FormFieldsStep from './steps/FormFieldsStep';

const FormStep = ({ 
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
  const { language } = useLanguage();

  if (!step) {
    return (
      <div className="text-center py-12">
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

  const renderStepContent = () => {
    switch (step.type) {
      case 'radio':
        return (
          <RadioStep
            step={step}
            data={data}
            errors={errors}
            onChange={onChange}
            language={language}
          />
        );

      case 'checkbox':
        return (
          <CheckboxStep
            step={step}
            data={data}
            errors={errors}
            onChange={onChange}
            language={language}
          />
        );

      case 'form':
        return (
          <FormFieldsStep
            step={step}
            data={data}
            errors={errors}
            onChange={onChange}
            language={language}
          />
        );

      default:
        return (
          <div className="text-center py-8">
            <p style={{ color: 'var(--theme-muted)' }}>
              Unknown step type: {step.type}
            </p>
          </div>
        );
    }
  };

  const handleNext = () => {
    if (onNext) {
      onNext();
    }
  };

  const handlePrevious = () => {
    if (onPrevious) {
      onPrevious();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-2xl mx-auto"
    >
      {/* Step Header */}
      <div className="text-center mb-8">
        <motion.h2 
          className="text-2xl md:text-3xl font-bold mb-4"
          style={{ color: 'var(--theme-text)' }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {getStepTitle()}
        </motion.h2>
        
        {getStepDescription() && (
          <motion.p 
            className="text-lg"
            style={{ color: 'var(--theme-muted)' }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {getStepDescription()}
          </motion.p>
        )}
      </div>

      {/* Step Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mb-8"
      >
        {renderStepContent()}
      </motion.div>

      {/* Navigation Buttons */}
      <motion.div 
        className="flex items-center justify-between pt-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <button
          onClick={handlePrevious}
          disabled={isFirstStep}
          className={`
            px-6 py-3 rounded-lg font-medium transition-all duration-200
            ${isFirstStep 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:opacity-80 hover:scale-105'
            }
          `}
          style={{
            backgroundColor: 'var(--theme-bg-secondary)',
            color: 'var(--theme-text)',
            border: '2px solid var(--theme-border)'
          }}
        >
          ← Zurück
        </button>

        <button
          onClick={handleNext}
          disabled={isSubmitting}
          className={`
            px-8 py-3 rounded-lg font-medium transition-all duration-200
            ${isSubmitting 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:opacity-90 hover:scale-105'
            }
          `}
          style={{
            backgroundColor: 'var(--theme-button-bg)',
            color: 'var(--theme-button-text)'
          }}
        >
          {isSubmitting ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2"></div>
              Wird gesendet...
            </div>
          ) : (
            isLastStep ? 'Angebot anfordern' : 'Weiter →'
          )}
        </button>
      </motion.div>
    </motion.div>
  );
};

export default FormStep;