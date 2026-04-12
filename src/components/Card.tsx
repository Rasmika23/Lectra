import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ children, className = '', padding = 'lg' }: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-[var(--space-md)]',
    md: 'p-[var(--space-lg)]',
    lg: 'p-[var(--space-xl)]',
  };
  
  return (
    <div className={`bg-[var(--color-bg-surface)] rounded-xl shadow-lg border border-[#E2E8F0] ${paddingClasses[padding]} ${className} hover:shadow-xl hover:border-[var(--color-primary)]/20 transition-all duration-300`}>
      {children}
    </div>
  );
}