import React from 'react';
import { Check, Sparkles, X } from 'lucide-react';
import Button from './Button';
import Badge from './Badge';

export const PricingCard = ({
  name = '',
  tier = 'STANDARD',
  price = '',
  period = '/mo',
  description = '',
  features = [],
  popular = false,
  ctaText = 'Select Plan',
  onCtaClick,
  disabled = false,
  className = '',
}) => {
  return (
    <div
      className={`
        court-card relative flex flex-col justify-between p-6 sm:p-7 rounded-xl border transition-all
        ${
          popular
            ? 'border-optic-500 bg-white dark:bg-court-900 shadow-court-lg ring-2 ring-optic-500/30'
            : 'border-court-200 dark:border-court-800 bg-white dark:bg-court-900/90 shadow-court-sm hover:shadow-court-md'
        }
        ${className}
      `}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-heading font-bold uppercase tracking-wider bg-optic-500 text-court-950 shadow-court-sm">
            <Sparkles className="w-3 h-3 stroke-[2]" />
            Most Popular
          </span>
        </div>
      )}

      <div>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="font-heading font-bold uppercase tracking-wider text-xl text-court-950 dark:text-white">
              {name}
            </h3>
            {description && (
              <p className="text-xs text-court-500 dark:text-court-400 mt-1 font-sans">
                {description}
              </p>
            )}
          </div>
          <Badge
            variant={
              tier.toLowerCase().includes('gold')
                ? 'gold'
                : tier.toLowerCase().includes('platinum')
                ? 'optic'
                : 'court'
            }
          >
            {tier}
          </Badge>
        </div>

        <div className="my-5 flex items-baseline gap-1">
          <span className="text-3xl sm:text-4xl font-heading font-bold text-court-950 dark:text-white tabular-nums tracking-tight">
            {price}
          </span>
          {period && (
            <span className="text-xs text-court-500 font-sans font-medium">
              {period}
            </span>
          )}
        </div>

        {features.length > 0 && (
          <ul className="space-y-2.5 my-6 border-t border-court-200 dark:border-court-800 pt-5">
            {features.map((feat, idx) => {
              const isIncluded = typeof feat === 'string' ? true : feat.included !== false;
              const text = typeof feat === 'string' ? feat : feat.text;

              return (
                <li key={idx} className="flex items-start gap-2.5 text-xs font-sans">
                  {isIncluded ? (
                    <div className="w-4 h-4 rounded-full bg-grass-500/15 text-grass-600 dark:text-grass-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 stroke-[2.2]" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-court-100 dark:bg-court-800 text-court-400 flex items-center justify-center shrink-0 mt-0.5">
                      <X className="w-3 h-3 stroke-[2]" />
                    </div>
                  )}
                  <span
                    className={
                      isIncluded
                        ? 'text-court-800 dark:text-court-200'
                        : 'text-court-400 dark:text-court-500 line-through'
                    }
                  >
                    {text}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="pt-4">
        <Button
          variant={popular ? 'optic' : 'outline'}
          fullWidth
          disabled={disabled}
          onClick={onCtaClick}
        >
          {ctaText}
        </Button>
      </div>
    </div>
  );
};

export default PricingCard;
