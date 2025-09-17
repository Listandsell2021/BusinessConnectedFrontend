import React from 'react';
import { motion } from 'framer-motion';
import { useService } from '../../contexts/ServiceContext';
import { useLanguage } from '../../contexts/LanguageContext';

const ServiceSelector = ({ className = '' }) => {
  const { currentService, switchService, getServiceDisplayName, hideServiceFilter } = useService();
  const { isGerman } = useLanguage();

  const services = [
    { id: 'moving', icon: '🚛', domain: 'umzug-anbieter-vergleich.de' },
    { id: 'cleaning', icon: '🧽', domain: 'reinigungsfirma-vergleich.de' }
  ];

  // Hide the service selector if hideServiceFilter is true
  if (hideServiceFilter) {
    return null;
  }

  return (
    <motion.div 
      className={`relative ${className}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <select
        value={currentService}
        onChange={(e) => switchService(e.target.value)}
        className="appearance-none bg-transparent border-2 rounded-lg px-4 py-2 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
        style={{
          backgroundColor: 'var(--theme-bg-secondary)',
          borderColor: 'var(--theme-border)',
          color: 'var(--theme-text)'
        }}
      >
        {services.map((service) => {
          const displayName = getServiceDisplayName(service.id);
          return (
            <option key={service.id} value={service.id}>
              {service.icon} {displayName[isGerman ? 'de' : 'en']}
            </option>
          );
        })}
      </select>
      
      {/* Custom dropdown arrow */}
      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
        <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
          <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </motion.div>
  );
};

export default ServiceSelector;