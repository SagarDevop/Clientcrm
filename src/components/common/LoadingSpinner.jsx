import React from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ text = 'Loading...', size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className={`flex flex-col items-center justify-center py-8 text-slate-500 dark:text-slate-400 ${className}`}>
      <Loader2 className={`${sizes[size] || sizes.md} animate-spin text-brand-600 mb-2`} />
      {text && <span className="text-xs font-medium">{text}</span>}
    </div>
  );
}
