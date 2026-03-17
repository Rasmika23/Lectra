import React from 'react';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileText,
  Settings,
  Calendar,
  UserCircle,
  LogOut,
  ClipboardList,
  Clock
} from 'lucide-react';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  href: string;
  active?: boolean;
}

interface SidebarProps {
  role: 'main-coordinator' | 'sub-coordinator' | 'lecturer' | 'staff';
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout?: () => void;
}

export function Sidebar({ role, currentPage, onNavigate, onLogout }: SidebarProps) {
  const getNavItems = (): NavItem[] => {
    switch (role) {
      case 'main-coordinator':
        return [
          { label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, href: 'main-dashboard' },
          { label: 'User Management', icon: <Users className="w-5 h-5" />, href: 'user-management' },
          { label: 'Module Management', icon: <Settings className="w-5 h-5" />, href: 'module-management' },
          { label: 'Reports', icon: <FileText className="w-5 h-5" />, href: 'reports' },
        ];
      case 'sub-coordinator':
        return [
          { label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, href: 'sub-dashboard' },
          { label: 'Module Management', icon: <Settings className="w-5 h-5" />, href: 'module-management' },
          { label: 'Sessions', icon: <Calendar className="w-5 h-5" />, href: 'sub-sessions' },
          { label: 'Attendance', icon: <ClipboardList className="w-5 h-5" />, href: 'attendance' },
          { label: 'Reports', icon: <FileText className="w-5 h-5" />, href: 'reports' },
        ];
      case 'lecturer':
        return [
          { label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, href: 'lecturer-portal' },
          { label: 'My Lectures', icon: <BookOpen className="w-5 h-5" />, href: 'my-lectures' },
          { label: 'My Profile', icon: <UserCircle className="w-5 h-5" />, href: 'lecturer-profile' },
        ];
      case 'staff':
        return [
          { label: 'Reports', icon: <FileText className="w-5 h-5" />, href: 'reports' },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <aside
      className="w-64 bg-gradient-to-b from-[var(--color-bg-surface)] to-[var(--color-bg-sidebar)]/30 border-r border-[#E2E8F0] flex flex-col shadow-lg"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="p-[var(--space-lg)] border-b border-[#E2E8F0] bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] text-white">
        <h1 className="text-[var(--font-size-h2)] font-bold animate-[fadeIn_0.5s_ease-out]">
          Lectra
        </h1>
        <p className="text-[var(--font-size-small)] mt-1 opacity-90">
          Lecturer Management
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-[var(--space-md)]" aria-label="Sidebar navigation">
        <ul className="space-y-[var(--space-xs)]">
          {navItems.map((item, index) => {
            const isActive = currentPage === item.href;
            return (
              <li key={item.href} style={{ animationDelay: `${index * 0.05}s` }} className="animate-[fadeIn_0.3s_ease-out]">
                <button
                  onClick={() => onNavigate(item.href)}
                  className={`
                    w-full flex items-center gap-[var(--space-md)] px-[var(--space-md)] py-[var(--space-sm)]
                    rounded-xl text-left transition-all duration-300 group relative overflow-hidden
                    ${isActive
                      ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] text-white shadow-lg transform scale-105'
                      : 'text-[var(--color-text-primary)] hover:bg-[var(--color-bg-sidebar)] hover:translate-x-1'
                    }
                  `}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className={`${isActive ? 'animate-[float_2s_ease-in-out_infinite]' : 'group-hover:scale-110 transition-transform duration-200'}`}>
                    {item.icon}
                  </span>
                  <span className="font-medium">{item.label}</span>
                  {isActive && (
                    <span className="absolute right-0 top-0 bottom-0 w-1 bg-white rounded-l-full"></span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-[var(--space-md)] border-t border-[#E2E8F0]">
        <button
          onClick={() => {
            if (onLogout) {
              onLogout();
            } else {
              onNavigate('login');
            }
          }}
          className="w-full flex items-center gap-[var(--space-md)] px-[var(--space-md)] py-[var(--space-sm)] rounded-lg text-left text-[var(--color-error)] hover:bg-[#FEE2E2] transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}