import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  variant?: 'default' | 'premium';
}

export function Input({
  label,
  error,
  helperText,
  fullWidth = false,
  icon,
  className = '',
  id,
  required,
  variant = 'default',
  ...props
}: InputProps) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = error ? `${inputId}-error` : undefined;
  const helperId = helperText ? `${inputId}-helper` : undefined;
  
  const isPremium = variant === 'premium';
  
  return (
    <div className={`flex flex-col ${isPremium ? 'gap-0' : 'gap-[var(--space-sm)]'} ${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label
          htmlFor={inputId}
          className={isPremium 
            ? "block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 ml-1"
            : "text-[var(--font-size-small)] font-medium text-[var(--color-text-primary)]"
          }
        >
          {label}
          {required && <span className="text-[var(--color-error)] ml-1" aria-label="required">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-[var(--space-md)] top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={`
            ${icon ? 'pl-10' : 'pl-[var(--space-md)]'}
            ${isPremium ? 'pr-4 py-2' : 'pr-[var(--space-md)] py-[var(--space-sm)]'}
            border rounded-xl
            text-[var(--font-size-body)]
            transition-all duration-300
            w-full
            ${isPremium
              ? 'bg-white border-[#E2E8F0] hover:border-blue-400 focus:ring-2 focus:ring-blue-100 font-normal text-slate-700'
              : (error 
                ? 'border-[var(--color-error)] focus:border-[var(--color-error)] focus:ring-2 focus:ring-[var(--color-error)] focus:ring-opacity-20' 
                : 'border-[#CBD5E1] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)] focus:ring-opacity-10 hover:border-[var(--color-primary)]/50')
            }
            disabled:bg-[var(--color-bg-sidebar)] disabled:cursor-not-allowed
            ${className}
          `}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={[errorId, helperId].filter(Boolean).join(' ') || undefined}
          required={required}
          {...props}
        />
      </div>
      {error && (
        <span id={errorId} className="text-[var(--font-size-small)] text-[var(--color-error)]" role="alert">
          {error}
        </span>
      )}
      {helperText && !error && (
        <span id={helperId} className="text-[var(--font-size-small)] text-[var(--color-text-secondary)]">
          {helperText}
        </span>
      )}
    </div>
  );
}