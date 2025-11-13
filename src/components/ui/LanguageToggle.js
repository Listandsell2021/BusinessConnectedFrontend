import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const LanguageToggle = () => {
  const { language, changeLanguage, isGerman } = useLanguage();

  return (
    <div className="flex items-center space-x-1 bg-white/10 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg p-1 border border-gray-200/20">
      <button
        onClick={() => changeLanguage('de')}
        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition-all duration-200 ${
          isGerman
            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg scale-105'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-700/50'
        }`}
        title="Deutsch"
      >
        {/* German Flag */}
        <svg width="20" height="15" viewBox="0 0 5 3" className="rounded-sm shadow-sm">
          <rect width="5" height="1" y="0" fill="#000"/>
          <rect width="5" height="1" y="1" fill="#D00"/>
          <rect width="5" height="1" y="2" fill="#FFCE00"/>
        </svg>
        <span className="text-xs font-semibold">DE</span>
      </button>

      <button
        onClick={() => changeLanguage('en')}
        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition-all duration-200 ${
          !isGerman
            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg scale-105'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-700/50'
        }`}
        title="English (UK)"
      >
        {/* UK Flag */}
        <svg width="20" height="15" viewBox="0 0 60 30" className="rounded-sm shadow-sm">
          <clipPath id="uk-flag">
            <rect width="60" height="30"/>
          </clipPath>
          <g clipPath="url(#uk-flag)">
            <rect width="60" height="30" fill="#012169"/>
            <path d="M 0,0 L 60,30 M 60,0 L 0,30" stroke="#fff" strokeWidth="6"/>
            <path d="M 0,0 L 60,30 M 60,0 L 0,30" stroke="#C8102E" strokeWidth="4" clipPath="url(#uk-flag)"/>
            <path d="M 30,0 v 30 M 0,15 h 60" stroke="#fff" strokeWidth="10"/>
            <path d="M 30,0 v 30 M 0,15 h 60" stroke="#C8102E" strokeWidth="6"/>
          </g>
        </svg>
        <span className="text-xs font-semibold">EN</span>
      </button>
    </div>
  );
};

export default LanguageToggle;