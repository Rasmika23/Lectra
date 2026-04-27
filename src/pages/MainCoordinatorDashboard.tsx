/**
 * @file MainCoordinatorDashboard.tsx
 * @description Central dashboard for Main Coordinators.
 * Displays system-wide statistics, recent activity (audit logs), and modules requiring attention.
 */

import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { Users, BookOpen, Calendar, TrendingUp, UserCheck } from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import { formatDistanceToNow } from 'date-fns';

interface MainCoordinatorDashboardProps {
  currentUser: any;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export function MainCoordinatorDashboard({ currentUser, onNavigate, onLogout }: MainCoordinatorDashboardProps) {
  // ── STATE ─────────────────────────────────────────────────────────────────
  const [stats, setStats] = useState({
    activeLecturers: 0,
    activeSubCoordinators: 0,
    rescheduledSessions: 0,
    totalModules: 0,
    needingAttention: [] as any[]
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);
  const [isActivitiesLoading, setIsActivitiesLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setIsActivitiesLoading(true);
        
        const [statsRes, activitiesRes] = await Promise.all([
          fetchWithAuth(`${API_BASE_URL}/dashboard/stats`),
          fetchWithAuth(`${API_BASE_URL}/audit-log?limit=5`)
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        if (activitiesRes.ok) {
          const activitiesData = await activitiesRes.json();
          setActivities(activitiesData);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
        setIsActivitiesLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatActivityMessage = (log: any) => {
    const { action_type, details, target_type } = log;
    switch (action_type) {
      case 'LOGIN': return 'User logged in';
      case 'CREATE_MODULE': return `Created module ${details.code || ''}`;
      case 'DELETE_MODULE': return `Deleted module ${details.code || ''}`;
      case 'INVITE_USER': return `Invited ${details.email} as ${details.role}`;
      case 'MARK_ATTENDANCE': return `Recorded attendance for session`;
      case 'UPDATE_MODULE_SETTINGS': return `Updated settings for module`;
      case 'ADD_SCHEDULE_SLOT': return `Added new schedule slot`;
      case 'RESCHEDULE_SESSION': return `Rescheduled session`;
      case 'DELETE_SESSION': return `Cancelled/Deleted a session`;
      case 'ACCOUNT_SETUP': return `Completed account registration`;
      default: return action_type.replace(/_/g, ' ').toLowerCase();
    }
  };

  const getActivityDetail = (log: any) => {
    const { details, target_type, target_id } = log;
    if (details.name || details.code) return `${details.code || ''} ${details.name || ''}`.trim();
    if (details.email) return details.email;
    return `${target_type} ${target_id ? '#' + target_id : ''}`;
  };
  
  return (
    <div className="h-full">
            
      <div className="flex-1 flex flex-col h-full">
                
        <main className="flex-1 overflow-y-auto p-[var(--space-xl)]">
          <div className="max-w-7xl mx-auto space-y-[var(--space-xl)]">
            {/* Page Title */}
            <div>
              <h1 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">
                Dashboard Overview
              </h1>
              <p className="text-[var(--color-text-secondary)] mt-[var(--space-sm)]">
                Manage your department's visiting lecturer coordination
              </p>
            </div>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[var(--space-lg)]">
              {/* Active Lecturers */}
              <Card padding="lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mb-[var(--space-sm)]">
                      Active Lecturers
                    </p>
                    <h2 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">
                      {isLoading ? '...' : stats.activeLecturers}
                    </h2>
                    <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mt-[var(--space-xs)]">
                      Total lecturers
                    </p>
                  </div>
                  <div className="p-3 bg-[#D1FAE5] rounded-lg">
                    <Users className="w-6 h-6 text-[var(--color-success)]" />
                  </div>
                </div>
              </Card>

              {/* Active Sub Coordinators */}
              <Card padding="lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mb-[var(--space-sm)]">
                      Active Sub Coordinators
                    </p>
                    <h2 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">
                      {isLoading ? '...' : stats.activeSubCoordinators}
                    </h2>
                    <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mt-[var(--space-xs)]">
                      Total in system
                    </p>
                  </div>
                  <div className="p-3 bg-[#DBEAFE] rounded-lg">
                    <UserCheck className="w-6 h-6 text-[var(--color-info)]" />
                  </div>
                </div>
              </Card>

              {/* Rescheduled Sessions */}
              <Card padding="lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mb-[var(--space-sm)]">
                      Rescheduled Sessions
                    </p>
                    <h2 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">
                      {isLoading ? '...' : stats.rescheduledSessions}
                    </h2>
                    <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mt-[var(--space-xs)]">
                      Last 7 days
                    </p>
                  </div>
                  <div className="p-3 bg-[#FEF3C7] rounded-lg">
                    <Calendar className="w-6 h-6 text-[var(--color-warning)]" />
                  </div>
                </div>
              </Card>
              
              {/* Total Modules */}
              <Card padding="lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mb-[var(--space-sm)]">
                      Total Modules
                    </p>
                    <h2 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">
                      {isLoading ? '...' : stats.totalModules}
                    </h2>

                  </div>
                  <div className="p-3 bg-[#E0F2FE] rounded-lg">
                    <BookOpen className="w-6 h-6 text-[var(--color-primary)]" />
                  </div>
                </div>
              </Card>
            </div>
            
            {/* Quick Actions */}
            <Card>
              <div className="flex items-center justify-between mb-[var(--space-lg)]">
                <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)]">
                  Quick Actions
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--space-md)]">
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={() => onNavigate('create-user')}
                >
                  Create New User
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  fullWidth
                  onClick={() => onNavigate('create-module')}
                >
                  Create New Module
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  fullWidth
                  onClick={() => onNavigate('reports')}
                >
                  Generate Reports
                </Button>
              </div>
            </Card>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--space-xl)]">
              {/* Recent Activity */}
              <Card>
                <div className="flex items-center justify-between mb-[var(--space-lg)]">
                    <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)]">
                    Recent Activity
                    </h2>
                    <Button variant="ghost" size="sm" onClick={() => onNavigate('audit-log')}>View All</Button>
                </div>
                <div className="space-y-[var(--space-md)]">
                  {isActivitiesLoading ? (
                    <div className="py-8 text-center text-[var(--color-text-secondary)]">Loading activities...</div>
                  ) : activities.length === 0 ? (
                    <div className="py-8 text-center text-[var(--color-text-secondary)]">No recent activities</div>
                  ) : activities.map((log: any) => (
                    <div key={log.log_id} className="flex items-start gap-[var(--space-md)] pb-[var(--space-md)] border-b border-[#E2E8F0] last:border-0">
                      <div className="w-2 h-2 bg-[var(--color-primary)] rounded-full mt-2" aria-hidden="true" />
                      <div className="flex-1">
                        <p className="font-medium text-[var(--color-text-primary)]">
                          {formatActivityMessage(log)}
                        </p>
                        <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mt-1">
                          {getActivityDetail(log)} • <span className="text-[var(--color-text-primary)]">{log.user_name || 'System'}</span>
                        </p>
                        <p className="text-[var(--font-size-tiny)] text-[var(--color-text-disabled)] mt-1">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              
              {/* Modules Needing Attention */}
              <Card>
                <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)] mb-[var(--space-lg)]">
                  Modules Needing Attention
                </h2>
                <div className="space-y-[var(--space-md)]">
                  {isLoading ? (
                    <div className="py-8 text-center text-[var(--color-text-secondary)]">Loading modules...</div>
                  ) : stats.needingAttention.length === 0 ? (
                    <div className="py-8 text-center text-[var(--color-text-secondary)]">All modules have staff assigned</div>
                  ) : stats.needingAttention.map((module: any) => (
                    <div key={module.moduleid} className="flex items-start justify-between p-[var(--space-md)] bg-[var(--color-bg-main)] rounded-lg hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => onNavigate('module-management')}>
                      <div className="flex-1">
                        <div className="flex items-center gap-[var(--space-sm)] mb-[var(--space-xs)]">
                          <h3 className="font-bold text-[var(--color-text-primary)]">
                            {module.code}
                          </h3>
                          {!module.subcoordinatorid && (
                            <StatusBadge status="warning">No Coordinator</StatusBadge>
                          )}
                          {module.lecturer_count === 0 && (
                            <StatusBadge status="error">No Lecturers</StatusBadge>
                          )}
                        </div>
                        <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)]">
                          {module.name}
                        </p>
                        <p className="text-[var(--font-size-tiny)] text-[var(--color-text-disabled)] mt-1">
                          {module.academicyear} • Semester {module.semester}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}