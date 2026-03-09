import React, { useState, useRef, useEffect } from 'react';
import { Bell, UserCircle, User, LogOut, ChevronDown } from 'lucide-react';

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
    <header className="bg-[var(--color-bg-surface)] border-b border-[#E2E8F0] px-[var(--space-xl)] py-[var(--space-lg)] shadow-sm animate-[slideInDown_0.5s_ease-out]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[var(--font-size-h3)] font-bold text-[var(--color-text-primary)]">
            Welcome back, {userName}
          </h2>
          <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mt-1">
            {userRole}
          </p>
        </div>

        <div className="flex items-center gap-[var(--space-lg)]">
          {/* Notifications */}
          <button
            className="relative p-2 rounded-lg hover:bg-[var(--color-bg-sidebar)] transition-all duration-300 hover:scale-105 active:scale-95"
            aria-label={`Notifications${notificationCount > 0 ? `, ${notificationCount} unread` : ''}`}
          >
            <Bell className="w-6 h-6 text-[var(--color-text-secondary)] transition-colors" />
            {notificationCount > 0 && (
              <span
                className="absolute top-1 right-1 w-5 h-5 bg-[var(--color-error)] text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-[pulse_2s_ease-in-out_infinite]"
                aria-hidden="true"
              >
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>

          {/* User Profile */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-[var(--space-sm)] p-2 rounded-lg hover:bg-[var(--color-bg-sidebar)] transition-all duration-300 hover:scale-105 active:scale-95"
              aria-label="User profile"
              aria-expanded={isDropdownOpen}
            >
              <UserCircle className="w-8 h-8 text-[var(--color-text-secondary)] transition-colors duration-300 hover:text-[var(--color-primary)]" />
              <ChevronDown className={`w-4 h-4 text-[var(--color-text-secondary)] transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-[var(--color-bg-surface)] border border-[#E2E8F0] rounded-xl shadow-2xl z-50 overflow-hidden animate-[slideInDown_0.2s_ease-out]">
                <button
                  className="w-full flex items-center gap-[var(--space-md)] px-[var(--space-lg)] py-[var(--space-md)] text-[var(--font-size-small)] text-[var(--color-text-primary)] hover:bg-gradient-to-r hover:from-[var(--color-primary)]/5 hover:to-[var(--color-primary)]/10 transition-all duration-200 group"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onProfileClick?.();
                  }}
                >
                  <User className="w-4 h-4 text-[var(--color-primary)] group-hover:scale-110 transition-transform duration-200" />
                  <span className="font-medium">My Profile</span>
                </button>
                <div className="border-t border-[#E2E8F0]"></div>
                <button
                  className="w-full flex items-center gap-[var(--space-md)] px-[var(--space-lg)] py-[var(--space-md)] text-[var(--font-size-small)] text-[var(--color-error)] hover:bg-[#FEE2E2] transition-all duration-200 group"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onLogout?.();
                  }}
                >
                  <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}