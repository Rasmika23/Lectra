import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { Select } from '../components/Select';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { mockSessions, mockModules, mockStudentTimetable } from '../lib/mockData';
import { StatusBadge } from '../components/StatusBadge';
import { authHeaders } from '../lib/api';

interface MyLecturesPageProps {
    currentUser: any;
    onNavigate: (page: string) => void;
    onLogout?: () => void;
}

interface TimeSlot {
    day: string;
    time: string;
    available: boolean;
    reason?: string;
}

export function MyLecturesPage({ currentUser, onNavigate, onLogout }: MyLecturesPageProps) {
    const [selectedModule, setSelectedModule] = useState('');
    const [reschedulingSession, setReschedulingSession] = useState<any>(null);

    // Reschedule State
    const [duration, setDuration] = useState('');
    const [selectedWeek, setSelectedWeek] = useState(0);
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Auto-inject the current user into mock data for testing purposes
    const lecturerModules = mockModules.map(m => ({
        ...m,
        lecturers: [...m.lecturers, currentUser.name]
    }));

    const moduleOptions = [
        { value: '', label: 'Select a module' },
        ...lecturerModules.map(m => ({
            value: m.id,
            label: `${m.code} - ${m.name}`
        }))
    ];

    // Auto-generate some dummy sessions for this new user for testing purposes
    const testSessions = selectedModule ? [
        {
            id: `test-session-1-${selectedModule}`,
            moduleId: selectedModule,
            moduleCode: lecturerModules.find(m => m.id === selectedModule)?.code,
            moduleName: lecturerModules.find(m => m.id === selectedModule)?.name,
            lecturerId: currentUser.id,
            date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], // 2 days from now
            time: '10:00',
            duration: 2,
            location: 'Room 301',
            status: 'scheduled'
        },
        {
            id: `test-session-2-${selectedModule}`,
            moduleId: selectedModule,
            moduleCode: lecturerModules.find(m => m.id === selectedModule)?.code,
            moduleName: lecturerModules.find(m => m.id === selectedModule)?.name,
            lecturerId: currentUser.id,
            date: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0], // 1 week from now
            time: '14:00',
            duration: 1.5,
            location: 'Zoom',
            status: 'scheduled'
        }
    ] : [];

    const moduleSessions = selectedModule
        ? [...mockSessions.filter(s => s.moduleId === selectedModule && s.lecturerId === currentUser.id), ...testSessions]
        : [];

    // Separate upcoming and completed
    const upcomingSessions = moduleSessions.filter(s => s.status === 'scheduled');
    const completedSessions = moduleSessions.filter(s => s.status === 'completed');

    const formatDate = (dateString: string) => {
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

    // Rescheduling Calendar Logic
    const durationOptions = [
        { value: '', label: 'Select duration' },
        { value: '1', label: '1 hour' },
        { value: '1.5', label: '1.5 hours' },
        { value: '2', label: '2 hours' },
        { value: '3', label: '3 hours' },
    ];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    
    const [availableSlotsGrid, setAvailableSlotsGrid] = useState<any[]>([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);

    useEffect(() => {
        if (duration && reschedulingSession) {
            setIsLoadingSlots(true);
            // Since the UI uses mock sessions "test-session-1-X", force fallback to real Session ID = 1 for testing purposes.
            // In full production, session.id would just be the database sessionid.
            const sessionIdStr = reschedulingSession.id.toString().includes('test-session') ? '1' : reschedulingSession.id;
            
            fetch(`http://localhost:5000/sessions/available-slots?sessionId=${sessionIdStr}&durationHours=${duration}&weekOffset=${selectedWeek}`, {
                headers: authHeaders()
            })
                .then(res => res.json())
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

    const timeSlots = availableSlotsGrid.length > 0 ? availableSlotsGrid[0].slots.map((s: any) => s.time) : [];

    const getWeekDates = () => {
        if (availableSlotsGrid.length === 0) return ['', '', '', '', ''];
        return availableSlotsGrid.map(d => {
            const date = new Date(d.date);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
    };

    const isSlotAvailable = (day: string, time: string): { available: boolean; reason?: string } => {
        if (!duration) return { available: false, reason: 'Select duration' };
        if (availableSlotsGrid.length === 0) return { available: false, reason: 'Loading...' };
        
        const dayObj = availableSlotsGrid.find(d => d.day === day);
        if (!dayObj) return { available: false, reason: 'No data' };
        
        const slotObj = dayObj.slots.find((s: any) => s.time === time);
        if (!slotObj) return { available: false, reason: 'No data' };
        
        if (slotObj.status === 'AVAILABLE') return { available: true };
        return { available: false, reason: slotObj.reason || 'Busy' };
    };

    const getTimeRange = (startTime: string, durationHours: number): string => {
        const [h, m] = startTime.split(':').map(Number);
        return `${startTime} - ${(h + durationHours).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
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
        alert('Reschedule request submitted successfully!');
    };

    const weekDates = getWeekDates();

    return (
        <div className="h-full">
            
            <div className="flex-1 flex flex-col h-full">
                
                <main className="flex-1 overflow-y-auto p-[var(--space-xl)]">
                    <div className="max-w-7xl mx-auto space-y-[var(--space-xl)]">

                        {!reschedulingSession ? (
                            <>
                                {/* 1. Module Selection View */}
                                <div>
                                    <h1 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">
                                        My Lectures
                                    </h1>
                                    <p className="text-[var(--color-text-secondary)] mt-[var(--space-sm)]">
                                        Select a module to view its sessions and request rescheduling
                                    </p>
                                </div>

                                <Card>
                                    <Select
                                        label="Select Module"
                                        options={moduleOptions}
                                        value={selectedModule}
                                        onChange={(e) => setSelectedModule(e.target.value)}
                                        fullWidth
                                    />
                                </Card>

                                {selectedModule && (
                                    <Card>
                                        <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)] mb-[var(--space-lg)]">
                                            Module Sessions
                                        </h2>

                                        {moduleSessions.length > 0 ? (
                                            <div className="space-y-[var(--space-lg)]">
                                                {upcomingSessions.map((session) => (
                                                    <div
                                                        key={session.id}
                                                        className={`p-[var(--space-lg)] rounded-lg border-l-4 ${isUpcoming(session.date)
                                                            ? 'bg-[#FEF3C7] border-[var(--color-warning)]'
                                                            : 'bg-[var(--color-bg-main)] border-[var(--color-primary)]'
                                                            }`}
                                                    >
                                                        <div className="flex items-start justify-between mb-[var(--space-md)]">
                                                            <div>
                                                                <div className="flex items-center gap-[var(--space-md)] mb-[var(--space-sm)]">
                                                                    <h3 className="font-bold text-[var(--color-text-primary)] text-[var(--font-size-h3)]">
                                                                        {session.moduleCode}
                                                                    </h3>
                                                                    <StatusBadge status="warning">Upcoming</StatusBadge>
                                                                </div>
                                                                <p className="text-[var(--color-text-secondary)]">
                                                                    {session.moduleName}
                                                                </p>
                                                            </div>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => setReschedulingSession(session)}
                                                            >
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
                                                                <span>{session.time} ({session.duration}h)</span>
                                                            </div>
                                                            <div className="flex items-center gap-[var(--space-sm)] text-[var(--color-text-secondary)]">
                                                                <MapPin className="w-4 h-4 flex-shrink-0" />
                                                                <span>{session.location}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}

                                                {completedSessions.map((session) => (
                                                    <div key={session.id} className="p-[var(--space-lg)] bg-[var(--color-bg-sidebar)] rounded-lg opacity-70">
                                                        <div className="flex items-center gap-[var(--space-md)] mb-[var(--space-sm)]">
                                                            <h3 className="font-bold text-[var(--color-text-primary)]">
                                                                {session.moduleCode} - {session.moduleName}
                                                            </h3>
                                                            <StatusBadge status="success">Completed</StatusBadge>
                                                        </div>
                                                        <div className="flex items-center gap-[var(--space-lg)] text-[var(--font-size-small)] text-[var(--color-text-secondary)]">
                                                            <span>{formatDate(session.date)}</span>
                                                            <span>•</span>
                                                            <span>{session.duration}h duration</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-[var(--space-2xl)] text-[var(--color-text-secondary)]">
                                                <Calendar className="w-12 h-12 mx-auto mb-[var(--space-md)] opacity-50" />
                                                <p>No lectures scheduled for this module yet.</p>
                                            </div>
                                        )}
                                    </Card>
                                )}
                            </>
                        ) : (
                            <>
                                {/* 2. Rescheduling View */}
                                <button
                                    onClick={() => setReschedulingSession(null)}
                                    className="flex items-center gap-[var(--space-sm)] text-[var(--color-primary)] hover:underline"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    <span>Back to Session List</span>
                                </button>

                                <div>
                                    <h1 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">
                                        Reschedule Session
                                    </h1>
                                </div>

                                <Card className="bg-[#DBEAFE] border-[var(--color-info)]">
                                    <div className="flex items-start gap-[var(--space-md)]">
                                        <Calendar className="w-6 h-6 text-[var(--color-info)] flex-shrink-0" />
                                        <div>
                                            <h3 className="font-bold text-[#1E40AF]">
                                                {reschedulingSession.moduleCode} - {reschedulingSession.moduleName}
                                            </h3>
                                            <p className="text-[var(--font-size-small)] text-[#1E40AF] mt-1">
                                                Currently scheduled: {formatDate(reschedulingSession.date)} at {reschedulingSession.time}
                                            </p>
                                        </div>
                                    </div>
                                </Card>

                                <Card>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--space-lg)]">
                                        <Select
                                            label="Session Duration"
                                            options={durationOptions}
                                            value={duration}
                                            onChange={(e) => setDuration(e.target.value)}
                                            fullWidth
                                        />

                                        <div>
                                            <label className="text-[var(--font-size-small)] font-medium text-[var(--color-text-primary)] block mb-[var(--space-sm)]">
                                                Select Week
                                            </label>
                                            <div className="flex items-center gap-[var(--space-md)]">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setSelectedWeek(Math.max(0, selectedWeek - 1))}
                                                    disabled={selectedWeek === 0}
                                                >
                                                    <ChevronLeft className="w-4 h-4" />
                                                </Button>
                                                <span className="flex-1 text-center font-medium">
                                                    {selectedWeek === 0 ? 'Current Week' : `Week +${selectedWeek}`}
                                                </span>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setSelectedWeek(selectedWeek + 1)}
                                                    disabled={selectedWeek >= 4}
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                {duration && (
                                    <Card padding="none">
                                        {isLoadingSlots && (
                                            <div className="p-[var(--space-md)] text-center text-[var(--color-primary)] font-bold">
                                                Loading available slots from backend...
                                            </div>
                                        )}
                                        {!isLoadingSlots && (
                                            <div className="overflow-x-auto">
                                            <table className="w-full min-w-[800px]">
                                                <thead>
                                                    <tr className="border-b border-[#E2E8F0]">
                                                        <th className="p-[var(--space-md)] text-left font-bold text-[var(--color-text-primary)] bg-[var(--color-bg-sidebar)]">
                                                            Time
                                                        </th>
                                                        {days.map((day, i) => (
                                                            <th key={day} className="p-[var(--space-md)] text-center font-bold text-[var(--color-text-primary)] bg-[var(--color-bg-sidebar)]">
                                                                <div>{day}</div>
                                                                <div className="text-[var(--font-size-small)] font-normal text-[var(--color-text-secondary)] mt-1">
                                                                    {weekDates[i]}
                                                                </div>
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {timeSlots.map((time: string) => (
                                                        <tr key={time} className="border-b border-[#E2E8F0] last:border-0">
                                                            <td className="p-[var(--space-md)] font-medium text-[var(--color-text-secondary)] bg-[var(--color-bg-sidebar)]">
                                                                {time}
                                                            </td>
                                                            {days.map((day) => {
                                                                const slotStatus = isSlotAvailable(day, time);
                                                                return (
                                                                    <td key={`${day}-${time}`} className="p-1">
                                                                        <button
                                                                            onClick={() => handleSlotClick(day, time)}
                                                                            disabled={!slotStatus.available}
                                                                            className={`w-full h-16 rounded text-[var(--font-size-small)] transition-all flex flex-col items-center justify-center ${slotStatus.available
                                                                                ? 'bg-[#D1FAE5] text-[#065F46] hover:bg-[#A7F3D0] border-2 border-transparent hover:border-[var(--color-success)]'
                                                                                : 'bg-[#F1F5F9] text-[var(--color-text-disabled)] cursor-not-allowed'
                                                                                }`}
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
                title="Confirm Reschedule Request"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
                        <Button variant="primary" onClick={handleConfirmReschedule}>Submit Request</Button>
                    </>
                }
            >
                <div className="space-y-[var(--space-lg)]">
                    <p className="text-[var(--color-text-secondary)]">
                        You are requesting to reschedule this session:
                    </p>
                    <div className="p-[var(--space-lg)] bg-[var(--color-bg-sidebar)] rounded-lg space-y-[var(--space-md)]">
                        <div>
                            <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)]">Module</p>
                            <p className="font-bold text-[var(--color-text-primary)]">
                                {reschedulingSession?.moduleCode} - {reschedulingSession?.moduleName}
                            </p>
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
