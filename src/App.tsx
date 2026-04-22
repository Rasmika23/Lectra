/**
 * @file App.tsx
 * @description Root component of the Lectra frontend. 
 * Manages authentication state, routing (via state), and global layout.
 */

import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from './config';
import { authHeaders } from './lib/api';
import { jwtDecode } from 'jwt-decode';
import { Toaster, toast } from 'sonner';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginPage } from './pages/LoginPage';
import { MainCoordinatorDashboard } from './pages/MainCoordinatorDashboard';
import { UserManagementPage } from './pages/UserManagementPage';
import { CreateUserPage } from './pages/CreateUserPage';
import { CreateModulePage } from './pages/CreateModulePage';
import { SubCoordinatorDashboard } from './pages/SubCoordinatorDashboard';
import { ModuleManagementPage } from './pages/ModuleManagementPage';
import { LecturerPortal } from './pages/LecturerPortal';
import { MyLecturesPage } from './pages/MyLecturesPage';
import { AttendanceRecordingPage } from './pages/AttendanceRecordingPage';
import { LecturerProfilePage } from './pages/LecturerProfilePage';
import { UserProfilePage } from './pages/UserProfilePage';
import { ReportsPage } from './pages/ReportsPage';
import { SetupAccountPage } from './pages/SetupAccountPage';
import { SubCoordinatorSessionsPage } from './pages/SubCoordinatorSessionsPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { TermsManagementPage } from './pages/TermsManagementPage';

type Page =
  | 'login'
  | 'setup-account'
  | 'main-dashboard'
  | 'user-management'
  | 'create-user'
  | 'create-module'
  | 'sub-dashboard'
  | 'module-management'
  | 'sub-sessions'
  | 'attendance'
  | 'lecturer-portal'
  | 'my-lectures'
  | 'lecturer-profile'
  | 'user-profile'
  | 'audit-log'
  | 'terms-management'
  | 'reports';

export default function App() {
  // ── STATE ─────────────────────────────────────────────────────────────────

  // Currently logged in user (restored from localStorage)
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const savedUser = localStorage.getItem('currentUser');
    const token = localStorage.getItem('jwtToken');

    if (savedUser && token) {
      try {
        const decoded: any = jwtDecode(token);
        // Check if token is expired (JWT exp is in seconds)
        if (decoded.exp * 1000 < Date.now()) {
          console.log('Token expired, logging out');
          localStorage.removeItem('currentUser');
          localStorage.removeItem('jwtToken');
          localStorage.removeItem('currentPage');
          return null;
        }
        return JSON.parse(savedUser);
      } catch (error) {
        console.error('Invalid token', error);
        localStorage.removeItem('currentUser');
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('currentPage');
        return null;
      }
    }
    return null;
  });

  const [currentPage, setCurrentPage] = useState<Page>(() => {
    const savedPage = localStorage.getItem('currentPage');
    // If they aren't logged in, default to login
    if (!localStorage.getItem('currentUser') && savedPage !== 'setup-account') {
      return 'login';
    }
    return (savedPage as Page) || 'login';
  });

  const [navigationParams, setNavigationParams] = useState<{moduleId?: string, sessionId?: string} | null>(() => {
    const savedParams = localStorage.getItem('navigationParams');
    return savedParams ? JSON.parse(savedParams) : null;
  });

  // ── EFFECTS ───────────────────────────────────────────────────────────────

  useEffect(() => {
    // Check for setup account URL
    if (window.location.pathname === '/setup-account') {
      setCurrentPage('setup-account');
    }

    const checkConnection = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/test-db`, { headers: authHeaders() });
        const data = await response.json();
        if (data.time) {
          toast.success('Connected to Backend & Database');
          console.log('DB Connection:', data);
        }
      } catch (error) {
        console.error('Connection failed:', error);
        toast.error('Failed to connect to Backend');
      }
    };

    checkConnection();

    // Listen for auth failures (401/403) from fetchWithAuth
    const handleAuthFailure = () => {
      console.log('Auth failure detected, logging out');
      toast.error('Session expired. Please log in again.');
      handleLogout();
    };

    window.addEventListener('auth-failure', handleAuthFailure);
    return () => window.removeEventListener('auth-failure', handleAuthFailure);
  }, []);

  // ── HANDLERS ─────────────────────────────────────────────────────────────

  const handleLogin = (user: any, token?: string) => {
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      if (token) {
        localStorage.setItem('jwtToken', token);
      }

      // Route to appropriate dashboard based on role
      let targetPage: Page = 'login';
      switch (user.role) {
        case 'main-coordinator':
          targetPage = 'main-dashboard';
          break;
        case 'sub-coordinator':
          targetPage = 'sub-dashboard';
          break;
        case 'lecturer':
          targetPage = 'lecturer-portal';
          break;
        case 'staff':
          targetPage = 'reports';
          break;
      }

      setCurrentPage(targetPage);
      localStorage.setItem('currentPage', targetPage);
    }
  };

  const handleNavigate = (page: string, params?: any) => {
    setCurrentPage(page as Page);
    setNavigationParams(params || null);
    localStorage.setItem('currentPage', page);
    if (params) {
      localStorage.setItem('navigationParams', JSON.stringify(params));
    } else {
      localStorage.removeItem('navigationParams');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentPage('login');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('currentPage');
  };

  const handleUserUpdate = (updatedUser: any) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
  };

  // ── RENDERING ────────────────────────────────────────────────────────────

  // Render appropriate page based on state
  const renderPage = () => {
    if (!currentUser && currentPage !== 'login' && currentPage !== 'setup-account') {
      return <LoginPage onLogin={handleLogin} />;
    }

    switch (currentPage) {
      case 'login':
        return <LoginPage onLogin={handleLogin} />;

      case 'main-dashboard':
        return <MainCoordinatorDashboard currentUser={currentUser} onNavigate={handleNavigate} onLogout={handleLogout} />;

      case 'user-management':
        return <UserManagementPage currentUser={currentUser} onNavigate={handleNavigate} onLogout={handleLogout} />;

      case 'create-user':
        return <CreateUserPage currentUser={currentUser} onNavigate={handleNavigate} onLogout={handleLogout} />;

      case 'create-module':
        return <CreateModulePage currentUser={currentUser} onNavigate={handleNavigate} onLogout={handleLogout} />;

      case 'sub-dashboard':
        return <SubCoordinatorDashboard currentUser={currentUser} onNavigate={handleNavigate} onLogout={handleLogout} />;

      case 'module-management':
        return <ModuleManagementPage currentUser={currentUser} onNavigate={handleNavigate} onLogout={handleLogout} />;

      case 'terms-management':
        return <TermsManagementPage currentUser={currentUser} onNavigate={handleNavigate} onLogout={handleLogout} />;

      case 'sub-sessions':
        return (
          <SubCoordinatorSessionsPage 
            currentUser={currentUser} 
            onNavigate={handleNavigate} 
            navigationParams={navigationParams}
            clearNavigationParams={() => {
              setNavigationParams(null);
              localStorage.removeItem('navigationParams');
            }}
          />
        );

      case 'attendance':
        return (
          <AttendanceRecordingPage 
            currentUser={currentUser} 
            onNavigate={handleNavigate} 
            onLogout={handleLogout}
            navigationParams={navigationParams}
            clearNavigationParams={() => {
              setNavigationParams(null);
              localStorage.removeItem('navigationParams');
            }}
          />
        );

      case 'lecturer-portal':
        return <LecturerPortal currentUser={currentUser} onNavigate={handleNavigate} onLogout={handleLogout} />;

      case 'my-lectures':
        return <MyLecturesPage currentUser={currentUser} onNavigate={handleNavigate} onLogout={handleLogout} />;

      case 'lecturer-profile':
        return <LecturerProfilePage currentUser={currentUser} onNavigate={handleNavigate} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />;

      case 'user-profile':
        return <UserProfilePage currentUser={currentUser} onNavigate={handleNavigate} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />;

      case 'reports':
        return <ReportsPage currentUser={currentUser} onNavigate={handleNavigate} onLogout={handleLogout} />;
      
      case 'audit-log':
        return <AuditLogPage />;

      case 'setup-account':
        return <SetupAccountPage onNavigate={handleNavigate} onLogin={handleLogin} />;

      default:
        return <LoginPage onLogin={handleLogin} />;
    }
  };

  const getDisplayRole = (role: string) => {
    switch (role) {
      case 'main-coordinator': return 'Main Coordinator';
      case 'sub-coordinator': return 'Sub-Coordinator';
      case 'lecturer': return 'Visiting Lecturer';
      case 'staff': return 'Staff';
      default: return '';
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[var(--color-bg-main)]">
      {currentUser && currentPage !== 'login' && currentPage !== 'setup-account' ? (
        <>
          <Header 
            userName={currentUser.name} 
            userRole={getDisplayRole(currentUser.role)} 
            onLogout={handleLogout}
            onProfileClick={() => handleNavigate('user-profile')}
          />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar role={currentUser.role} currentPage={currentPage} onNavigate={handleNavigate} />
            <main className="flex-1 overflow-y-auto w-full pb-8">
              {renderPage()}
            </main>
          </div>
        </>
      ) : (
        <div className="w-full h-full overflow-y-auto">
          {renderPage()}
        </div>
      )}
      <Toaster />
    </div>
  );
}