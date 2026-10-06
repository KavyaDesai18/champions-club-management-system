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
      className={`inline-flex items-center gap-1.5 p-1.5 rounded-2xl bg-surface-900/80 border border-slate-800/80 ${className}`}
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
              relative px-4 py-2 rounded-xl text-xs font-bold transition-colors select-none flex items-center gap-2
              ${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'}
            `}
          >
            {isActive && (
              <motion.div
                layoutId={shouldReduceMotion ? undefined : 'active-tab-pill'}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="absolute inset-0 bg-slate-800 dark:bg-slate-800 rounded-xl shadow-md border border-slate-700/60"
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {Icon && <Icon className="w-3.5 h-3.5" />}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-slate-700 text-slate-300">
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
