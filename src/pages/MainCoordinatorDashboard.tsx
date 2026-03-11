import React from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { Users, BookOpen, Calendar, TrendingUp } from 'lucide-react';
import { mockModules, mockUsers, mockSessions } from '../lib/mockData';

interface MainCoordinatorDashboardProps {
  currentUser: any;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export function MainCoordinatorDashboard({ currentUser, onNavigate, onLogout }: MainCoordinatorDashboardProps) {
  const totalModules = mockModules.length;
  const activeLecturers = mockUsers.filter(u => u.role === 'lecturer').length;
  const upcomingSessions = mockSessions.filter(s => s.status === 'scheduled').length;
  const completionRate = Math.round((mockSessions.filter(s => s.status === 'completed').length / mockSessions.length) * 100);
  
  const recentActivity = [
    { action: 'New module created', detail: 'COSC 3301 - Machine Learning', time: '2 hours ago' },
    { action: 'Lecturer assigned', detail: 'Dr. Emily Chen to COSC 2202', time: '5 hours ago' },
    { action: 'Session completed', detail: 'COSC 2203 - Database Systems', time: '1 day ago' },
    { action: 'User created', detail: 'New lecturer account for Prof. Michael Brown', time: '2 days ago' },
  ];
  
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
              <Card padding="lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mb-[var(--space-sm)]">
                      Total Modules
                    </p>
                    <h2 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">
                      {totalModules}
                    </h2>
                    <p className="text-[var(--font-size-small)] text-[var(--color-success)] mt-[var(--space-xs)]">
                      +2 this semester
                    </p>
                  </div>
                  <div className="p-3 bg-[#E0F2FE] rounded-lg">
                    <BookOpen className="w-6 h-6 text-[var(--color-primary)]" />
                  </div>
                </div>
              </Card>
              
              <Card padding="lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mb-[var(--space-sm)]">
                      Active Lecturers
                    </p>
                    <h2 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">
                      {activeLecturers}
                    </h2>
                    <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mt-[var(--space-xs)]">
                      Across all modules
                    </p>
                  </div>
                  <div className="p-3 bg-[#D1FAE5] rounded-lg">
                    <Users className="w-6 h-6 text-[var(--color-success)]" />
                  </div>
                </div>
              </Card>
              
              <Card padding="lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mb-[var(--space-sm)]">
                      Upcoming Sessions
                    </p>
                    <h2 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">
                      {upcomingSessions}
                    </h2>
                    <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mt-[var(--space-xs)]">
                      Next 7 days
                    </p>
                  </div>
                  <div className="p-3 bg-[#FEF3C7] rounded-lg">
                    <Calendar className="w-6 h-6 text-[var(--color-warning)]" />
                  </div>
                </div>
              </Card>
              
              <Card padding="lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mb-[var(--space-sm)]">
                      Completion Rate
                    </p>
                    <h2 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">
                      {completionRate}%
                    </h2>
                    <p className="text-[var(--font-size-small)] text-[var(--color-success)] mt-[var(--space-xs)]">
                      +5% from last month
                    </p>
                  </div>
                  <div className="p-3 bg-[#DBEAFE] rounded-lg">
                    <TrendingUp className="w-6 h-6 text-[var(--color-info)]" />
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
                <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)] mb-[var(--space-lg)]">
                  Recent Activity
                </h2>
                <div className="space-y-[var(--space-md)]">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start gap-[var(--space-md)] pb-[var(--space-md)] border-b border-[#E2E8F0] last:border-0">
                      <div className="w-2 h-2 bg-[var(--color-primary)] rounded-full mt-2" aria-hidden="true" />
                      <div className="flex-1">
                        <p className="font-medium text-[var(--color-text-primary)]">
                          {activity.action}
                        </p>
                        <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mt-1">
                          {activity.detail}
                        </p>
                        <p className="text-[var(--font-size-tiny)] text-[var(--color-text-disabled)] mt-1">
                          {activity.time}
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
                  {mockModules.map((module) => (
                    <div key={module.id} className="flex items-start justify-between p-[var(--space-md)] bg-[var(--color-bg-main)] rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-[var(--space-sm)] mb-[var(--space-xs)]">
                          <h3 className="font-bold text-[var(--color-text-primary)]">
                            {module.code}
                          </h3>
                          {!module.subCoordinator && (
                            <StatusBadge status="warning">No Coordinator</StatusBadge>
                          )}
                          {module.lecturers.length === 0 && (
                            <StatusBadge status="error">No Lecturers</StatusBadge>
                          )}
                        </div>
                        <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)]">
                          {module.name}
                        </p>
                        <p className="text-[var(--font-size-tiny)] text-[var(--color-text-disabled)] mt-1">
                          {module.academicYear} • {module.semester}
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