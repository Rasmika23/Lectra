/**
 * @file Button.tsx
 * @description Customizable button component with multiple variants, sizes, and loading states.
 */

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  icon,
  children,
  disabled,
  loading = false,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95';
  
  const variants = {
    primary: 'bg-gradient-to-r from-[var(--color-primary)] to-[#0891d1] text-white hover:from-[#1891d9] hover:to-[#0681c1] focus-visible:ring-[var(--color-primary)] shadow-md hover:shadow-lg',
    secondary: 'bg-gradient-to-r from-[var(--color-secondary)] to-[#0d4a71] text-white hover:from-[#0d4a71] hover:to-[#0a3a5a] focus-visible:ring-[var(--color-secondary)] shadow-md hover:shadow-lg',
    outline: 'border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white focus-visible:ring-[var(--color-primary)] hover:shadow-md',
    ghost: 'text-[var(--color-text-primary)] hover:bg-[var(--color-bg-sidebar)] focus-visible:ring-[var(--color-text-secondary)]',
    danger: 'bg-gradient-to-r from-[var(--color-error)] to-[#dc2626] text-white hover:from-[#dc2626] hover:to-[#b91c1c] focus-visible:ring-[var(--color-error)] shadow-md hover:shadow-lg',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-[var(--font-size-small)]',
    md: 'px-4 py-2 text-[var(--font-size-body)]',
    lg: 'px-6 py-3 text-[var(--font-size-h3)]',
  };
  
  const widthClass = fullWidth ? 'w-full' : '';
  
  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      ) : icon && (
        <span className="mr-1">{icon}</span>
      )}
      {children}
    </button>
  );
}