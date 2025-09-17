import React, { createContext, useContext, useState, useEffect } from 'react';

const ServiceContext = createContext();

export const useService = () => {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useService must be used within a ServiceProvider');
  }
  return context;
};

export const ServiceProvider = ({ children }) => {
  const [currentService, setCurrentService] = useState('moving');
  const [hideServiceFilter, setHideServiceFilter] = useState(false);

  useEffect(() => {
    const savedService = localStorage.getItem('selectedService');
    if (savedService && ['moving', 'cleaning'].includes(savedService)) {
      setCurrentService(savedService);
    }
  }, []);

  const switchService = (service) => {
    if (['moving', 'cleaning'].includes(service)) {
      setCurrentService(service);
      localStorage.setItem('selectedService', service);
    }
  };

  const getServiceDisplayName = (service) => {
    const serviceNames = {
      moving: {
        en: 'Moving Services',
        de: 'Umzugsservice'
      },
      cleaning: {
        en: 'Cleaning Services', 
        de: 'Reinigungsservice'
      }
    };
    return serviceNames[service] || serviceNames.moving;
  };

  const value = {
    currentService,
    switchService,
    getServiceDisplayName,
    isMovingService: currentService === 'moving',
    isCleaningService: currentService === 'cleaning',
    hideServiceFilter,
    setHideServiceFilter
  };

  return (
    <ServiceContext.Provider value={value}>
      {children}
    </ServiceContext.Provider>
  );
};