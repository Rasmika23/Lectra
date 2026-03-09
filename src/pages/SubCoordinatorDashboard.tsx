import React from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { Calendar, Clock, MapPin, AlertCircle } from 'lucide-react';
import { mockSessions, mockRescheduleRequests } from '../lib/mockData';

interface SubCoordinatorDashboardProps {
  currentUser: any;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export function SubCoordinatorDashboard({ currentUser, onNavigate, onLogout }: SubCoordinatorDashboardProps) {
  const upcomingSessions = mockSessions
    .filter(s => s.status === 'scheduled')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  const pendingRequests = mockRescheduleRequests.filter(r => r.status === 'pending');

  const completedSessions = mockSessions.filter(s => s.status === 'completed');
  const missedAttendance = completedSessions.filter(s => !s.attended).length;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-[var(--space-xl)]">
      {/* Page Title */}
      <div>
        <h1 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">
          Coordinator Dashboard
        </h1>
        <p className="text-[var(--color-text-secondary)] mt-[var(--space-sm)]">
          Manage your assigned modules and track lecturer sessions
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--space-lg)]">
        <Card padding="lg">
          <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mb-[var(--space-sm)]">
            Upcoming Sessions
          </p>
          <h2 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">
            {upcomingSessions.length}
          </h2>
          <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mt-[var(--space-xs)]">
            Next 7 days
          </p>
        </Card>

        <Card padding="lg">
          <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mb-[var(--space-sm)]">
            Sessions Completed
          </p>
          <h2 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">
            {completedSessions.length}
          </h2>
          <p className="text-[var(--font-size-small)] text-[var(--color-success)] mt-[var(--space-xs)]">
            This semester
          </p>
        </Card>

        <Card padding="lg">
          <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mb-[var(--space-sm)]">
            Missing Attendance
          </p>
          <h2 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">
            {missedAttendance}
          </h2>
          {missedAttendance > 0 ? (
            <p className="text-[var(--font-size-small)] text-[var(--color-error)] mt-[var(--space-xs)]">
              Needs recording
            </p>
          ) : (
            <p className="text-[var(--font-size-small)] text-[var(--color-success)] mt-[var(--space-xs)]">
              All up to date
            </p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-[var(--space-xl)]">
        {/* Upcoming Lectures */}
        <Card>
          <div className="flex items-center justify-between mb-[var(--space-lg)]">
            <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)]">
              Upcoming Lectures
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
            <div className="space-y-[var(--space-md)]">
              {upcomingSessions.map((session) => (
                <div
                  key={session.id}
                  className="p-[var(--space-lg)] bg-[var(--color-bg-main)] rounded-lg border-l-4 border-[var(--color-primary)]"
                >
                  <div className="flex items-start justify-between mb-[var(--space-md)]">
                    <div>
                      <h3 className="font-bold text-[var(--color-text-primary)]">
                        {session.moduleCode} - {session.moduleName}
                      </h3>
                      <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mt-1">
                        {session.lecturerName}
                      </p>
                    </div>
                    <StatusBadge status="info">Scheduled</StatusBadge>
                  </div>

                  <div className="space-y-[var(--space-sm)] text-[var(--font-size-small)]">
                    <div className="flex items-center gap-[var(--space-sm)] text-[var(--color-text-secondary)]">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(session.date)}</span>
                    </div>
                    <div className="flex items-center gap-[var(--space-sm)] text-[var(--color-text-secondary)]">
                      <Clock className="w-4 h-4" />
                      <span>{session.time} ({session.duration} hours)</span>
                    </div>
                    <div className="flex items-center gap-[var(--space-sm)] text-[var(--color-text-secondary)]">
                      <MapPin className="w-4 h-4" />
                      <span>{session.location}</span>
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
        <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)] mb-[var(--space-lg)]">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--space-md)]">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => onNavigate('attendance')}
          >
            Record Attendance
          </Button>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={() => onNavigate('module-management')}
          >
            Module Settings
          </Button>
          <Button
            variant="outline"
            size="lg"
            fullWidth
            onClick={() => onNavigate('reports')}
          >
            View Reports
          </Button>
        </div>
      </Card>
    </div>
  );
}