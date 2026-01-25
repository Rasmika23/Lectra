import React from 'react';

interface StatusBadgeProps {
  status: 'success' | 'error' | 'warning' | 'info' | 'neutral';
  children: React.ReactNode;
}

export function StatusBadge({ status, children }: StatusBadgeProps) {
  const variants = {
    success: 'bg-gradient-to-r from-[#D1FAE5] to-[#A7F3D0] text-[#065F46] border-[#10B981]',
    error: 'bg-gradient-to-r from-[#FEE2E2] to-[#FECACA] text-[#991B1B] border-[#EF4444]',
    warning: 'bg-gradient-to-r from-[#FEF3C7] to-[#FDE68A] text-[#92400E] border-[#F59E0B]',
    info: 'bg-gradient-to-r from-[#DBEAFE] to-[#BFDBFE] text-[#1E40AF] border-[#3B82F6]',
    neutral: 'bg-gradient-to-r from-[var(--color-bg-sidebar)] to-[#E2E8F0] text-[var(--color-text-secondary)] border-[#CBD5E1]',
  };
  
  return (
    <span className={`inline-flex items-center px-[var(--space-md)] py-[var(--space-xs)] rounded-full text-[var(--font-size-small)] font-medium border-2 ${variants[status]} shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105`}>
      {children}
    </span>
  );
}