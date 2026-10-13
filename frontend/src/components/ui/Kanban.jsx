import React from 'react';
import { motion } from 'framer-motion';

export const KanbanBoard = ({ children, className = '' }) => {
  return (
    <div
      className={`w-full flex gap-4 overflow-x-auto pb-4 scrollbar-thin select-none ${className}`}
    >
      {children}
    </div>
  );
};

export const KanbanColumn = ({
  id,
  title,
  count = 0,
  icon: Icon,
  accentColor = 'court', // 'optic' | 'grass' | 'clay' | 'court' | 'hardcourt'
  children,
  emptyMessage = 'No items in this column',
  className = '',
}) => {
  const accentBorders = {
    optic: 'border-t-optic-500',
    grass: 'border-t-grass-500',
    clay: 'border-t-clay-500',
    hardcourt: 'border-t-hardcourt-500',
    court: 'border-t-court-400 dark:border-t-court-600',
  };

  const borderClass = accentBorders[accentColor] || accentBorders.court;

  return (
    <div
      data-testid={`kanban-column-${id}`}
      className={`
        flex flex-col min-w-[280px] sm:min-w-[320px] max-w-[360px] flex-1
        rounded-lg border border-court-200 dark:border-court-800 border-t-4 ${borderClass}
        bg-court-50/60 dark:bg-court-900/40 p-3 sm:p-3.5 shadow-court-sm
        ${className}
      `}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-court-200/80 dark:border-court-800/80">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-court-500 dark:text-court-400 stroke-[1.75]" />}
          <h4 className="font-heading font-bold uppercase tracking-wider text-xs sm:text-sm text-court-900 dark:text-court-100">
            {title}
          </h4>
        </div>
        <span className="px-2 py-0.5 rounded-xs bg-court-200 dark:bg-court-800 text-court-700 dark:text-court-300 font-mono text-[11px] font-bold tabular-nums">
          {count}
        </span>
      </div>

      {/* Cards container */}
      <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[calc(100vh-280px)] min-h-[140px] pr-0.5 scrollbar-thin">
        {React.Children.count(children) === 0 ? (
          <div className="h-28 flex items-center justify-center text-center p-4 border border-dashed border-court-200 dark:border-court-800 rounded-md text-xs text-court-400 dark:text-court-500 font-sans">
            {emptyMessage}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

export const KanbanCard = ({
  children,
  onClick,
  isDragging = false,
  className = '',
}) => {
  return (
    <motion.div
      layout
      whileHover={onClick ? { y: -2 } : {}}
      onClick={onClick}
      className={`
        court-card p-3.5 rounded-md border border-court-200 dark:border-court-800
        bg-white dark:bg-court-850 shadow-court-sm hover:shadow-court-md transition-shadow
        ${onClick ? 'cursor-pointer' : ''}
        ${isDragging ? 'opacity-60 ring-2 ring-optic-500' : ''}
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
};

export default KanbanBoard;
