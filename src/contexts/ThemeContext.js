import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme && ['light', 'dark'].includes(savedTheme)) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      // Default to dark theme
      setTheme('dark');
      applyTheme('dark');
    }
  }, []);

  const applyTheme = (newTheme) => {
    const root = document.documentElement;
    
    if (newTheme === 'dark') {
      root.style.setProperty('--theme-bg', '#000000');
      root.style.setProperty('--theme-bg-secondary', '#1a1a1a');
      root.style.setProperty('--theme-bg-tertiary', '#2a2a2a');
      root.style.setProperty('--theme-text', '#ffffff');
      root.style.setProperty('--theme-text-secondary', '#e0e0e0');
      root.style.setProperty('--theme-muted', '#b0b0b0');
      root.style.setProperty('--theme-border', '#505050');
      root.style.setProperty('--theme-border-light', '#303030');
      root.style.setProperty('--theme-accent', '#ffffff');
      root.style.setProperty('--theme-accent-muted', '#cccccc');
      root.style.setProperty('--theme-shadow', 'rgba(255, 255, 255, 0.1)');
      root.style.setProperty('--theme-hover', '#333333');
      root.style.setProperty('--theme-card-bg', '#1a1a1a');
      root.style.setProperty('--theme-input-bg', '#2a2a2a');
      root.style.setProperty('--theme-button-bg', '#ffffff');
      root.style.setProperty('--theme-button-text', '#000000');
      root.style.setProperty('--theme-button-hover', '#e0e0e0');
    } else {
      root.style.setProperty('--theme-bg', '#ffffff');
      root.style.setProperty('--theme-bg-secondary', '#f8f9fa');
      root.style.setProperty('--theme-bg-tertiary', '#e9ecef');
      root.style.setProperty('--theme-text', '#000000');
      root.style.setProperty('--theme-text-secondary', '#333333');
      root.style.setProperty('--theme-muted', '#666666');
      root.style.setProperty('--theme-border', '#e0e0e0');
      root.style.setProperty('--theme-border-light', '#f0f0f0');
      root.style.setProperty('--theme-accent', '#000000');
      root.style.setProperty('--theme-accent-muted', '#333333');
      root.style.setProperty('--theme-shadow', 'rgba(0, 0, 0, 0.1)');
      root.style.setProperty('--theme-hover', '#f5f5f5');
      root.style.setProperty('--theme-card-bg', '#ffffff');
      root.style.setProperty('--theme-input-bg', '#ffffff');
      root.style.setProperty('--theme-button-bg', '#000000');
      root.style.setProperty('--theme-button-text', '#ffffff');
      root.style.setProperty('--theme-button-hover', '#333333');
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  };

  const value = {
    theme,
    toggleTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    mounted
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
