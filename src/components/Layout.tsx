import React, { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface LayoutProps {
    children: ReactNode;
    role: string;
    currentPage: string;
    userName: string;
    userRoleDisplay: string;
    onNavigate: (page: string) => void;
    onLogout?: () => void;
    notificationCount?: number;
    onProfileClick?: () => void;
}

export function Layout({
    children,
    role,
    currentPage,
    userName,
    userRoleDisplay,
    onNavigate,
    onLogout,
    notificationCount = 0,
    onProfileClick
}: LayoutProps) {
    return (
        <div className="flex h-screen bg-[var(--color-bg-main)]">
            <Sidebar role={role as any} currentPage={currentPage} onNavigate={onNavigate} />

            <div className="flex-1 flex flex-col overflow-hidden">
                <Header
                    userName={userName}
                    userRole={userRoleDisplay}
                    notificationCount={notificationCount}
                    onProfileClick={onProfileClick}
                    onLogout={onLogout}
                />

                <main className="flex-1 overflow-y-auto p-[var(--space-xl)]">
                    {children}
                </main>
            </div>
        </div>
    );
}
