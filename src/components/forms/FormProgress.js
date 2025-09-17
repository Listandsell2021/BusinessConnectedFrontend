import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';

const FormProgress = ({ current, total, percentage, steps, currentStepIndex, onStepClick }) => {
  const { t } = useLanguage();

  return (
    <div className="mb-8">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
            {t('forms.progress')}: {current} / {total}
          </span>
          <span className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
            {Math.round(percentage)}%
          </span>
        </div>
        
        <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: 'var(--theme-button-bg)' }}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Step Indicators */}
      {steps && (
        <div className="flex items-center justify-between overflow-x-auto">
          {steps.map((step, index) => {
            const isActive = index === currentStepIndex;
            const isCompleted = index < currentStepIndex;
            const isClickable = onStepClick && index <= currentStepIndex;

            return (
              <div
                key={step.id}
                className="flex flex-col items-center min-w-0 flex-1"
              >
                {/* Step Circle */}
                <motion.button
                  onClick={isClickable ? () => onStepClick(index) : undefined}
                  disabled={!isClickable}
                  className={`
                    w-8 h-8 rounded-full border-2 flex items-center justify-center mb-2 transition-all duration-300
                    ${isClickable ? 'cursor-pointer hover:scale-110' : 'cursor-default'}
                    ${isActive ? 'border-blue-500 bg-blue-500 text-white' : ''}
                    ${isCompleted ? 'border-green-500 bg-green-500 text-white' : ''}
                    ${!isActive && !isCompleted ? 'border-gray-300 bg-transparent' : ''}
                  `}
                  style={{
                    ...(!isActive && !isCompleted ? {
                      borderColor: 'var(--theme-border)',
                      color: 'var(--theme-muted)'
                    } : {})
                  }}
                  whileHover={isClickable ? { scale: 1.1 } : {}}
                  whileTap={isClickable ? { scale: 0.95 } : {}}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className="text-sm font-bold">{index + 1}</span>
                  )}
                </motion.button>

                {/* Step Label */}
                <span 
                  className={`
                    text-xs text-center truncate max-w-full px-1 transition-colors duration-300
                    ${isActive ? 'font-semibold' : 'font-normal'}
                  `}
                  style={{ 
                    color: isActive ? 'var(--theme-text)' : 'var(--theme-muted)' 
                  }}
                  title={step.title?.de || step.title?.en || step.title}
                >
                  {step.title?.de || step.title?.en || step.title}
                </span>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div 
                    className="h-px w-full mt-2 -mb-2"
                    style={{ 
                      backgroundColor: isCompleted ? 'green' : 'var(--theme-border)',
                      opacity: isCompleted ? 1 : 0.3
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FormProgress;