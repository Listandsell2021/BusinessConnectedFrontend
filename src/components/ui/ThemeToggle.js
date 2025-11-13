// Theme Toggle Component - Modern Gradient Button
import { useTheme } from '../../contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();

  if (!mounted) {
    return <div className="w-[42px] h-[32px] bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>;
  }

  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={`relative inline-flex items-center justify-center w-[42px] h-[32px] rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1 hover:scale-110 shadow-md ${
        isDark
          ? 'bg-gradient-to-br from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 focus:ring-blue-400'
          : 'bg-gradient-to-br from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 focus:ring-orange-400'
      }`}
      title={isDark ? 'Light Mode' : 'Dark Mode'}
    >
      {/* Sun Icon - Light Mode */}
      <svg
        className={`absolute w-5 h-5 transition-all duration-500 ${
          isDark
            ? 'rotate-180 scale-0 opacity-0'
            : 'rotate-0 scale-100 opacity-100'
        }`}
        fill="none"
        stroke="white"
        viewBox="0 0 24 24"
        strokeWidth={2.5}
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41" />
      </svg>

      {/* Moon Icon - Dark Mode */}
      <svg
        className={`absolute w-5 h-5 transition-all duration-500 ${
          isDark
            ? 'rotate-0 scale-100 opacity-100'
            : '-rotate-180 scale-0 opacity-0'
        }`}
        fill="none"
        stroke="white"
        viewBox="0 0 24 24"
        strokeWidth={2.5}
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  );
}