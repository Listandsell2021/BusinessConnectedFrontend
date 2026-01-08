import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import ThemeToggle from '../../ui/ThemeToggle';
import LanguageToggle from '../../ui/LanguageToggle';

const ProfessionalFormLayout = ({
  formType,
  children,
  currentStepIndex,
  totalSteps
}) => {
  const { isGerman } = useLanguage();
  const { isDark } = useTheme();

  const isClientForm = formType === 'securityClient';
  const isCompanyForm = formType === 'securityCompany';

  const heroContent = {
    title: isGerman
      ? (isClientForm ? 'Sicherheitsanfrage' : 'Sicherheitsunternehmen registrieren')
      : (isClientForm ? 'Security Service Request' : 'Security Company Registration'),
    subtitle: isGerman
      ? (isClientForm
        ? 'Finden Sie den richtigen Sicherheitspartner für Ihre Anforderungen.'
        : 'Registrieren Sie Ihr Unternehmen und finden Sie neue Kunden.')
      : (isClientForm
        ? 'Find the right security service for your requirements.'
        : 'Register your company and find new clients.'),
    description: isGerman
      ? (isClientForm
        ? 'Wir werden den richtigen Sicherheitsdienst oder Sicherheitsprojekt für Sie finden. Geben Sie Ihre Details ein und wir werden uns mit geeigneten Angeboten an Sie zurück wenden. Unser Service ist kostenlos, es sei denn, ein Vertrag wird abgeschlossen. Gebühren werden transparent im Voraus mitgeteilt.'
        : 'Geben Sie Ihre Unternehmensdetails ein und werden Sie Teil unseres Netzwerks. Wir verbinden Sie mit Kunden, die Ihre Sicherheitsdienste benötigen.')
      : (isClientForm
        ? 'We will find the right security service for you. Enter your details and we will get back to you with suitable offers. Our service is free unless a contract is concluded. Any placement fee will be communicated transparently in advance.'
        : 'Enter your company details and become part of our network. We connect you with clients who need your security services.')
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: isGerman ? '#0f1419' : '#0a0e17'
      }}
    >
      {/* Header */}
      <header className="border-b" style={{ borderColor: 'rgba(59, 130, 246, 0.2)' }}>
        <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-3"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">🛡️</span>
            </div>
            <span className="text-white font-bold text-xl">BusinessConnected</span>
          </motion.div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="py-12 sm:py-16 text-center border-b"
        style={{ borderColor: 'rgba(59, 130, 246, 0.2)' }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="inline-block mb-4 px-4 py-2 rounded-full"
            style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)' }}
          >
            <span className="text-blue-400 text-sm font-medium">
              {isClientForm ? (isGerman ? 'Sicherheitslösungen' : 'Security Solutions') : (isGerman ? 'Partner werden' : 'Become a Partner')}
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-4xl sm:text-5xl font-bold text-white mb-4"
          >
            {heroContent.title}
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-gray-300 text-lg max-w-2xl mx-auto leading-relaxed"
          >
            {heroContent.description}
          </motion.p>
        </div>
      </motion.section>

      {/* Main Content */}
      <div className="flex-1 py-8 sm:py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Progress Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-400 text-sm font-medium">
                {currentStepIndex + 1} {isGerman ? 'von' : 'of'} {totalSteps}
              </span>
              <span className="text-gray-400 text-sm">
                {Math.round(((currentStepIndex + 1) / totalSteps) * 100)}%
              </span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                initial={{ width: 0 }}
                animate={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </motion.div>

          {/* Form Container */}
          <motion.div
            key={currentStepIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="rounded-lg p-8 sm:p-10"
            style={{
              backgroundColor: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              backdropFilter: 'blur(10px)'
            }}
          >
            {children}
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="border-t mt-auto py-6 text-center text-gray-500 text-sm"
        style={{ borderColor: 'rgba(59, 130, 246, 0.2)' }}
      >
        <p>
          {isGerman
            ? '🔒 Ihre Daten sind geschützt und sicher'
            : '🔒 Your data is protected and secure'}
        </p>
      </motion.footer>
    </div>
  );
};

export default ProfessionalFormLayout;
