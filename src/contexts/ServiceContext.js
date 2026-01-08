import React, { createContext, useContext, useState } from 'react';

const ServiceContext = createContext();

export const useService = () => {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useService must be used within a ServiceProvider');
  }
  return context;
};

export const ServiceProvider = ({ children }) => {
  // Fixed to security services only
  const [currentService] = useState('security');
  const [hideServiceFilter] = useState(true); // Always hide service filter

  const switchService = (service) => {
    // Only security service is supported, ignore switches
    console.log('Service switching disabled - only security services supported');
  };

  const getServiceDisplayName = (service) => {
    // Only security services
    return {
      en: 'Security Services',
      de: 'Sicherheitsservices'
    };
  };

  const value = {
    currentService,
    switchService,
    getServiceDisplayName,
    isSecurityService: true, // Always true
    hideServiceFilter,
    setHideServiceFilter: () => {} // No-op function
  };

  return (
    <ServiceContext.Provider value={value}>
      {children}
    </ServiceContext.Provider>
  );
};