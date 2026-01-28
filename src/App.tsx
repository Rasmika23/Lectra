import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import { LoginPage } from './pages/LoginPage';
import { MainCoordinatorDashboard } from './pages/MainCoordinatorDashboard';
import { CreateUserPage } from './pages/CreateUserPage';
import { CreateModulePage } from './pages/CreateModulePage';
import { SubCoordinatorDashboard } from './pages/SubCoordinatorDashboard';
import { ModuleManagementPage } from './pages/ModuleManagementPage';
import { ModulesPage } from './pages/ModulesPage'; // Imported
import { LecturerPortal } from './pages/LecturerPortal';
import { LecturerSessionsPage } from './pages/LecturerSessionsPage';
import { LectureReschedulePage } from './pages/LectureReschedulePage';
import { AttendanceRecordingPage } from './pages/AttendanceRecordingPage';
import { LecturerProfilePage } from './pages/LecturerProfilePage';
import { UserProfilePage } from './pages/UserProfilePage';
import { ReportsPage } from './pages/ReportsPage';
import { SetupAccountPage } from './pages/SetupAccountPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { Layout } from './components/Layout';

type Page =
  | 'login'
  | 'setup-account'
  | 'main-dashboard'
  | 'create-user'
  | 'create-module'
  | 'sub-dashboard'
  | 'module-management'
  | 'modules' // Added
  | 'attendance'
  | 'lecturer-portal'
  | 'lecturer-sessions'
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
  const [navigationState, setNavigationState] = useState<any>(null); // Added for passing data between pages

  useEffect(() => {
    // Check for setup account URL
    // Check for setup account URL
    if (window.location.pathname === '/setup-account') {
      setCurrentPage('setup-account');
    } else if (window.location.pathname === '/reset-password') {
      setCurrentPage('reset-password');
    } else {
      // Check for saved session
      const savedUser = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser);
          setCurrentUser(user);
          // Restore correct page based on role
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
        } catch (e) {
          console.error('Failed to parse saved user', e);
          localStorage.removeItem('currentUser');
          sessionStorage.removeItem('currentUser');
        }
      }
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

  const handleLogin = (user: any, remember: boolean) => {
    if (user) {
      setCurrentUser(user);

      // Save session
      if (remember) {
        localStorage.setItem('currentUser', JSON.stringify(user));
      } else {
        sessionStorage.setItem('currentUser', JSON.stringify(user));
      }

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

  const handleNavigate = (page: string, state?: any) => {
    setNavigationState(state || null); // Reset state if not provided
    setCurrentPage(page as Page);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentPage('login');
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentUser');
  };

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'main-coordinator':
        return 'Main Coordinator';
      case 'sub-coordinator':
        return 'Sub-Coordinator';
      case 'staff':
        return 'Staff';
      case 'lecturer':
        return 'Lecturer';
      default:
        return role;
    }
  };

  // Helper to determine if the page is public (no layout needed)
  const isPublicPage = (page: Page) => {
    return ['login', 'setup-account', 'forgot-password', 'reset-password'].includes(page);
  };

  // Render appropriate page content (without layout)
  const renderPageContent = () => {
    switch (currentPage) {
      case 'main-dashboard':
        return <MainCoordinatorDashboard currentUser={currentUser} onNavigate={handleNavigate} onLogout={handleLogout} />;

      case 'create-user':
        return <CreateUserPage currentUser={currentUser} onNavigate={handleNavigate} onLogout={handleLogout} />;

      case 'create-module':
        return <CreateModulePage currentUser={currentUser} onNavigate={handleNavigate} />;

      case 'sub-dashboard':
        return <SubCoordinatorDashboard currentUser={currentUser} onNavigate={handleNavigate} onLogout={handleLogout} />;

      case 'modules': // Added
        return <ModulesPage currentUser={currentUser} onNavigate={handleNavigate} />;

      case 'module-management':
        return <ModuleManagementPage currentUser={currentUser} onNavigate={handleNavigate} />;

      case 'attendance':
        return <AttendanceRecordingPage currentUser={currentUser} onNavigate={handleNavigate} />;

      case 'lecturer-portal':
        return <LecturerPortal currentUser={currentUser} onNavigate={handleNavigate} />;

      case 'lecturer-sessions':
        return <LecturerSessionsPage currentUser={currentUser} onNavigate={handleNavigate} />;

      case 'reschedule':
        return <LectureReschedulePage currentUser={currentUser} onNavigate={handleNavigate} locationState={navigationState} />;

      case 'lecturer-profile':
        return <LecturerProfilePage currentUser={currentUser} onNavigate={handleNavigate} />;

      case 'user-profile':
        return <UserProfilePage currentUser={currentUser} onNavigate={handleNavigate} />;

      case 'reports':
        return <ReportsPage currentUser={currentUser} onNavigate={handleNavigate} />;

      case 'user-management':
        return <UserManagementPage currentUser={currentUser} onNavigate={handleNavigate} onLogout={handleLogout} />;

      default:
        return null;
    }
  };

  // Main render logic
  const renderApp = () => {
    if (!currentUser && !isPublicPage(currentPage)) {
      return <LoginPage onLogin={handleLogin} onNavigate={handleNavigate} />;
    }

    if (isPublicPage(currentPage)) {
      switch (currentPage) {
        case 'login':
          return <LoginPage onLogin={handleLogin} onNavigate={handleNavigate} />;
        case 'setup-account':
          return <SetupAccountPage onNavigate={handleNavigate} />;
        case 'forgot-password':
          return <ForgotPasswordPage onNavigate={handleNavigate} />;
        case 'reset-password':
          return <ResetPasswordPage onNavigate={handleNavigate} />;
        default:
          return <LoginPage onLogin={handleLogin} onNavigate={handleNavigate} />;
      }
    }

    // Authenticated pages with Layout
    return (
      <Layout
        role={currentUser.role}
        currentPage={currentPage}
        userName={currentUser.name}
        userRoleDisplay={getRoleDisplay(currentUser.role)}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        onProfileClick={() => handleNavigate('user-profile')}
        notificationCount={3} // You might want to make this dynamic later
      >
        {renderPageContent()}
      </Layout>
    );
  };

  return (
    <div className="min-h-screen">
      {renderApp()}
      <Toaster />
    </div>
  );
}