import React, { useState, useEffect } from 'react';

/**
 * Password Strength Indicator Component
 * Shows password requirements and validation in real-time
 * Uses CSS transitions instead of Framer Motion to avoid nested animation conflicts
 */
const PasswordStrengthIndicator = ({ password, isGerman = false }) => {
  const [requirements, setRequirements] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumbers: false,
    hasSymbols: false
  });

  const [strength, setStrength] = useState('weak');

  useEffect(() => {
    if (!password) {
      setRequirements({
        minLength: false,
        hasUppercase: false,
        hasLowercase: false,
        hasNumbers: false,
        hasSymbols: false
      });
      setStrength('weak');
      return;
    }

    const newRequirements = {
      minLength: password.length >= 12,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumbers: /[0-9]/.test(password),
      hasSymbols: /[!@#$%&*]/.test(password)
    };

    setRequirements(newRequirements);

    // Calculate strength
    const meetsAll =
      newRequirements.minLength &&
      newRequirements.hasUppercase &&
      newRequirements.hasLowercase &&
      newRequirements.hasNumbers &&
      newRequirements.hasSymbols;

    if (meetsAll) {
      if (password.length >= 16) {
        setStrength('strong');
      } else {
        setStrength('medium');
      }
    } else {
      setStrength('weak');
    }
  }, [password]);

  const requirements_list = [
    {
      label: isGerman ? 'Mindestens 12 Zeichen' : 'At least 12 characters',
      met: requirements.minLength,
      icon: '📏'
    },
    {
      label: isGerman ? 'Ein Großbuchstabe (A-Z)' : 'One uppercase letter (A-Z)',
      met: requirements.hasUppercase,
      icon: '🔤'
    },
    {
      label: isGerman ? 'Ein Kleinbuchstabe (a-z)' : 'One lowercase letter (a-z)',
      met: requirements.hasLowercase,
      icon: '📝'
    },
    {
      label: isGerman ? 'Eine Zahl (0-9)' : 'One number (0-9)',
      met: requirements.hasNumbers,
      icon: '🔢'
    },
    {
      label: isGerman ? 'Ein Symbol (!@#$%&*)' : 'One symbol (!@#$%&*)',
      met: requirements.hasSymbols,
      icon: '🔐'
    }
  ];

  const strengthColor =
    strength === 'strong' ? '#10b981' : strength === 'medium' ? '#f59e0b' : '#ef4444';
  const strengthLabel =
    strength === 'strong'
      ? isGerman
        ? 'Stark'
        : 'Strong'
      : strength === 'medium'
        ? isGerman
          ? 'Mittel'
          : 'Medium'
        : isGerman
          ? 'Schwach'
          : 'Weak';

  return (
    <div
      className="mt-4 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 transition-all duration-300"
      style={{
        borderColor: password ? strengthColor + '33' : undefined,
        backgroundColor: password
          ? strengthColor + '08'
          : 'rgba(0,0,0,0.02)'
      }}
    >
      {/* Strength Indicator */}
      {password && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold" style={{ color: 'var(--theme-text)' }}>
              {isGerman ? 'Passwort Stärke' : 'Password Strength'}
            </span>
            <span
              className="text-sm font-bold px-2 py-1 rounded"
              style={{
                color: strengthColor,
                backgroundColor: strengthColor + '15'
              }}
            >
              {strengthLabel}
            </span>
          </div>
          <div className="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-2 overflow-hidden">
            <div
              style={{
                width:
                  strength === 'strong' ? '100%' : strength === 'medium' ? '66%' : '33%',
                backgroundColor: strengthColor,
                height: '100%',
                borderRadius: '9999px',
                transition: 'width 300ms ease-in-out'
              }}
            />
          </div>
        </div>
      )}

      {/* Requirements List */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase" style={{ color: 'var(--theme-muted)' }}>
          {isGerman ? 'Anforderungen' : 'Requirements'}
        </p>
        {requirements_list.map((req, index) => (
          <div
            key={index}
            className="flex items-center space-x-2 text-sm transition-all duration-200"
          >
            <span
              className="text-lg w-5 h-5 flex items-center justify-center rounded-full transition-all duration-200"
              style={{
                backgroundColor: req.met ? '#10b981' : '#e5e7eb',
                color: req.met ? 'white' : '#9ca3af'
              }}
            >
              {req.met ? '✓' : '○'}
            </span>
            <span
              style={{
                color: req.met ? '#059669' : 'var(--theme-muted)',
                textDecoration: req.met ? 'line-through' : 'none',
                transition: 'all 200ms ease-in-out'
              }}
            >
              {req.label}
            </span>
          </div>
        ))}
      </div>

      {/* Tip */}
      {!password && (
        <div
          className="mt-3 text-xs p-2 rounded bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700"
          style={{ color: '#1e40af' }}
        >
          💡 {isGerman
            ? 'Erstelle ein starkes Passwort mit Groß- und Kleinbuchstaben, Zahlen und Symbolen.'
            : 'Create a strong password with uppercase, lowercase, numbers, and symbols.'}
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthIndicator;
