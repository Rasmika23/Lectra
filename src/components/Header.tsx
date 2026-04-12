import React, { useState, useRef, useEffect } from 'react';
import { Bell, UserCircle, User, LogOut, ChevronDown } from 'lucide-react';
import logo from '@/assets/lectra_logo.png';

interface HeaderProps {
  userName: string;
  userRole: string;
  notificationCount?: number;
  onProfileClick?: () => void;
  onLogout?: () => void;
}

export function Header({ userName, userRole, notificationCount = 0, onProfileClick, onLogout }: HeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="bg-[var(--color-bg-surface)] border-b border-[#E2E8F0] px-[var(--space-xl)] py-[var(--space-md)] shadow-sm z-50 transition-all duration-300">
      <div className="flex items-center justify-between">
        {/* Logo Section */}
        <div className="flex flex-col items-start gap-1">
          <img src={logo} alt="Lectra Logo" className="h-[50px] w-auto animate-[fadeIn_0.5s_ease-out]" />
          <p 
            className="text-[13px] text-[var(--color-text-primary)] font-bold uppercase tracking-wider -mt-1 mb-8 opacity-80"
          >
            Visiting Lecturer Management
          </p>
        </div>
        
        <div className="flex items-center gap-[var(--space-lg)]">
          {/* User Card */}
          <div 
            className="flex items-center gap-[var(--space-md)] bg-[var(--color-bg-sidebar)]/50 px-[var(--space-md)] py-[var(--space-xs)] rounded-2xl hover:bg-[var(--color-bg-sidebar)] transition-all duration-300 cursor-pointer group"
            onClick={onProfileClick}
          >
            <div className="relative">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
                <User className="w-6 h-6 text-[var(--color-primary)]" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[var(--color-success)] border-2 border-white rounded-full shadow-sm"></div>
            </div>
            <div className="hidden sm:block">
              <p className="text-[var(--font-size-small)] font-medium text-[var(--color-text-primary)] leading-none">
                {userName}
              </p>
              <p className="text-[11px] text-[var(--color-text-disabled)] mt-1 font-medium">
                {userRole}
              </p>
            </div>
          </div>

          <div className="w-px h-8 bg-[#E2E8F0]"></div>
          
          {/* Logout Icon */}
          <button
            onClick={onLogout}
            className="p-3 bg-red-50 text-[var(--color-error)] rounded-xl hover:bg-red-500 hover:text-white transition-all duration-300 group shadow-sm active:scale-95"
            aria-label="Logout"
          >
            <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
          </button>
        </div>
      </div>
    </header>
  );
}