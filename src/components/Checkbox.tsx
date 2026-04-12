import React from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelClassName?: string;
}

export function Checkbox({ label, labelClassName = '', className = '', id, ...props }: CheckboxProps) {
  const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className="flex items-center gap-[var(--space-sm)]">
      <input
        type="checkbox"
        id={checkboxId}
        className={`
          w-4 h-4
          rounded
          border-2 border-[#CBD5E1]
          text-[var(--color-primary)]
          focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-opacity-20
          cursor-pointer
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
        {...props}
      />
      {label && (
        <label
          htmlFor={checkboxId}
          className={`text-[var(--font-size-body)] text-[var(--color-text-primary)] cursor-pointer select-none ${labelClassName}`}
        >
          {label}
        </label>
      )}
    </div>
  );
}
