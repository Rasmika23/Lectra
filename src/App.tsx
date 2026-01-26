import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import { LoginPage } from './pages/LoginPage';
import { MainCoordinatorDashboard } from './pages/MainCoordinatorDashboard';
import { CreateUserPage } from './pages/CreateUserPage';
import { CreateModulePage } from './pages/CreateModulePage';
import { SubCoordinatorDashboard } from './pages/SubCoordinatorDashboard';
import { ModuleManagementPage } from './pages/ModuleManagementPage';
import { LecturerPortal } from './pages/LecturerPortal';
import { LectureReschedulePage } from './pages/LectureReschedulePage';
import { AttendanceRecordingPage } from './pages/AttendanceRecordingPage';
import { LecturerProfilePage } from './pages/LecturerProfilePage';
import { UserProfilePage } from './pages/UserProfilePage';
import { ReportsPage } from './pages/ReportsPage';
import { SetupAccountPage } from './pages/SetupAccountPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { UserManagementPage } from './pages/UserManagementPage';

type Page =
  | 'login'
  | 'setup-account'
  | 'main-dashboard'
  | 'create-user'
  | 'create-module'
  | 'sub-dashboard'
  | 'module-management'
  | 'attendance'
  | 'lecturer-portal'
  | 'reschedule'
  | 'lecturer-profile'
  | 'user-profile'
  | 'reports'
  | 'forgot-password'
  | 'reset-password'
  | 'user-management';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('login');
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // Check for setup account URL
    if (window.location.pathname === '/setup-account') {
      setCurrentPage('setup-account');
    } else if (window.location.pathname === '/reset-password') {
      setCurrentPage('reset-password');
    }

    const checkConnection = async () => {
      try {
        const response = await fetch('http://localhost:5000/test-db');
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
  }, []);

  const handleLogin = (user: any) => {
    if (user) {
      setCurrentUser(user);

      // Route to appropriate dashboard based on role
      switch (user.role) {
        case 'main-coordinator':
          setCurrentPage('main-dashboard');
          break;
        case 'sub-coordinator':
          setCurrentPage('sub-dashboard');
          break;
        case 'lecturer':
          setCurrentPage('lecturer-portal');
          break;
        case 'staff':
          setCurrentPage('reports');
          break;
        default:
          setCurrentPage('login');
      }
    }
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page as Page);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentPage('login');
  };

  // Render appropriate page
  const renderPage = () => {
    if (!currentUser && currentPage !== 'login' && currentPage !== 'setup-account' && currentPage !== 'reset-password' && currentPage !== 'forgot-password') {
      return <LoginPage onLogin={handleLogin} onNavigate={handleNavigate} />;
    }

    switch (currentPage) {
      case 'login':
        return <LoginPage onLogin={handleLogin} onNavigate={handleNavigate} />;

      case 'main-dashboard':
        return <MainCoordinatorDashboard currentUser={currentUser} onNavigate={handleNavigate} onLogout={handleLogout} />;

      case 'create-user':
        return <CreateUserPage currentUser={currentUser} onNavigate={handleNavigate} onLogout={handleLogout} />;

      case 'create-module':
        return <CreateModulePage currentUser={currentUser} onNavigate={handleNavigate} />;

      case 'sub-dashboard':
        return <SubCoordinatorDashboard currentUser={currentUser} onNavigate={handleNavigate} onLogout={handleLogout} />;

      case 'module-management':
        return <ModuleManagementPage currentUser={currentUser} onNavigate={handleNavigate} />;

      case 'attendance':
        return <AttendanceRecordingPage currentUser={currentUser} onNavigate={handleNavigate} />;

      case 'lecturer-portal':
        return <LecturerPortal currentUser={currentUser} onNavigate={handleNavigate} />;

      case 'reschedule':
        return <LectureReschedulePage currentUser={currentUser} onNavigate={handleNavigate} />;

      case 'lecturer-profile':
        return <LecturerProfilePage currentUser={currentUser} onNavigate={handleNavigate} />;

      case 'user-profile':
        return <UserProfilePage currentUser={currentUser} onNavigate={handleNavigate} />;

      case 'reports':
        return <ReportsPage currentUser={currentUser} onNavigate={handleNavigate} />;

      case 'login':
        return <LoginPage onLogin={handleLogin} onNavigate={handleNavigate} />;

      case 'setup-account':
        return <SetupAccountPage onNavigate={handleNavigate} />;

      case 'forgot-password':
        return <ForgotPasswordPage onNavigate={handleNavigate} />;

      case 'reset-password':
        return <ResetPasswordPage onNavigate={handleNavigate} />;

      case 'main-dashboard':
        return <MainCoordinatorDashboard currentUser={currentUser} onNavigate={handleNavigate} onLogout={handleLogout} />;

      case 'user-management':
        return <UserManagementPage currentUser={currentUser} onNavigate={handleNavigate} onLogout={handleLogout} />;

      default:
        return <LoginPage onLogin={handleLogin} onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen">
      {renderPage()}
      <Toaster />
    </div>
  );
}