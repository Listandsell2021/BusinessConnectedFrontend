import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const LanguageToggle = () => {
  const { language, changeLanguage, isGerman } = useLanguage();

  return (
    <div className="flex items-center space-x-1">
      <button
        onClick={() => changeLanguage('de')}
        className={`
          px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none
          ${isGerman 
            ? 'shadow-sm' 
            : 'hover:opacity-75'
          }
        `}
        style={{
          ...(isGerman ? {
            backgroundColor: 'var(--theme-button-bg)',
            color: 'var(--theme-button-text)'
          } : {
            backgroundColor: 'var(--theme-bg-secondary)',
            color: 'var(--theme-muted)'
          })
        }}
      >
        🇩🇪 DE
      </button>
      
      <button
        onClick={() => changeLanguage('en')}
        className={`
          px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none
          ${!isGerman 
            ? 'shadow-sm' 
            : 'hover:opacity-75'
          }
        `}
        style={{
          ...(!isGerman ? {
            backgroundColor: 'var(--theme-button-bg)',
            color: 'var(--theme-button-text)'
          } : {
            backgroundColor: 'var(--theme-bg-secondary)',
            color: 'var(--theme-muted)'
          })
        }}
      >
        🇺🇸 EN
      </button>
    </div>
  );
};

export default LanguageToggle;