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
        w-full p-8 md:p-12 rounded-3xl border border-dashed border-slate-800
        bg-surface-900/40 text-center flex flex-col items-center justify-center gap-3
        ${className}
      `}
    >
      <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 mb-1">
        <Icon className="w-6 h-6 stroke-1.5" />
      </div>
      <h4 className="text-base font-bold text-white tracking-tight">{title}</h4>
      <p className="text-xs text-slate-400 max-w-sm leading-relaxed">{description}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
};

export default EmptyState;
