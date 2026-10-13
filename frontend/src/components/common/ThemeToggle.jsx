import React from 'react';
import { motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const ThemeToggle = ({ className = '' }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      id="theme-toggle-btn"
      data-testid="theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className={`
        p-2 rounded-md border border-court-200 dark:border-court-800 bg-white/80 dark:bg-court-900/80
        text-court-700 dark:text-court-300 hover:text-court-950 dark:hover:text-white hover:border-court-400 dark:hover:border-court-600 transition-all select-none
        focus:outline-none focus-visible:ring-2 focus-visible:ring-optic-500
        ${className}
      `}
    >
      <motion.div
        key={isDark ? 'dark' : 'light'}
        initial={{ rotate: -45, scale: 0.8, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        exit={{ rotate: 45, scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {isDark ? (
          <Sun className="w-4 h-4 text-optic-400 stroke-[1.75]" />
        ) : (
          <Moon className="w-4 h-4 text-court-600 stroke-[1.75]" />
        )}
      </motion.div>
    </button>
  );
};

export default ThemeToggle;
