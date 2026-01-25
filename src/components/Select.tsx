import React from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

export function Select({
  label,
  options,
  error,
  helperText,
  fullWidth = false,
  className = '',
  id,
  required,
  ...props
}: SelectProps) {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = error ? `${selectId}-error` : undefined;
  const helperId = helperText ? `${selectId}-helper` : undefined;
  
  return (
    <div className={`flex flex-col gap-[var(--space-sm)] ${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-[var(--font-size-small)] font-medium text-[var(--color-text-primary)]"
        >
          {label}
          {required && <span className="text-[var(--color-error)] ml-1" aria-label="required">*</span>}
        </label>
      )}
      <select
        id={selectId}
        className={`
          px-[var(--space-md)] py-[var(--space-sm)]
          border rounded-lg
          text-[var(--font-size-body)]
          transition-all duration-200
          bg-white
          ${error 
            ? 'border-[var(--color-error)] focus:border-[var(--color-error)] focus:ring-2 focus:ring-[var(--color-error)] focus:ring-opacity-20' 
            : 'border-[#CBD5E1] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-opacity-20'
          }
          disabled:bg-[var(--color-bg-sidebar)] disabled:cursor-not-allowed
          ${className}
        `}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={[errorId, helperId].filter(Boolean).join(' ') || undefined}
        required={required}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
