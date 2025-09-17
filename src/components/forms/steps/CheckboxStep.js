import React from 'react';
import { motion } from 'framer-motion';

const CheckboxStep = ({ step, data, errors, onChange, language }) => {
  const getOptionLabel = (option) => {
    return option.label?.[language] || option.label?.en || option.label;
  };

  const getOptionDescription = (option) => {
    return option.description?.[language] || option.description?.en || option.description;
  };

  const handleChange = (optionId, checked) => {
    const newData = { ...(data || {}) };
    
    if (checked) {
      newData[optionId] = true;
    } else {
      delete newData[optionId];
    }
    
    onChange(newData);
  };

  const isOptionSelected = (optionId) => {
    return Boolean(data?.[optionId]);
  };

  return (
    <div className="space-y-4">
      {/* Error Messages */}
      {errors?.selection && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-lg border border-red-500 bg-red-50 text-red-700 text-sm"
        >
          {errors.selection}
        </motion.div>
      )}

      {/* Individual Option Errors */}
      {Object.entries(errors || {}).map(([key, error]) => {
        if (key === 'selection') return null;
        
        return (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-lg border border-red-500 bg-red-50 text-red-700 text-sm"
          >
            {error}
          </motion.div>
        );
      })}

      {/* Options */}
      <div className="grid grid-cols-1 gap-4">
        {step.options?.map((option, index) => {
          const isSelected = isOptionSelected(option.id);
          const hasError = errors?.[option.id];
          
          return (
            <motion.button
              key={option.id}
              onClick={() => handleChange(option.id, !isSelected)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -2, rotateX: 2 }}
              whileTap={{ scale: 0.98 }}
              className={`
                p-6 rounded-xl border-2 text-left transition-all duration-300 relative overflow-hidden
                ${isSelected 
                  ? 'shadow-lg' 
                  : 'hover:shadow-md'
                }
                ${hasError ? 'border-red-500' : ''}
              `}
              style={{
                backgroundColor: isSelected ? 'var(--theme-button-bg)' : 'var(--theme-card-bg)',
                color: isSelected ? 'var(--theme-button-text)' : 'var(--theme-text)',
                borderColor: hasError 
                  ? '#EF4444' 
                  : (isSelected ? 'var(--theme-button-bg)' : 'var(--theme-border)')
              }}
            >
              {/* Selection Indicator */}
              <div className="absolute top-4 right-4">
                <div 
                  className={`
                    w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200
                    ${isSelected ? 'border-current' : 'border-gray-400'}
                  `}
                  style={{
                    backgroundColor: isSelected ? 'var(--theme-button-text)' : 'transparent'
                  }}
                >
                  {isSelected && (
                    <motion.svg
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      style={{ color: isSelected ? 'var(--theme-button-bg)' : 'white' }}
                    >
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </motion.svg>
                  )}
                </div>
              </div>

              {/* Required Indicator */}
              {option.required && (
                <div className="absolute top-2 left-2">
                  <span className="text-red-500 text-xs font-bold">*</span>
                </div>
              )}

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
                  {option.required && <span className="text-red-500 ml-1">*</span>}
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
                  className="absolute inset-0 bg-gradient-to-r from-green-500 to-blue-600 opacity-0 hover:opacity-5 transition-opacity duration-300"
                  style={{ borderRadius: 'inherit' }}
                  whileHover={{
                    background: [
                      "linear-gradient(to right, #10B981, #3B82F6)",
                      "linear-gradient(to right, #3B82F6, #06D6A0)",
                      "linear-gradient(to right, #10B981, #3B82F6)"
                    ]
                  }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                />
              )}
              
              {/* Selection Animation */}
              {isSelected && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-green-400 to-blue-500 opacity-10"
                  style={{ borderRadius: 'inherit' }}
                  animate={{
                    opacity: [0.1, 0.15, 0.1],
                    scale: [1, 1.01, 1]
                  }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Selection Summary */}
      {data && Object.keys(data).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 rounded-lg"
          style={{ 
            backgroundColor: 'var(--theme-bg-secondary)',
            borderLeft: '4px solid var(--theme-button-bg)'
          }}
        >
          <h4 className="font-semibold mb-2" style={{ color: 'var(--theme-text)' }}>
            Ausgewählt ({Object.keys(data).length}):
          </h4>
          <div className="flex flex-wrap gap-2">
            {Object.keys(data).map(optionId => {
              const option = step.options?.find(opt => opt.id === optionId);
              if (!option) return null;
              
              return (
                <span
                  key={optionId}
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: 'var(--theme-button-bg)',
                    color: 'var(--theme-button-text)'
                  }}
                >
                  {getOptionLabel(option)}
                </span>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default CheckboxStep;