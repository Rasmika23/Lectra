import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { StatusBadge } from '../components/StatusBadge';
import { Calendar, Clock, MapPin, Video, Users, Plus, X, BookOpen, Bell, Check, Trash2, Settings, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { authHeaders, fetchWithAuth } from '../lib/api';

const API = 'http://localhost:5000';

interface Module {
  moduleid: number;
  modulecode: string;
  modulename: string;
}

interface Session {
  sessionid: number;
  datetime: string;
  mode: string;
  status: string;
  locationorurl: string;
  duration: number;
  lecturername?: string;
  reminder_sent?: boolean;
}

export function SubCoordinatorSessionsPage({ currentUser, onNavigate }: { currentUser: any, onNavigate: (page: string, params?: any) => void }) {
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sendingReminderId, setSendingReminderId] = useState<number | null>(null);

  // New session state
  const [isAdding, setIsAdding] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newMode, setNewMode] = useState('Physical');
  const [newDuration, setNewDuration] = useState('2');
  const [newLocation, setNewLocation] = useState('');

  useEffect(() => {
    fetchModules();
  }, []);

  useEffect(() => {
    if (selectedModule) {
      fetchSessions(selectedModule.moduleid);
    } else {
      setSessions([]);
    }
  }, [selectedModule]);

  const fetchModules = async () => {
    setLoadingModules(true);
    try {
      const res = await fetchWithAuth(`${API}/modules`);
      if (!res.ok) throw new Error('Failed to fetch modules');
      const data: Module[] = await res.json();
      // Filter only modules assigned to this Sub-Coordinator
      const assigned = data.filter((m: any) => m.subcoordinatorid === (currentUser.userid ?? currentUser.id));
      setModules(assigned);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingModules(false);
    }
  };

  const fetchSessions = async (moduleId: number) => {
    setLoadingSessions(true);
    try {
      const res = await fetchWithAuth(`${API}/modules/${moduleId}/sessions`);
      if (!res.ok) throw new Error('Failed to fetch sessions');
      const data = await res.json();
      setSessions(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load sessions');
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModule || !newDate || !newTime || !newDuration) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      // Combine date and time
      const datetime = new Date(`${newDate}T${newTime}`);
      
      const res = await fetchWithAuth(`${API}/modules/${selectedModule.moduleid}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datetime: datetime.toISOString(),
          mode: newMode,
          duration: parseFloat(newDuration),
          locationorurl: newLocation
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add session');
      }

      toast.success('Custom session added successfully');
      setIsAdding(false);
      setNewDate('');
      setNewTime('');
      setNewLocation('');
      fetchSessions(selectedModule.moduleid);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSendReminder = async (sessionId: number) => {
    setSendingReminderId(sessionId);
    try {
      const res = await fetchWithAuth(`${API}/sessions/${sessionId}/send-reminder`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed to send reminder');
      toast.success('Reminder sent successfully');
      // Refresh sessions
      if (selectedModule) fetchSessions(selectedModule.moduleid);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSendingReminderId(null);
    }
  };

  const handleDeleteSession = async (sessionId: number) => {
    if (!window.confirm('Are you sure you want to delete this session? This action cannot be undone.')) return;

    try {
      const res = await fetchWithAuth(`${API}/sessions/${sessionId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete session');
      toast.success('Session deleted successfully');
      if (selectedModule) fetchSessions(selectedModule.moduleid);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const upcomingSessions = sessions.filter(s => 
    s.status?.toLowerCase() === 'scheduled' || 
    s.status?.toLowerCase() === 'upcoming' ||
    s.status?.toLowerCase() === 'rescheduled'
  );
  
  const completedSessions = sessions.filter(s => 
    s.status?.toLowerCase() === 'completed'
  );

  const formatDate = (dateString: string) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const isUpcomingSoon = (dateString: string) => {
    const sessionDate = new Date(dateString);
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    return sessionDate <= twoDaysFromNow && sessionDate >= new Date();
  };

  const isPastSession = (dateString: string) => {
    return new Date(dateString) <= new Date();
  };

  const selectClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-all";

  return (
    <div className="h-full">
      <div className="flex-1 flex flex-col h-full">
        <main className="flex-1 overflow-y-auto p-[var(--space-xl)]">
          <div className="max-w-5xl mx-auto space-y-[var(--space-xl)]">
            
            {/* Header */}
            <div>
              <h1 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">Module Sessions</h1>
              <p className="text-[var(--color-text-secondary)] mt-[var(--space-sm)]">Review expected sessions or add a custom session manually.</p>
            </div>

            {/* Module Selection */}
            <Card>
              <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-2">Select Module</label>
              {loadingModules ? (
                <p className="text-sm text-[var(--color-text-secondary)]">Loading modules...</p>
              ) : modules.length === 0 ? (
                <div className="text-center py-6 text-[var(--color-text-secondary)]">
                  <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>You are not assigned to any modules.</p>
                </div>
              ) : (
                <select 
                  className={selectClass} 
                  value={selectedModule?.moduleid ?? ''} 
                  onChange={e => {
                    const mod = modules.find(m => String(m.moduleid) === e.target.value);
                    setSelectedModule(mod || null);
                  }}
                >
                  <option value="">Select an assigned module...</option>
                  {modules.map(m => (
                    <option key={m.moduleid} value={String(m.moduleid)}>{m.modulecode} - {m.modulename}</option>
                  ))}
                </select>
              )}
            </Card>

            {/* Add Custom Session Modal */}
            {isAdding && selectedModule && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Add Custom Session</h2>
                    <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
                  </div>
                  <form onSubmit={handleAddSession} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Date" type="date" value={newDate} onChange={e => setNewDate(e.target.value)} required />
                      <Input label="Time" type="time" value={newTime} onChange={e => setNewTime(e.target.value)} required />
                    </div>
                    <Select label="Mode" options={[{value: 'Physical', label: 'Physical'}, {value: 'Online', label: 'Online'}]} value={newMode} onChange={e => setNewMode(e.target.value)} />
                    <Input label="Duration (hours)" type="number" step="0.5" min="0.5" value={newDuration} onChange={e => setNewDuration(e.target.value)} required />
                    <Input label="Location or URL" value={newLocation} onChange={e => setNewLocation(e.target.value)} placeholder="e.g. A4 202 or Zoom Link" />
                    <div className="flex gap-3 pt-4">
                      <Button type="button" variant="ghost" fullWidth onClick={() => setIsAdding(false)}>Cancel</Button>
                      <Button type="submit" variant="primary" fullWidth>Add Session</Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Sessions */}
            {selectedModule && (
              <Card>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--space-md)] mb-[var(--space-lg)]">
                  <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)]">
                    {selectedModule.modulecode} — {selectedModule.modulename}
                  </h2>
                  <Button variant="primary" icon={<Plus className="w-4 h-4"/>} onClick={() => setIsAdding(true)}>Add Custom Session</Button>
                </div>

                {loadingSessions ? (
                  <p className="text-sm text-[var(--color-text-secondary)]">Loading sessions...</p>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-12 text-[var(--color-text-secondary)]">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No sessions scheduled for this module yet.</p>
                  </div>
                ) : (
                  <div className="space-y-[var(--space-lg)] max-h-[600px] overflow-y-auto pr-2">
                    {/* Upcoming */}
                    {upcomingSessions.map(session => (
                      <div
                        key={session.sessionid}
                        className={`p-[var(--space-lg)] rounded-lg border-l-4 ${isUpcomingSoon(session.datetime)
                          ? 'bg-[#FEF3C7] border-[var(--color-warning)]'
                          : 'bg-[var(--color-bg-main)] border-[var(--color-primary)]'}`}
                      >
                        <div className="flex items-start justify-between mb-[var(--space-md)]">
                          <div>
                            <div className="flex items-center gap-[var(--space-md)] mb-[var(--space-sm)]">
                              <h3 className="font-bold text-[var(--color-text-primary)] text-[var(--font-size-h3)]">
                                {formatDate(session.datetime)}
                              </h3>
                              <StatusBadge status={session.status?.toLowerCase() === 'rescheduled' ? 'info' : 'warning'}>
                                {session.status}
                              </StatusBadge>
                            </div>
                            {session.lecturername && (
                                <div className="flex items-center gap-[var(--space-sm)] text-[var(--color-text-secondary)] mb-[var(--space-sm)] font-medium">
                                    <Users className="w-4 h-4" />
                                    <span>{session.lecturername}</span>
                                </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {session.reminder_sent ? (
                              <div className="flex items-center gap-1 text-[var(--color-success)] text-xs font-semibold px-2 py-1 bg-green-50 rounded-full border border-green-100 animate-[fadeIn_0.3s_ease-out]">
                                <Check className="w-3 h-3" />
                                <span>Reminder Sent</span>
                              </div>
                            ) : (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="!py-1.5 !px-3 hover:bg-[var(--color-primary)] hover:text-white transition-all duration-300"
                                icon={<Bell className={`w-3.5 h-3.5 ${sendingReminderId === session.sessionid ? 'animate-bounce' : ''}`} />}
                                onClick={() => handleSendReminder(session.sessionid)}
                                loading={sendingReminderId === session.sessionid}
                              >
                                {sendingReminderId === session.sessionid ? 'Sending...' : 'Send Reminder'}
                              </Button>
                            )}
                            {isPastSession(session.datetime) ? (
                                <button 
                                    onClick={() => onNavigate('attendance', { moduleId: selectedModule.moduleid, sessionId: session.sessionid })} 
                                    className="p-2 text-gray-400 hover:text-[var(--color-primary)] transition-colors"
                                    title="Manage Attendance"
                                >
                                    <ClipboardList className="w-4 h-4" />
                                </button>
                            ) : (
                                <button 
                                    className="p-2 text-gray-300 cursor-not-allowed"
                                    title="Attendance can only be marked after session starts"
                                    disabled
                                >
                                    <ClipboardList className="w-4 h-4" />
                                </button>
                            )}
                            <button 
                                onClick={() => handleDeleteSession(session.sessionid)} 
                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                title="Delete Session"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--space-md)] text-[var(--font-size-small)]">
                          <div className="flex items-center gap-[var(--space-sm)] text-[var(--color-text-secondary)]">
                            <Clock className="w-4 h-4 flex-shrink-0" />
                            <span>{formatTime(session.datetime)} ({session.duration}h)</span>
                          </div>
                          <div className="flex items-center gap-[var(--space-sm)] text-[var(--color-text-secondary)]">
                            {session.mode === 'Physical' ? <MapPin className="w-4 h-4 flex-shrink-0 text-[var(--color-primary)]" /> : <Video className="w-4 h-4 flex-shrink-0 text-purple-500" />}
                            <span>{session.locationorurl || 'TBD'}</span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Completed */}
                    {completedSessions.map(session => (
                      <div key={session.sessionid} className="p-[var(--space-lg)] bg-[var(--color-bg-sidebar)] rounded-lg opacity-80 group relative">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-[var(--space-md)] mb-[var(--space-sm)]">
                                    <h3 className="font-bold text-[var(--color-text-primary)]">
                                        {formatDate(session.datetime)}
                                    </h3>
                                    <StatusBadge status="success">Completed</StatusBadge>
                                </div>
                                <div className="flex items-center gap-[var(--space-lg)] text-[var(--font-size-small)] text-[var(--color-text-secondary)]">
                                    <span>{formatTime(session.datetime)}</span>
                                    <span>•</span>
                                    <span>{session.duration}h</span>
                                    <span>•</span>
                                    <span>{session.locationorurl || 'TBD'}</span>
                                </div>
                            </div>
                            {isPastSession(session.datetime) ? (
                                <button 
                                    onClick={() => onNavigate('attendance', { moduleId: selectedModule.moduleid, sessionId: session.sessionid })} 
                                    className="p-2 text-gray-400 hover:text-[var(--color-primary)] transition-colors opacity-0 group-hover:opacity-100"
                                    title="Manage Attendance"
                                >
                                    <ClipboardList className="w-4 h-4" />
                                </button>
                            ) : (
                                <button 
                                    className="p-2 text-gray-300 cursor-not-allowed opacity-0 group-hover:opacity-100"
                                    title="Attendance can only be marked after session starts"
                                    disabled
                                >
                                    <ClipboardList className="w-4 h-4" />
                                </button>
                            )}
                            <button 
                                onClick={() => handleDeleteSession(session.sessionid)} 
                                className="p-2 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                title="Delete Session"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        {session.lecturername && (
                          <div className="flex items-center gap-[var(--space-sm)] text-[var(--font-size-small)] text-[var(--color-text-secondary)] mt-[var(--space-sm)]">
                            <Users className="w-4 h-4" />
                            <span>{session.lecturername}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
