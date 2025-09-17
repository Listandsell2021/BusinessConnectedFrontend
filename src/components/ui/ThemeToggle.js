// Theme Toggle Component - Modern Switch
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';

export default function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();
  const { t } = useLanguage();

  if (!mounted) {
    return <div className="w-12 h-6 bg-gray-200 rounded-full animate-pulse"></div>;
  }

  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={`relative inline-flex h-6 w-12 items-center rounded-full border transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-blue-400 ${
        isDark 
          ? 'bg-gray-700 border-gray-600' 
          : 'bg-yellow-100 border-yellow-300'
      }`}
      aria-label={t('common.toggleTheme')}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {/* Toggle Circle */}
      <span
        className={`inline-block h-4 w-4 transform rounded-full border transition-all duration-300 shadow-sm ${
          isDark 
            ? 'translate-x-6 bg-gray-900 border-gray-700' 
            : 'translate-x-1 bg-yellow-400 border-yellow-500'
        }`}
      />
      
      {/* Icons */}
      <div className="absolute inset-0 flex items-center justify-between px-1">
        {/* Sun Icon */}
        <div className={`text-yellow-500 transition-opacity duration-300 ${
          !isDark ? 'opacity-0' : 'opacity-100'
        }`}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"/>
          </svg>
        </div>
        
        {/* Moon Icon */}
        <div className={`text-blue-300 transition-opacity duration-300 ${
          isDark ? 'opacity-0' : 'opacity-100'
        }`}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd"/>
          </svg>
        </div>
      </div>
    </button>
  );
}