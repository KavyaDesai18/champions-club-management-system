import React from 'react';
import { Inbox } from 'lucide-react';

export const EmptyState = ({
  icon: Icon = Inbox,
  title = 'No items found',
  description = 'There are currently no items to display in this view.',
  action,
  className = '',
}) => {
  return (
    <div
      className={`
        w-full p-8 md:p-12 rounded-lg border border-dashed border-court-300 dark:border-court-800
        bg-court-50/50 dark:bg-court-900/40 text-center flex flex-col items-center justify-center gap-3
        ${className}
      `}
    >
      <div className="w-12 h-12 rounded-md bg-court-100 dark:bg-court-800 border border-court-200 dark:border-court-700/80 flex items-center justify-center text-court-500 dark:text-court-400 mb-1">
        <Icon className="w-6 h-6 stroke-[1.75]" />
      </div>
      <h4 className="font-heading font-bold uppercase tracking-wider text-court-900 dark:text-court-100 text-base">
        {title}
      </h4>
      <p className="text-xs text-court-600 dark:text-court-400 max-w-sm leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
};

export default EmptyState;
