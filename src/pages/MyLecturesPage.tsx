import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight, ArrowLeft, BookOpen } from 'lucide-react';
import { authHeaders } from '../lib/api';

const API = 'http://localhost:5000';

interface MyLecturesPageProps {
    currentUser: any;
    onNavigate: (page: string) => void;
    onLogout?: () => void;
}

interface Session {
    id: number;
    moduleid: number;
    modulecode: string;
    modulename: string;
    lecturerid: number;
    date: string;
    time: string;
    duration: number | string;
    location: string;
    status: string;
}

interface Module {
    moduleid: number;
    modulecode: string;
    modulename: string;
    academicyear: string;
    semester: number | string;
}

interface TimeSlot {
    day: string;
    time: string;
    available: boolean;
    reason?: string;
}

export function MyLecturesPage({ currentUser, onNavigate, onLogout }: MyLecturesPageProps) {
    const [modules, setModules] = useState<Module[]>([]);
    const [selectedModule, setSelectedModule] = useState<Module | null>(null);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loadingModules, setLoadingModules] = useState(true);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [reschedulingSession, setReschedulingSession] = useState<Session | null>(null);

    // Reschedule state
    const [duration, setDuration] = useState('');
    const [selectedWeek, setSelectedWeek] = useState(0);
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [availableSlotsGrid, setAvailableSlotsGrid] = useState<any[]>([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);

    const lecturerId = currentUser.userid ?? currentUser.id;

    // Fetch modules assigned to this lecturer
    useEffect(() => {
        if (!lecturerId) return;
        setLoadingModules(true);
        fetch(`${API}/lecturers/${lecturerId}/modules`, { headers: authHeaders() })
            .then(r => r.json())
            .then(data => {
                setModules(Array.isArray(data) ? data : []);
                setLoadingModules(false);
            })
            .catch(err => {
                console.error('Failed to fetch modules', err);
                setLoadingModules(false);
            });
    }, [lecturerId]);

    // Fetch sessions when a module is selected
    useEffect(() => {
        if (!selectedModule) { setSessions([]); return; }
        setLoadingSessions(true);
        fetch(`${API}/modules/${selectedModule.moduleid}/sessions?lecturerId=${lecturerId}`, {
            headers: authHeaders()
        })
            .then(r => r.json())
            .then(data => {
                setSessions(Array.isArray(data) ? data : []);
                setLoadingSessions(false);
            })
            .catch(err => {
                console.error('Failed to fetch sessions', err);
                setLoadingSessions(false);
            });
    }, [selectedModule, lecturerId]);

    // Fetch available slots for rescheduling
    useEffect(() => {
        if (duration && reschedulingSession) {
            setIsLoadingSlots(true);
            fetch(`${API}/sessions/available-slots?sessionId=${reschedulingSession.id}&durationHours=${duration}&weekOffset=${selectedWeek}`, {
                headers: authHeaders()
            })
                .then(r => r.json())
                .then(data => {
                    setAvailableSlotsGrid(Array.isArray(data) ? data : []);
                    setIsLoadingSlots(false);
                })
                .catch(err => {
                    console.error(err);
                    setIsLoadingSlots(false);
                });
        } else {
            setAvailableSlotsGrid([]);
        }
    }, [duration, selectedWeek, reschedulingSession]);

    const upcomingSessions = sessions.filter(s => 
        s.status?.toLowerCase() === 'scheduled' || 
        s.status?.toLowerCase() === 'upcoming'
    );
    const completedSessions = sessions.filter(s => 
        s.status?.toLowerCase() === 'completed'
    );

    const formatDate = (dateString: string) => {
        if (!dateString) return 'TBD';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    const formatTime = (timeVal: any) => {
        if (!timeVal) return 'TBD';
        // Handle PostgreSQL time strings like "10:00:00"
        return String(timeVal).substring(0, 5);
    };

    const isUpcomingSoon = (dateString: string) => {
        const sessionDate = new Date(dateString);
        const twoDaysFromNow = new Date();
        twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
        return sessionDate <= twoDaysFromNow && sessionDate >= new Date();
    };

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const timeSlots = availableSlotsGrid.length > 0 ? availableSlotsGrid[0].slots.map((s: any) => s.time) : [];

    const getWeekDates = () => {
        if (availableSlotsGrid.length === 0) return ['', '', '', '', ''];
        return availableSlotsGrid.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    };

    const isSlotAvailable = (day: string, time: string) => {
        if (!duration) return { available: false, reason: 'Select duration' };
        if (availableSlotsGrid.length === 0) return { available: false, reason: 'Loading...' };
        const dayObj = availableSlotsGrid.find(d => d.day === day);
        if (!dayObj) return { available: false, reason: 'No data' };
        const slotObj = dayObj.slots.find((s: any) => s.time === time);
        if (!slotObj) return { available: false, reason: 'No data' };
        if (slotObj.status === 'AVAILABLE') return { available: true };
        return { available: false, reason: slotObj.reason || 'Busy' };
    };

    const getTimeRange = (startTime: string, durationHours: number) => {
        const [h, m] = startTime.split(':').map(Number);
        const endH = h + Math.floor(durationHours);
        const endM = m + Math.round((durationHours % 1) * 60);
        return `${startTime} - ${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    };

    const handleSlotClick = (day: string, time: string) => {
        const slotStatus = isSlotAvailable(day, time);
        if (slotStatus.available) {
            setSelectedSlot({ day, time, ...slotStatus });
            setShowConfirmModal(true);
        }
    };

    const handleConfirmReschedule = () => {
        setShowConfirmModal(false);
        setReschedulingSession(null);
        setSelectedSlot(null);
        setDuration('');
        alert('Session rescheduled successfully!');
    };

    const weekDates = getWeekDates();

    const durationOptions = [
        { value: '', label: 'Select duration' },
        { value: '1', label: '1 hour' },
        { value: '1.5', label: '1.5 hours' },
        { value: '2', label: '2 hours' },
        { value: '3', label: '3 hours' },
    ];

    const selectClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-all";

    return (
        <div className="h-full">
            <div className="flex-1 flex flex-col h-full">
                <main className="flex-1 overflow-y-auto p-[var(--space-xl)]">
                    <div className="max-w-5xl mx-auto space-y-[var(--space-xl)]">

                        {!reschedulingSession ? (
                            <>
                                {/* Header */}
                                <div>
                                    <h1 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">My Lectures</h1>
                                    <p className="text-[var(--color-text-secondary)] mt-[var(--space-sm)]">
                                        Select a module to view and manage your sessions
                                    </p>
                                </div>

                                {/* Module Selection */}
                                <Card>
                                    <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-2">Select Module</label>
                                    {loadingModules ? (
                                        <p className="text-sm text-[var(--color-text-secondary)]">Loading your modules...</p>
                                    ) : modules.length === 0 ? (
                                        <div className="text-center py-6 text-[var(--color-text-secondary)]">
                                            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                            <p>You are not assigned to any modules yet.</p>
                                        </div>
                                    ) : (
                                        <select
                                            id="module-select"
                                            className={selectClass}
                                            value={selectedModule?.moduleid ?? ''}
                                            onChange={(e) => {
                                                const mod = modules.find(m => String(m.moduleid) === e.target.value);
                                                setSelectedModule(mod || null);
                                            }}
                                        >
                                            <option value="">Select a module</option>
                                            {modules.map(m => (
                                                <option key={m.moduleid} value={String(m.moduleid)}>
                                                    {m.modulecode} - {m.modulename}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </Card>

                                {/* Sessions */}
                                {selectedModule && (
                                    <Card>
                                        <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)] mb-[var(--space-lg)]">
                                            {selectedModule.modulecode} — {selectedModule.modulename}
                                        </h2>

                                        {loadingSessions ? (
                                            <p className="text-sm text-[var(--color-text-secondary)]">Loading sessions...</p>
                                        ) : sessions.length === 0 ? (
                                            <div className="text-center py-12 text-[var(--color-text-secondary)]">
                                                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                                <p>No sessions scheduled for this module yet.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-[var(--space-lg)]">
                                                {/* Upcoming */}
                                                {upcomingSessions.map(session => (
                                                    <div
                                                        key={session.id}
                                                        className={`p-[var(--space-lg)] rounded-lg border-l-4 ${isUpcomingSoon(session.date)
                                                            ? 'bg-[#FEF3C7] border-[var(--color-warning)]'
                                                            : 'bg-[var(--color-bg-main)] border-[var(--color-primary)]'}`}
                                                    >
                                                        <div className="flex items-start justify-between mb-[var(--space-md)]">
                                                            <div>
                                                                <div className="flex items-center gap-[var(--space-md)] mb-[var(--space-sm)]">
                                                                    <h3 className="font-bold text-[var(--color-text-primary)] text-[var(--font-size-h3)]">
                                                                        {session.modulecode}
                                                                    </h3>
                                                                    <StatusBadge status="warning">Upcoming</StatusBadge>
                                                                </div>
                                                                <p className="text-[var(--color-text-secondary)]">{session.modulename}</p>
                                                            </div>
                                                            <Button variant="outline" size="sm" onClick={() => setReschedulingSession(session)}>
                                                                Reschedule
                                                            </Button>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--space-md)] text-[var(--font-size-small)]">
                                                            <div className="flex items-center gap-[var(--space-sm)] text-[var(--color-text-secondary)]">
                                                                <Calendar className="w-4 h-4 flex-shrink-0" />
                                                                <span>{formatDate(session.date)}</span>
                                                            </div>
                                                            <div className="flex items-center gap-[var(--space-sm)] text-[var(--color-text-secondary)]">
                                                                <Clock className="w-4 h-4 flex-shrink-0" />
                                                                <span>{formatTime(session.time)} ({session.duration}h)</span>
                                                            </div>
                                                            <div className="flex items-center gap-[var(--space-sm)] text-[var(--color-text-secondary)]">
                                                                <MapPin className="w-4 h-4 flex-shrink-0" />
                                                                <span>{session.location || 'TBD'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}

                                                {/* Completed */}
                                                {completedSessions.map(session => (
                                                    <div key={session.id} className="p-[var(--space-lg)] bg-[var(--color-bg-sidebar)] rounded-lg opacity-70">
                                                        <div className="flex items-center gap-[var(--space-md)] mb-[var(--space-sm)]">
                                                            <h3 className="font-bold text-[var(--color-text-primary)]">
                                                                {session.modulecode} - {session.modulename}
                                                            </h3>
                                                            <StatusBadge status="success">Completed</StatusBadge>
                                                        </div>
                                                        <div className="flex items-center gap-[var(--space-lg)] text-[var(--font-size-small)] text-[var(--color-text-secondary)]">
                                                            <span>{formatDate(session.date)}</span>
                                                            <span>•</span>
                                                            <span>{formatTime(session.time)}</span>
                                                            <span>•</span>
                                                            <span>{session.duration}h</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </Card>
                                )}
                            </>
                        ) : (
                            <>
                                {/* Rescheduling View */}
                                <button
                                    onClick={() => { setReschedulingSession(null); setDuration(''); setSelectedWeek(0); setAvailableSlotsGrid([]); }}
                                    className="flex items-center gap-[var(--space-sm)] text-[var(--color-primary)] hover:underline"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    <span>Back to Sessions</span>
                                </button>

                                <div>
                                    <h1 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">Reschedule Session</h1>
                                </div>

                                <Card className="bg-[#DBEAFE] border-[var(--color-info)]">
                                    <div className="flex items-start gap-[var(--space-md)]">
                                        <Calendar className="w-6 h-6 text-[var(--color-info)] flex-shrink-0" />
                                        <div>
                                            <h3 className="font-bold text-[#1E40AF]">
                                                {reschedulingSession.modulecode} - {reschedulingSession.modulename}
                                            </h3>
                                            <p className="text-[var(--font-size-small)] text-[#1E40AF] mt-1">
                                                Currently scheduled: {formatDate(reschedulingSession.date)} at {formatTime(reschedulingSession.time)}
                                            </p>
                                        </div>
                                    </div>
                                </Card>

                                <Card>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--space-lg)]">
                                        <div>
                                            <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-2">Session Duration</label>
                                            <select
                                                id="duration-select"
                                                className={selectClass}
                                                value={duration}
                                                onChange={e => setDuration(e.target.value)}
                                            >
                                                {durationOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-2">Select Week</label>
                                            <div className="flex items-center gap-[var(--space-md)]">
                                                <Button variant="outline" size="sm" onClick={() => setSelectedWeek(Math.max(0, selectedWeek - 1))} disabled={selectedWeek === 0}>
                                                    <ChevronLeft className="w-4 h-4" />
                                                </Button>
                                                <span className="flex-1 text-center font-medium">
                                                    {selectedWeek === 0 ? 'Current Week' : `Week +${selectedWeek}`}
                                                </span>
                                                <Button variant="outline" size="sm" onClick={() => setSelectedWeek(selectedWeek + 1)} disabled={selectedWeek >= 4}>
                                                    <ChevronRight className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                {duration && (
                                    <Card padding="none">
                                        {isLoadingSlots ? (
                                            <div className="p-[var(--space-md)] text-center text-[var(--color-primary)] font-bold">
                                                Loading available slots...
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full min-w-[800px]">
                                                    <thead>
                                                        <tr className="border-b border-[#E2E8F0]">
                                                            <th className="p-[var(--space-md)] text-left font-bold text-[var(--color-text-primary)] bg-[var(--color-bg-sidebar)]">Time</th>
                                                            {days.map((day, i) => (
                                                                <th key={day} className="p-[var(--space-md)] text-center font-bold text-[var(--color-text-primary)] bg-[var(--color-bg-sidebar)]">
                                                                    <div>{day}</div>
                                                                    <div className="text-[var(--font-size-small)] font-normal text-[var(--color-text-secondary)] mt-1">{weekDates[i]}</div>
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {timeSlots.map((time: string) => (
                                                            <tr key={time} className="border-b border-[#E2E8F0] last:border-0">
                                                                <td className="p-[var(--space-md)] font-medium text-[var(--color-text-secondary)] bg-[var(--color-bg-sidebar)]">{time}</td>
                                                                {days.map(day => {
                                                                    const slotStatus = isSlotAvailable(day, time);
                                                                    return (
                                                                        <td key={`${day}-${time}`} className="p-1">
                                                                            <button
                                                                                onClick={() => handleSlotClick(day, time)}
                                                                                disabled={!slotStatus.available}
                                                                                className={`w-full h-16 rounded text-[var(--font-size-small)] transition-all flex flex-col items-center justify-center ${slotStatus.available
                                                                                    ? 'bg-[#D1FAE5] text-[#065F46] hover:bg-[#A7F3D0] border-2 border-transparent hover:border-[var(--color-success)]'
                                                                                    : 'bg-[#F1F5F9] text-[var(--color-text-disabled)] cursor-not-allowed'}`}
                                                                            >
                                                                                {slotStatus.available ? (
                                                                                    <>
                                                                                        <span className="font-bold">Available</span>
                                                                                        <span className="text-[11px] mt-1">{getTimeRange(time, parseFloat(duration))}</span>
                                                                                    </>
                                                                                ) : (
                                                                                    <span className="text-[10px] text-center px-1">{slotStatus.reason}</span>
                                                                                )}
                                                                            </button>
                                                                        </td>
                                                                    );
                                                                })}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </Card>
                                )}
                            </>
                        )}
                    </div>
                </main>
            </div>

            <Modal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                title="Confirm Reschedule"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
                        <Button variant="primary" onClick={handleConfirmReschedule}>Confirm Reschedule</Button>
                    </>
                }
            >
                <div className="space-y-[var(--space-lg)]">
                    <p className="text-[var(--color-text-secondary)]">You are rescheduling the following session:</p>
                    <div className="p-[var(--space-lg)] bg-[var(--color-bg-sidebar)] rounded-lg space-y-[var(--space-md)]">
                        <div>
                            <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)]">Module</p>
                            <p className="font-bold text-[var(--color-text-primary)]">{reschedulingSession?.modulecode} - {reschedulingSession?.modulename}</p>
                        </div>
                        {selectedSlot && (
                            <div className="grid grid-cols-2 gap-[var(--space-md)]">
                                <div>
                                    <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)]">New Time</p>
                                    <p className="font-medium text-[var(--color-success)]">{selectedSlot.day}</p>
                                    <p className="font-medium text-[var(--color-success)]">{getTimeRange(selectedSlot.time, parseFloat(duration))}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
}
