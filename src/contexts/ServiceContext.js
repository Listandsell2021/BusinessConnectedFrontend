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
  // Fixed to moving service only
  const [currentService] = useState('moving');
  const [hideServiceFilter] = useState(true); // Always hide service filter

  const switchService = (service) => {
    // Only moving service is supported, ignore switches
    console.log('Service switching disabled - only moving service supported');
  };

  const getServiceDisplayName = (service) => {
    // Only moving service
    return {
      en: 'Moving Services',
      de: 'Umzugsservice'
    };
  };

  const value = {
    currentService,
    switchService,
    getServiceDisplayName,
    isMovingService: true, // Always true
    isCleaningService: false, // Always false
    hideServiceFilter,
    setHideServiceFilter: () => {} // No-op function
  };

  return (
    <ServiceContext.Provider value={value}>
      {children}
    </ServiceContext.Provider>
  );
};