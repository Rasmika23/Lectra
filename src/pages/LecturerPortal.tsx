import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { Calendar, Clock, MapPin, User, FileText } from 'lucide-react';
import { fetchWithAuth } from '../lib/api';

interface LecturerPortalProps {
  currentUser: any;
  onNavigate: (page: string) => void;
  onLogout?: () => void;
}

export function LecturerPortal({ currentUser, onNavigate, onLogout }: LecturerPortalProps) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const lecturerId = currentUser.userid ?? currentUser.id;

  useEffect(() => {
    if (!lecturerId) return;
    setLoading(true);
    fetchWithAuth(`${API_BASE_URL}/lecturers/${lecturerId}/sessions`)
      .then(r => r.json())
      .then(data => {
        setSessions(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch lecturer sessions:', err);
        setLoading(false);
      });
  }, [lecturerId]);

  const upcomingSessions = sessions
    .filter(s => 
      s.status?.toLowerCase() === 'scheduled' || 
      s.status?.toLowerCase() === 'upcoming' || 
      s.status?.toLowerCase() === 'rescheduled'
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
  const completedSessions = sessions.filter(s => s.status?.toLowerCase() === 'completed');

  // Calculate 7-day window counts
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(today.getDate() + 7);
  sevenDaysFromNow.setHours(23, 59, 59, 999);
  
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const upcomingNextWeekCount = upcomingSessions.filter(s => {
    const d = new Date(s.date);
    return d >= today && d <= sevenDaysFromNow;
  }).length;

  const completedLastWeekCount = completedSessions.filter(s => {
    const d = new Date(s.date);
    return d >= sevenDaysAgo && d <= now;
  }).length;
  
  const formatDate = (dateString: string) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  const isUpcoming = (dateString: string) => {
    const sessionDate = new Date(dateString);
    const today = new Date();
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(today.getDate() + 2);
    return sessionDate <= twoDaysFromNow && sessionDate >= today;
  };
  
  return (
    <div className="h-full">
      <div className="flex-1 flex flex-col h-full">
        <main className="flex-1 overflow-y-auto p-[var(--space-xl)]">
          <div className="max-w-6xl mx-auto space-y-[var(--space-xl)]">
            {/* Page Title */}
            <div>
              <h1 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">Dashboard</h1>
              <p className="text-[var(--color-text-secondary)] mt-[var(--space-sm)]">
                View your upcoming sessions and manage your teaching schedule
              </p>
            </div>
            
            {/* Profile Summary Card */}
            <Card className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-[var(--space-lg)]">
                  <div>
                    <h2 className="text-[var(--font-size-h2)] font-bold">{currentUser.name}</h2>
                    <p className="opacity-90 mt-1">{currentUser.email}</p>
                    {currentUser.phone && (
                      <p className="opacity-90 mt-1">{currentUser.phone}</p>
                    )}
                  </div>
                </div>
                <button
                  className="!bg-white text-[#111111] font-bold px-4 py-2 rounded-lg inline-flex items-center transition-all duration-200 hover:bg-gray-100 hover:shadow-md active:scale-95"
                  onClick={() => onNavigate('lecturer-profile')}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Edit Profile
                </button>
              </div>
            </Card>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--space-lg)]">
              <Card padding="lg" className="hover:shadow-md transition-shadow">
                <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mb-[var(--space-sm)]">
                  Upcoming Sessions
                </p>
                <h2 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">
                  {loading ? '...' : upcomingNextWeekCount}
                </h2>
                <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mt-[var(--space-xs)]">
                  In the next 7 days
                </p>
              </Card>
              
              <Card padding="lg" className="hover:shadow-md transition-shadow">
                <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mb-[var(--space-sm)]">
                  Sessions Completed
                </p>
                <h2 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">
                  {loading ? '...' : completedLastWeekCount}
                </h2>
                <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mt-[var(--space-xs)]">
                   In the last 7 days
                </p>
              </Card>
              
              <Card padding="lg">
                <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mb-[var(--space-sm)]">
                  Total Hours
                </p>
                <h2 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">
                  {loading ? '...' : completedSessions.reduce((sum, s) => sum + (parseFloat(s.duration) || 0), 0)}
                </h2>
              </Card>
            </div>
            
            {/* Upcoming Sessions */}
            <Card>
              <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)] mb-[var(--space-lg)] pb-7">
                Upcoming Sessions
              </h2>
              
              {loading ? (
                <p className="text-center py-8">Loading sessions...</p>
              ) : upcomingSessions.length > 0 ? (
                <div className="space-y-[var(--space-lg)]">
                  {upcomingSessions.slice(0, 3).map((session) => (
                    <div
                      key={session.id}
                      className={`p-[var(--space-lg)] rounded-lg border-l-4 ${
                        isUpcoming(session.date)
                          ? 'bg-[#FEF3C7] border-[var(--color-warning)]'
                          : 'bg-[var(--color-bg-main)] border-[var(--color-primary)]'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-[var(--space-md)]">
                        <div>
                          <div className="mb-[var(--space-sm)]">
                            <h3 className="font-bold text-[var(--color-text-primary)] text-[var(--font-size-h3)]">
                              [{session.modulecode}] {session.modulename}
                            </h3>
                            <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mt-1 font-medium opacity-80">
                              {session.academicyear} - Sem {session.semester}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onNavigate('my-lectures')}
                        >
                          Details
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--space-md)] text-[var(--font-size-small)]">
                        <div className="flex items-center gap-[var(--space-sm)] text-[var(--color-text-secondary)]">
                          <Calendar className="w-4 h-4 flex-shrink-0" />
                          <span>{formatDate(session.date)}</span>
                        </div>
                        <div className="flex items-center gap-[var(--space-sm)] text-[var(--color-text-secondary)]">
                          <Clock className="w-4 h-4 flex-shrink-0" />
                          <span>{session.time} ({session.duration}h duration)</span>
                        </div>
                        <div className="flex items-center gap-[var(--space-sm)] text-[var(--color-text-secondary)]">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{session.location || 'TBD'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-[var(--space-2xl)] text-[var(--color-text-secondary)]">
                  <Calendar className="w-12 h-12 mx-auto mb-[var(--space-md)] opacity-50" />
                  <p>No upcoming sessions scheduled</p>
                  <p className="text-[var(--font-size-small)] mt-2">
                    Check back later or contact your coordinator for updates
                  </p>
                </div>
              )}
            </Card>
            
            {/* Past Sessions */}
            <Card>
              <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)] mb-[var(--space-lg)]">
                Completed Sessions
              </h2>
              
              {loading ? (
                 <p className="text-center py-8">Loading sessions...</p>
              ) : completedSessions.length > 0 ? (
                <div className="space-y-[var(--space-md)]">
                  {completedSessions.slice(0, 3).map((session) => (
                    <div
                      key={session.id}
                      className="p-[var(--space-lg)] bg-[var(--color-bg-main)] rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-[var(--space-md)] mb-[var(--space-sm)]">
                            <h3 className="font-bold text-[var(--color-text-primary)]">
                              {session.modulecode} - {session.modulename} ({session.academicyear} - Sem {session.semester})
                            </h3>
                            <StatusBadge status="success">Completed</StatusBadge>
                          </div>
                          <div className="flex items-center gap-[var(--space-lg)] text-[var(--font-size-small)] text-[var(--color-text-secondary)]">
                            <span>{formatDate(session.date)}</span>
                            <span>•</span>
                            <span>{session.duration}h duration</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-[var(--space-2xl)] text-[var(--color-text-secondary)]">
                  <FileText className="w-12 h-12 mx-auto mb-[var(--space-md)] opacity-50" />
                  <p>No completed sessions yet</p>
                </div>
              )}
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
