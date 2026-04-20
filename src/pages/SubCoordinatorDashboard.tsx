import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { Calendar, Clock, MapPin, AlertCircle, BookOpen } from 'lucide-react';
import { fetchWithAuth } from '../lib/api';

const API = API_BASE_URL;

interface SubCoordinatorDashboardProps {
  currentUser: any;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export function SubCoordinatorDashboard({ currentUser, onNavigate, onLogout }: SubCoordinatorDashboardProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API}/subcoordinator/dashboard-stats`);
      if (!res.ok) throw new Error('Failed to fetch dashboard stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
    
  const formatDate = (dateString: string) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  const upcomingSessions = stats?.upcomingSessions || [];
  const assignedModules = stats?.assignedModules || [];
  const upcomingCount = stats?.upcomingSessionsCount || 0;
  const missingAttendance = stats?.missingAttendanceCount || 0;

  return (
    <div className="h-full">
            
      <div className="flex-1 flex flex-col h-full">
                
        <main className="flex-1 overflow-y-auto p-[var(--space-xl)]">
          <div className="max-w-7xl mx-auto space-y-[var(--space-xl)]">
            {/* Page Title */}
            <div>
              <h1 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">
                Dashboard
              </h1>
              <p className="text-[var(--color-text-secondary)] mt-[var(--space-sm)]">
                Manage your assigned modules and track sessions
              </p>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--space-lg)]">
              <Card padding="lg" className="hover:shadow-md transition-shadow">
                <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mb-[var(--space-sm)] opacity-80">
                  Assigned Module
                </p>
                <div className="flex flex-col gap-2">
                  {assignedModules.length > 0 ? (
                    assignedModules.map((m: any) => (
                      <h2 key={m.moduleid} className="text-[var(--font-size-body)] font-bold text-[var(--color-primary)]">
                        {m.modulename}
                      </h2>
                    ))
                  ) : (
                    <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-secondary)]">
                      None
                    </h2>
                  )}
                </div>
                <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mt-[var(--space-xs)] opacity-80">
                   Currently managing
                </p>
              </Card>
              
              <Card padding="lg" className="hover:shadow-md transition-shadow">
                <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mb-[var(--space-sm)] opacity-80">
                  Upcoming Sessions
                </p>
                <h2 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">
                  {upcomingCount}
                </h2>
                <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mt-[var(--space-xs)] opacity-80">
                  Total scheduled
                </p>
              </Card>
              
              <Card padding="lg" className="hover:shadow-md transition-shadow">
                <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mb-[var(--space-sm)] opacity-80">
                  Missing Attendance
                </p>
                <h2 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">
                  {missingAttendance}
                </h2>
                {missingAttendance > 0 ? (
                  <p className="text-[var(--font-size-small)] text-[var(--color-error)] mt-[var(--space-xs)] opacity-80">
                    Needs recording
                  </p>
                ) : (
                  <p className="text-[var(--font-size-small)] text-[var(--color-success)] mt-[var(--space-xs)] font-medium">
                    All up to date
                  </p>
                )}
              </Card>
            </div>
            
            <div className="grid grid-cols-1 gap-[var(--space-xl)]">
              {/* Upcoming Lectures */}
              <Card className="flex flex-col">
                <div className="flex items-center justify-between mb-[var(--space-lg)]">
                  <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)]">
                    Upcoming Sessions
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate('module-management')}
                  >
                    Manage Modules
                  </Button>
                </div>
                
                {upcomingSessions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--space-md)] flex-1">
                    {upcomingSessions.map((session: any) => (
                      <div
                        key={session.id}
                        className="p-[var(--space-lg)] bg-[var(--color-bg-sidebar)] rounded-xl border-l-4 border-[var(--color-primary)] hover:bg-[var(--color-bg-main)] transition-colors"
                      >
                        <div className="flex items-start justify-between mb-[var(--space-md)]">
                          <div>
                            <h3 className="font-bold text-[var(--color-text-primary)]">
                              {session.modulecode} - {session.modulename} ({session.academicyear} - Sem {session.semester})
                            </h3>
                            <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mt-1">
                              {session.lecturername || 'No lecturer assigned'}
                            </p>
                          </div>
                          <StatusBadge status={session.status?.toLowerCase() === 'rescheduled' ? 'info' : 'warning'}>
                            {session.status}
                          </StatusBadge>
                        </div>
                        
                        <div className="flex flex-wrap gap-[var(--space-md)] text-[var(--font-size-small)]">
                          <div className="flex items-center gap-[var(--space-sm)] text-[var(--color-text-secondary)]">
                            <Calendar className="w-4 h-4 text-[var(--color-primary)]" />
                            <span>{formatDate(session.datetime)}</span>
                          </div>
                          <div className="flex items-center gap-[var(--space-sm)] text-[var(--color-text-secondary)]">
                            <Clock className="w-4 h-4 text-[var(--color-primary)]" />
                            <span>{session.time} ({Number(session.duration)}h)</span>
                          </div>
                          <div className="flex items-center gap-[var(--space-sm)] text-[var(--color-text-secondary)]">
                            <MapPin className="w-4 h-4 text-[var(--color-primary)]" />
                            <span className="truncate max-w-[150px]">{session.location}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-[var(--space-2xl)] text-[var(--color-text-secondary)]">
                    <Calendar className="w-12 h-12 mx-auto mb-[var(--space-md)] opacity-50" />
                    <p>No upcoming sessions scheduled</p>
                  </div>
                )}
              </Card>
            </div>
            
            {/* Quick Actions */}
            <Card>
              <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)] mb-[var(--space-lg)] pb-7">
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--space-md)]">
                <Button
                  variant="primary"
                  size="lg"
                  className="!py-6 flex flex-col gap-2"
                  onClick={() => onNavigate('attendance')}
                >
                  <div className="font-bold">Record Attendance</div>
                  <div className="text-xs font-normal opacity-80 text-center">Mark attendance for past sessions</div>
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  className="!py-6 flex flex-col gap-2"
                  onClick={() => onNavigate('module-management')}
                >
                  <div className="font-bold">Module Settings</div>
                  <div className="text-xs font-normal opacity-80 text-center">Manage schedules and lecturers</div>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="!py-6 flex flex-col gap-2 hover:bg-blue-50 hover:!text-black"
                  onClick={() => onNavigate('reports')}
                >
                  <div className="font-bold">View Reports</div>
                  <div className="text-xs font-normal opacity-80 text-center">Generate attendance and topic reports</div>
                </Button>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
