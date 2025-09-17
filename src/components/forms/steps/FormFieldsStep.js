import React from 'react';
import { motion } from 'framer-motion';

const FormFieldsStep = ({ step, data, errors, onChange, language }) => {
  const getFieldLabel = (field) => {
    return field.label?.[language] || field.label?.en || field.label;
  };

  const getFieldPlaceholder = (field) => {
    return field.placeholder?.[language] || field.placeholder?.en || field.placeholder;
  };

  const getOptionLabel = (option) => {
    return option.label?.[language] || option.label?.en || option.label;
  };

  const handleFieldChange = (fieldId, value) => {
    const newData = { ...(data || {}) };
    newData[fieldId] = value;
    onChange(newData);
  };

  const handleGroupFieldChange = (groupId, fieldId, value) => {
    const newData = { ...(data || {}) };
    if (!newData[groupId]) {
      newData[groupId] = {};
    }
    newData[groupId][fieldId] = value;
    onChange(newData);
  };

  const getFieldValue = (fieldId) => {
    return data?.[fieldId] || '';
  };

  const getGroupFieldValue = (groupId, fieldId) => {
    return data?.[groupId]?.[fieldId] || '';
  };

  const getFieldError = (fieldId) => {
    return errors?.[fieldId];
  };

  const getGroupFieldError = (groupId, fieldId) => {
    return errors?.[`${groupId}.${fieldId}`];
  };

  const RenderField = ({ field, value, onFieldChange, error }) => {
    const [isFocused, setIsFocused] = React.useState(false);
    
    const fieldProps = {
      id: field.id,
      value,
      onChange: (e) => onFieldChange(e.target.value),
      onFocus: () => setIsFocused(true),
      onBlur: () => setIsFocused(false),
      placeholder: getFieldPlaceholder(field),
      required: field.required,
      maxLength: field.maxLength,
      className: `
        w-full px-4 py-3 rounded-lg border-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform hover:scale-[1.01] focus:scale-[1.01]
        ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500 animate-shake' : 'focus:border-blue-500 hover:border-blue-300'}
        ${isFocused ? 'shadow-lg' : 'shadow-sm hover:shadow-md'}
      `,
      style: {
        backgroundColor: 'var(--theme-input-bg)',
        borderColor: error ? '#EF4444' : (isFocused ? '#3B82F6' : 'var(--theme-border)'),
        color: 'var(--theme-text)',
        boxShadow: isFocused ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : undefined
      }
    };

    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
        return <input type={field.type} {...fieldProps} />;

      case 'select':
        return (
          <select {...fieldProps}>
            <option value="">
              {field.placeholder?.[language] || field.placeholder?.en || 'Bitte wählen...'}
            </option>
            {field.options?.map(option => (
              <option key={option.id} value={option.id}>
                {getOptionLabel(option)}
              </option>
            ))}
          </select>
        );

      case 'textarea':
        return <textarea {...fieldProps} rows={4} />;

      default:
        return <input type="text" {...fieldProps} />;
    }
  };

  const renderGroupFields = (group, index) => {
    return (
      <motion.div
        key={group.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
        className="space-y-4 p-6 rounded-xl border-2"
        style={{
          backgroundColor: 'var(--theme-card-bg)',
          borderColor: 'var(--theme-border)'
        }}
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-text)' }}>
          {getFieldLabel(group)}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {group.fields?.map((field, fieldIndex) => {
            const fieldValue = getGroupFieldValue(group.id, field.id);
            const fieldError = getGroupFieldError(group.id, field.id);
            
            return (
              <motion.div
                key={field.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: (index * 0.1) + (fieldIndex * 0.05) }}
                className="space-y-2"
              >
                <label 
                  htmlFor={`${group.id}.${field.id}`}
                  className="block text-sm font-medium"
                  style={{ color: 'var(--theme-text)' }}
                >
                  {getFieldLabel(field)}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                
                <RenderField 
                  field={{ ...field, id: `${group.id}.${field.id}` }}
                  value={fieldValue}
                  onFieldChange={(value) => handleGroupFieldChange(group.id, field.id, value)}
                  error={fieldError}
                />
                
                {fieldError && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-sm"
                  >
                    {fieldError}
                  </motion.p>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    );
  };

  return (
    <>
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
      
      <div className="space-y-6">
        {step.fields?.map((field, index) => {
          if (field.type === 'group') {
            return renderGroupFields(field, index);
          }

          const fieldValue = getFieldValue(field.id);
          const fieldError = getFieldError(field.id);

          return (
            <motion.div
              key={field.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="space-y-2"
            >
              <label 
                htmlFor={field.id}
                className="block text-sm font-medium"
                style={{ color: 'var(--theme-text)' }}
              >
                {getFieldLabel(field)}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              
              <RenderField 
                field={field}
                value={fieldValue}
                onFieldChange={(value) => handleFieldChange(field.id, value)}
                error={fieldError}
              />
              
              {fieldError && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-sm"
                >
                  {fieldError}
                </motion.p>
              )}
            </motion.div>
          );
        })}
      </div>
    </>
  );
};

export default FormFieldsStep;