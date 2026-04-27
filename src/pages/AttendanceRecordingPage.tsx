/**
 * @file AttendanceRecordingPage.tsx
 * @description Interface for Sub-Coordinators to record attendance for past sessions.
 * Allows marking lecturer presence, actual duration, and topics covered.
 */

import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config';
import { useScrollToTop } from '../lib/hooks';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Checkbox } from '../components/Checkbox';
import { ArrowLeft, CheckCircle, Calendar, Clock, MapPin, AlertCircle, Loader2 } from 'lucide-react';
import { fetchWithAuth } from '../lib/api';

interface Lecturer {
  id: number;
  name: string;
  email: string;
}

interface Session {
  sessionid: number;
  moduleid: number;
  modulecode: string;
  modulename: string;
  datetime: string;
  date: string;
  time: string;
  duration: number;
  location: string;
  status: string;
  topicscovered?: string;
  actual_duration?: number;
  has_attendance: boolean;
}

interface Module {
  moduleid: number;
  modulecode: string;
  modulename: string;
  academicyear: string;
  semester: number | string;
}

interface AttendanceRecordingPageProps {
  currentUser: any;
  onNavigate: (page: string, params?: any) => void;
  onLogout?: () => void;
  navigationParams?: { moduleId?: string; sessionId?: string } | null;
  clearNavigationParams?: () => void;
}

export function AttendanceRecordingPage({ 
  currentUser, 
  onNavigate, 
  onLogout, 
  navigationParams, 
  clearNavigationParams 
}: AttendanceRecordingPageProps) {
  // ── STATE ─────────────────────────────────────────────────────────────────
  const [modules, setModules] = useState<Module[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [attendance, setAttendance] = useState<{ [key: string]: boolean | null }>({});
  const [topicsCovered, setTopicsCovered] = useState('');
  const [actualDuration, setActualDuration] = useState('');
  const [location, setLocation] = useState('');
  
  const [isLoadingModules, setIsLoadingModules] = useState(true);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isLoadingLecturers, setIsLoadingLecturers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top when error or success message appears
  useScrollToTop(scrollContainerRef, [error, showSuccess]);

  const API_BASE_URL_LOCAL = API_BASE_URL;

  // Fetch assigned modules on mount
  useEffect(() => {
    const loadModules = async () => {
      try {
        const response = await fetchWithAuth(`${API_BASE_URL}/subcoordinator/modules`);
        if (!response.ok) throw new Error('Failed to fetch modules');
        const data = await response.json();
        setModules(data);
      } catch (err: any) {
        setError(err.message || 'Error loading modules');
      } finally {
        setIsLoadingModules(false);
      }
    };
    loadModules();
  }, [API_BASE_URL]);

  // Handle initial navigation params
  useEffect(() => {
    if (navigationParams) {
      if (navigationParams.moduleId) {
        setSelectedModule(navigationParams.moduleId.toString());
      }
      if (navigationParams.sessionId) {
        setSelectedSession(navigationParams.sessionId.toString());
      }
      
      // Clear params after they've been applied
      if (clearNavigationParams) {
        clearNavigationParams();
      }
    }
  }, [navigationParams, clearNavigationParams]);

  // Fetch past sessions when module changes
  useEffect(() => {
    if (!selectedModule) {
      setSessions([]);
      return;
    }

    const loadSessions = async () => {
      setIsLoadingSessions(true);
      setError('');
      try {
        const response = await fetchWithAuth(`${API_BASE_URL}/modules/${selectedModule}/sessions/past`);
        if (!response.ok) throw new Error('Failed to fetch sessions');
        const data = await response.json();
        setSessions(data);
      } catch (err: any) {
        setError(err.message || 'Error loading sessions');
      } finally {
        setIsLoadingSessions(false);
      }
    };
    loadSessions();
  }, [selectedModule]);

  // Fetch lecturers for the module when session is selected (to mark attendance)
  useEffect(() => {
    if (!selectedModule) {
      setLecturers([]);
      return;
    }

    const loadLecturersAndAttendance = async () => {
      setIsLoadingLecturers(true);
      setError('');
      try {
        // Fetch lecturers
        const lecturersResponse = await fetchWithAuth(`${API_BASE_URL}/modules/${selectedModule}/lecturers`);
        if (!lecturersResponse.ok) throw new Error('Failed to fetch lecturers');
        const lecturersData = await lecturersResponse.json();
        setLecturers(lecturersData);

        // Fetch existing attendance if any
        if (selectedSession) {
          const attendanceResponse = await fetchWithAuth(`${API_BASE_URL}/sessions/${selectedSession}/attendance`);
          if (attendanceResponse.ok) {
            const attendanceData = await attendanceResponse.json();
            if (attendanceData.attendance) {
              setAttendance(attendanceData.attendance);
            }
            if (attendanceData.details) {
              setTopicsCovered(attendanceData.details.topicscovered || '');
              setActualDuration(attendanceData.details.actual_duration?.toString() || '');
            } else {
              // Pre-fill from session duration if no actual duration recorded yet
              const session = sessions.find(s => s.sessionid.toString() === selectedSession);
              setTopicsCovered('');
              setActualDuration(session?.duration.toString() || '');
            }

            // Always update location from the session itself (refreshed in state)
            const session = sessions.find(s => s.sessionid.toString() === selectedSession);
            setLocation(session?.location || '');
          }
        }
      } catch (err: any) {
        setError(err.message || 'Error loading data');
      } finally {
        setIsLoadingLecturers(false);
      }
    };
    
    loadLecturersAndAttendance();
  }, [selectedSession, selectedModule, sessions]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return;
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/sessions/${selectedSession}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendance,
          topicsCovered,
          actualDuration: parseFloat(actualDuration) || 0,
          location
        })
      });

      if (!response.ok) throw new Error('Failed to save attendance');
      
      setShowSuccess(true);
      
      // Refresh session list to update badges (if needed)
      const sessionsResponse = await fetchWithAuth(`${API_BASE_URL}/modules/${selectedModule}/sessions/past`);
      if (sessionsResponse.ok) {
        const data = await sessionsResponse.json();
        setSessions(data);
      }

      // Redirect after 2 seconds
      setTimeout(() => {
        onNavigate('sub-sessions', { moduleId: selectedModule });
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to record attendance');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentSession = sessions.find(s => s.sessionid.toString() === selectedSession);

  return (
    <div className="h-full">
      <div className="flex-1 flex flex-col h-full">
        <main 
          ref={scrollContainerRef}
          className="flex-1 p-[var(--space-xl)] bg-[var(--color-bg-sidebar)]"
        >
          <div className="max-w-4xl mx-auto space-y-[var(--space-xl)]">
            {/* Breadcrumb */}
            <button
              onClick={() => onNavigate('sub-dashboard')}
              className="flex items-center gap-[var(--space-sm)] text-[var(--color-primary)] hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
            
            {/* Page Title */}
            <div>
              <h1 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">
                Record Attendance
              </h1>
              <p className="text-[var(--color-text-secondary)] mt-[var(--space-sm)]">
                Mark lecturer attendance and document topics covered in the session
              </p>
            </div>
            
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-5 h-5" />
                <p>{error}</p>
              </div>
            )}

            {/* Success Message */}
            {showSuccess && (
              <Card className="bg-[#D1FAE5] border-[var(--color-success)] relative">
                <button 
                  onClick={() => setShowSuccess(false)}
                  className="absolute top-2 right-2 text-[#065F46] hover:text-[#047857]"
                >
                  <AlertCircle className="w-4 h-4 rotate-45" /> {/* Close icon substitute */}
                </button>
                <div className="flex items-center gap-[var(--space-md)]">
                  <CheckCircle className="w-6 h-6 text-[var(--color-success)]" />
                  <div>
                    <p className="font-bold text-[#065F46]">Attendance recorded successfully!</p>
                    <p className="text-[var(--font-size-small)] text-[#047857] mt-1">
                      The data has been saved. You can continue editing or return to the dashboard.
                    </p>
                  </div>
                </div>
              </Card>
            )}
            
            {/* Module Selection */}
            <Card>
              <label className="text-[var(--font-size-small)] font-medium text-[var(--color-text-primary)] block mb-[var(--space-sm)]">
                Select Module
              </label>
              <div className="relative">
                <select
                  value={selectedModule}
                  onChange={(e) => {
                    setSelectedModule(e.target.value);
                    setSelectedSession('');
                    setAttendance({});
                    setTopicsCovered('');
                    setActualDuration('');
                    setLocation('');
                  }}
                  disabled={isLoadingModules}
                  className="w-full px-[var(--space-md)] py-[var(--space-sm)] border border-[#CBD5E1] rounded-lg text-[var(--font-size-body)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-opacity-20 disabled:bg-gray-50 disabled:cursor-not-allowed"
                >
                  <option value="">{isLoadingModules ? 'Loading modules...' : 'Select a module'}</option>
                  {modules.map(m => (
                    <option key={m.moduleid} value={m.moduleid}>
                      [{m.modulecode}] {m.modulename} ({m.academicyear} - Sem {m.semester})
                    </option>
                  ))}
                </select>
                {isLoadingModules && <Loader2 className="w-4 h-4 animate-spin absolute right-10 top-3 text-gray-400" />}
              </div>
            </Card>
            
            {/* Session Selection */}
            {selectedModule && (
              <Card>
                <label className="text-[var(--font-size-small)] font-medium text-[var(--color-text-primary)] block mb-[var(--space-sm)]">
                  Select Session
                </label>
                {isLoadingSessions ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
                  </div>
                ) : sessions.length > 0 ? (
                  <select
                    value={selectedSession}
                    onChange={(e) => {
                      setSelectedSession(e.target.value);
                      setAttendance({});
                    }}
                    className="w-full px-[var(--space-md)] py-[var(--space-sm)] border border-[#CBD5E1] rounded-lg text-[var(--font-size-body)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-opacity-20"
                  >
                    <option value="">Select a session</option>
                    {sessions.map(s => (
                      <option key={s.sessionid} value={s.sessionid}>
                        {formatDate(s.datetime)} at {s.time} ({s.duration}h)
                        {s.has_attendance ? ' (Update existing)' : ' (Needs recording)'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-[var(--space-lg)] bg-[var(--color-bg-sidebar)] rounded-lg text-center">
                    <p className="text-[var(--color-text-secondary)]">
                      No past sessions found for this module
                    </p>
                  </div>
                )}
              </Card>
            )}
            
            {/* Session Details */}
            {currentSession && (
              <Card>
                <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)] mb-[var(--space-lg)]">
                  Session Details
                </h2>
                
                <div className="space-y-[var(--space-md)]">
                  <div className="p-[var(--space-lg)] bg-[var(--color-bg-main)] rounded-lg">
                    <h3 className="font-bold text-[var(--color-text-primary)] mb-[var(--space-md)]">
                      {currentSession.modulecode} - {currentSession.modulename}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--space-md)] text-[var(--font-size-small)]">
                      <div className="flex items-center gap-[var(--space-sm)] text-[var(--color-text-secondary)]">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        <span>{formatDate(currentSession.datetime)}</span>
                      </div>
                      <div className="flex items-center gap-[var(--space-sm)] text-[var(--color-text-secondary)]">
                        <Clock className="w-4 h-4 flex-shrink-0" />
                        <span>{currentSession.time} (Scheduled: {currentSession.duration}h)</span>
                      </div>
                      <div className="flex items-center gap-[var(--space-sm)] text-[var(--color-text-secondary)]">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <div className="flex-1">
                          <input 
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="Location (e.g. Lab 01, Zoom link)"
                            className="w-full px-2 py-1 bg-white border border-[#CBD5E1] rounded text-[var(--font-size-small)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}
            
            {/* Attendance Form */}
            {selectedSession && (
              <form onSubmit={handleSubmit} className="space-y-[var(--space-xl)]">
                <Card>
                  <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)] mb-[var(--space-lg)]">
                    Lecturer Attendance
                  </h2>
                  
                  <div className="space-y-[var(--space-md)]">
                    <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)]">
                      Mark the lecturers who attended this session:
                    </p>
                    
                    {isLoadingLecturers ? (
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--color-primary)]" />
                    ) : lecturers.length > 0 ? (
                      <div className="space-y-[var(--space-md)]">
                        {lecturers.map((lecturer) => (
                          <div
                            key={lecturer.id}
                            className="flex flex-col md:flex-row md:items-center justify-between p-[var(--space-lg)] bg-[var(--color-bg-main)] rounded-lg gap-4"
                          >
                            <div>
                              <p className="font-medium text-[var(--color-text-primary)]">
                                {lecturer.name}
                              </p>
                              <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mt-1">
                                Visiting Lecturer
                              </p>
                            </div>
                            
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setAttendance({ 
                                  ...attendance, 
                                  [lecturer.id]: attendance[lecturer.id] === true ? null : true 
                                })}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                  attendance[lecturer.id] === true
                                    ? 'text-white shadow-md'
                                    : 'bg-white border border-[#CBD5E1] text-[var(--color-text-secondary)] hover:bg-gray-50'
                                }`}
                                style={attendance[lecturer.id] === true ? { backgroundColor: '#059669' } : {}}
                              >
                                Present
                              </button>
                              <button
                                type="button"
                                onClick={() => setAttendance({ 
                                  ...attendance, 
                                  [lecturer.id]: attendance[lecturer.id] === false ? null : false 
                                })}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                  attendance[lecturer.id] === false
                                    ? 'text-white shadow-md'
                                    : 'bg-white border border-[#CBD5E1] text-[var(--color-text-secondary)] hover:bg-gray-50'
                                }`}
                                style={attendance[lecturer.id] === false ? { backgroundColor: '#DC2626' } : {}}
                              >
                                Absent
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-[var(--space-lg)] bg-[var(--color-bg-main)] rounded-lg text-center">
                        <p className="text-[var(--color-text-secondary)]">
                          No lecturers assigned to this module
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
                
                <Card>
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)] mb-[var(--space-lg)]">
                        Topics Covered
                      </h2>
                      <label
                        htmlFor="topics"
                        className="text-[var(--font-size-small)] font-medium text-[var(--color-text-primary)] block mb-[var(--space-sm)]"
                      >
                        Session Content
                      </label>
                      <textarea
                        id="topics"
                        rows={5}
                        value={topicsCovered}
                        onChange={(e) => setTopicsCovered(e.target.value)}
                        placeholder="e.g., Introduction to Design Patterns, Singleton Pattern Implementation, Factory Pattern Examples"
                        className="w-full px-[var(--space-md)] py-[var(--space-sm)] border border-[#CBD5E1] rounded-lg text-[var(--font-size-body)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-opacity-20 resize-vertical"
                      />
                    </div>

                    <div>
                      <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)] mb-[var(--space-lg)]">
                        Actual Duration
                      </h2>
                      <label
                        htmlFor="duration"
                        className="text-[var(--font-size-small)] font-medium text-[var(--color-text-primary)] block mb-[var(--space-sm)]"
                      >
                        Actual hours conducted
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        id="duration"
                        value={actualDuration}
                        onChange={(e) => setActualDuration(e.target.value)}
                        placeholder="e.g., 2.5"
                        className="w-full px-[var(--space-md)] py-[var(--space-sm)] border border-[#CBD5E1] rounded-lg text-[var(--font-size-body)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-opacity-20"
                      />
                    </div>
                  </div>
                </Card>
                
                {/* Info Box */}
                <Card className="bg-[#DBEAFE] border-[var(--color-info)]">
                  <div className="flex gap-[var(--space-md)]">
                    <div className="text-[var(--color-info)]">ℹ️</div>
                    <div>
                      <p className="font-medium text-[#1E40AF]">Important Notes</p>
                      <ul className="text-[var(--font-size-small)] text-[#1E40AF] mt-[var(--space-sm)] space-y-1 list-disc list-inside">
                        <li>Attendance records are used for payroll processing</li>
                        <li>Topics covered are included in academic audit reports</li>
                        <li>This data can be updated if corrections are needed before final approval</li>
                      </ul>
                    </div>
                  </div>
                </Card>
                
                {/* Actions */}
                <div className="flex items-center gap-[var(--space-md)]">
                    <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Submitting...' : (currentSession?.has_attendance ? 'Update Attendance Record' : 'Submit Attendance Record')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="lg"
                    onClick={() => onNavigate('sub-dashboard')}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}