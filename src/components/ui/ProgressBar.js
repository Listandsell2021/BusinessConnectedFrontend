// Progress Bar Component for Multi-Step Forms
import { motion } from 'framer-motion';

export default function ProgressBar({ 
  currentStep, 
  totalSteps, 
  steps = [],
  className = '' 
}) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className={`w-full ${className}`}>
      {/* Progress Bar */}
      <div className="progress-bar mb-4">
        <motion.div
          className="progress-fill"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />
      </div>
      
      {/* Step Indicators */}
      {steps.length > 0 && (
        <div className="flex justify-between items-center">
          {steps.map((step, index) => (
            <div
              key={index}
              className="flex flex-col items-center"
            >
              <motion.div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all duration-300 ${
                  index < currentStep
                    ? 'border-green-500 bg-green-500 text-white'
                    : index === currentStep
                    ? 'border-theme-text bg-theme-text text-theme-bg'
                    : 'border-theme-border bg-theme-bg text-theme-text'
                }`}
                style={{
                  backgroundColor: index === currentStep ? 'var(--theme-text)' : 
                                  index < currentStep ? '#10b981' : 'var(--theme-bg)',
                  color: index === currentStep ? 'var(--theme-bg)' :
                         index < currentStep ? 'white' : 'var(--theme-text)',
                  borderColor: index < currentStep ? '#10b981' : 'var(--theme-border)'
                }}
                whileHover={{ scale: 1.1 }}
                animate={{ 
                  scale: index === currentStep ? 1.1 : 1,
                }}
              >
                {index < currentStep ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  index + 1
                )}
              </motion.div>
              <span 
                className="text-xs mt-2 text-center max-w-16 leading-tight"
                style={{ color: 'var(--theme-text)' }}
              >
                {step}
              </span>
            </div>
          ))}
        </div>
      )}
      
      {/* Step Counter */}
      <div className="text-center mt-4">
        <span className="text-sm" style={{ color: 'var(--theme-muted)' }}>
          Schritt {currentStep} von {totalSteps}
        </span>
      </div>
    </div>
  );
}