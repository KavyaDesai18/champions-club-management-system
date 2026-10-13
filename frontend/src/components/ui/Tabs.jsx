import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export const Tabs = ({
  tabs = [],
  activeTab,
  onChange,
  className = '',
}) => {
  const [internalTab, setInternalTab] = useState(tabs[0]?.id);
  const currentTab = activeTab !== undefined ? activeTab : internalTab;
  const shouldReduceMotion = useReducedMotion();

  const handleSelect = (id) => {
    if (activeTab === undefined) setInternalTab(id);
    if (onChange) onChange(id);
  };

  return (
    <div
      role="tablist"
      className={`inline-flex items-center gap-1 p-1 rounded-lg bg-court-100 dark:bg-court-900 border border-court-200 dark:border-court-800 ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => handleSelect(tab.id)}
            className={`
              relative px-3.5 py-1.5 rounded-md text-xs font-heading font-bold uppercase tracking-wider transition-colors select-none flex items-center gap-2
              ${isActive ? 'text-court-950 dark:text-white' : 'text-court-500 hover:text-court-800 dark:hover:text-court-200'}
            `}
          >
            {isActive && (
              <motion.div
                layoutId={shouldReduceMotion ? undefined : 'active-tab-pill'}
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                className="absolute inset-0 bg-white dark:bg-court-800 rounded-md shadow-court-sm border border-court-200/80 dark:border-court-700/80"
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {Icon && <Icon className="w-3.5 h-3.5 stroke-[1.75]" />}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className={`px-1.5 py-0.2 rounded-xs text-[10px] font-mono tabular-nums ${
                  isActive
                    ? 'bg-optic-500 text-court-950 font-bold'
                    : 'bg-court-200 dark:bg-court-700 text-court-700 dark:text-court-300'
                }`}>
                  {tab.badge}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
