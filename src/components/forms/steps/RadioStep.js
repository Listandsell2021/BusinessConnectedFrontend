import React from 'react';
import { motion } from 'framer-motion';

const RadioStep = ({ step, data, errors, onChange, language }) => {
  const getOptionLabel = (option) => {
    return option.label?.[language] || option.label?.en || option.label;
  };

  const getOptionDescription = (option) => {
    return option.description?.[language] || option.description?.en || option.description;
  };

  const handleChange = (optionId) => {
    onChange(optionId);
  };

  return (
    <div className="space-y-4">
      {/* Error Message */}
      {errors?.selection && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-lg border border-red-500 bg-red-50 text-red-700 text-sm"
        >
          {errors.selection}
        </motion.div>
      )}

      {/* Options */}
      <div className="grid grid-cols-1 gap-4">
        {step.options?.map((option, index) => {
          const isSelected = data === option.id;
          
          return (
            <motion.button
              key={option.id}
              onClick={() => handleChange(option.id)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -2, rotateY: 2 }}
              whileTap={{ scale: 0.98 }}
              className={`
                p-6 rounded-xl border-2 text-left transition-all duration-300 relative overflow-hidden
                ${isSelected 
                  ? 'shadow-lg' 
                  : 'hover:shadow-md'
                }
              `}
              style={{
                backgroundColor: isSelected ? 'var(--theme-button-bg)' : 'var(--theme-card-bg)',
                color: isSelected ? 'var(--theme-button-text)' : 'var(--theme-text)',
                borderColor: isSelected ? 'var(--theme-button-bg)' : 'var(--theme-border)'
              }}
            >
              {/* Selection Indicator */}
              <div className="absolute top-4 right-4">
                <div 
                  className={`
                    w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200
                    ${isSelected ? 'border-current' : 'border-gray-400'}
                  `}
                >
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-3 h-3 rounded-full bg-current"
                    />
                  )}
                </div>
              </div>

              {/* Option Content */}
              <div className="pr-8">
                {/* Icon */}
                {option.icon && (
                  <div className="text-3xl mb-3">
                    {option.icon}
                  </div>
                )}

                {/* Label */}
                <h3 className="text-xl font-bold mb-2">
                  {getOptionLabel(option)}
                </h3>

                {/* Description */}
                {getOptionDescription(option) && (
                  <p 
                    className="text-sm opacity-80"
                    style={{ 
                      color: isSelected ? 'var(--theme-button-text)' : 'var(--theme-muted)' 
                    }}
                  >
                    {getOptionDescription(option)}
                  </p>
                )}
              </div>

              {/* Hover Effect */}
              {!isSelected && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 opacity-0 hover:opacity-5 transition-opacity duration-300"
                  style={{ borderRadius: 'inherit' }}
                  whileHover={{
                    background: [
                      "linear-gradient(to right, #3B82F6, #8B5CF6)",
                      "linear-gradient(to right, #8B5CF6, #EC4899)",
                      "linear-gradient(to right, #3B82F6, #8B5CF6)"
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
              
              {/* Selection Animation */}
              {isSelected && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 opacity-10"
                  style={{ borderRadius: 'inherit' }}
                  animate={{
                    opacity: [0.1, 0.2, 0.1]
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default RadioStep;