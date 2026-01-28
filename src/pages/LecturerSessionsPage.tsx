import React, { useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Select } from '../components/Select';
import { StatusBadge } from '../components/StatusBadge';
import { Calendar, Clock, MapPin, Search } from 'lucide-react';
import { getSessionsByLecturerId, getModuleById, mockModules } from '../lib/mockData';

interface LecturerSessionsPageProps {
    currentUser: any;
    onNavigate: (page: string, state?: any) => void;
}

export function LecturerSessionsPage({ currentUser, onNavigate }: LecturerSessionsPageProps) {
    const [selectedModuleId, setSelectedModuleId] = useState('');

    const sessions = getSessionsByLecturerId(currentUser.id);

    // Filter sessions
    const filteredSessions = sessions.filter(session => {
        if (selectedModuleId && session.moduleId !== selectedModuleId) return false;
        return true;
    });

    const upcomingSessions = filteredSessions
        .filter(s => s.status === 'scheduled')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const completedSessions = filteredSessions
        .filter(s => s.status === 'completed')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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

    const moduleOptions = [
        { value: '', label: 'All Modules' },
        ...mockModules.map(m => ({ value: m.id, label: `${m.code} - ${m.name}` }))
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-[var(--space-xl)]">
            {/* Page Title */}
            <div>
                <h1 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">
                    My Sessions
                </h1>
                <p className="text-[var(--color-text-secondary)] mt-[var(--space-sm)]">
                    Manage all your scheduled classes and review past sessions
                </p>
            </div>

            {/* Filters */}
            <Card>
                <div className="flex items-end gap-[var(--space-md)]">
                    <div className="flex-1 max-w-md">
                        <Select
                            label="Filter by Module"
                            options={moduleOptions}
                            value={selectedModuleId}
                            onChange={(e) => setSelectedModuleId(e.target.value)}
                            fullWidth
                        />
                    </div>
                </div>
            </Card>

            {/* Upcoming Sessions */}
            <Card>
                <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)] mb-[var(--space-lg)]">
                    Upcoming Schedule
                </h2>

                {upcomingSessions.length > 0 ? (
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
                                            {isUpcoming(session.date) && (
                                                <StatusBadge status="warning">Soon</StatusBadge>
                                            )}
                                        </div>
                                        <p className="text-[var(--color-text-secondary)]">
                                            {session.moduleName}
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onNavigate('reschedule', { sessionId: session.id })}
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
                                        <span>{session.time} ({session.duration}h duration)</span>
                                    </div>
                                    <div className="flex items-center gap-[var(--space-sm)] text-[var(--color-text-secondary)]">
                                        <MapPin className="w-4 h-4 flex-shrink-0" />
                                        <span className="truncate">{session.location}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-[var(--space-2xl)] text-[var(--color-text-secondary)]">
                        <Calendar className="w-12 h-12 mx-auto mb-[var(--space-md)] opacity-50" />
                        <p>No upcoming sessions found</p>
                    </div>
                )}
            </Card>

            {/* Past Sessions */}
            <Card>
                <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)] mb-[var(--space-lg)]">
                    Completed Sessions
                </h2>

                {completedSessions.length > 0 ? (
                    <div className="space-y-[var(--space-md)]">
                        {completedSessions.map((session) => (
                            <div
                                key={session.id}
                                className="p-[var(--space-lg)] bg-[var(--color-bg-main)] rounded-lg"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
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
                                        {session.topicsCovered && (
                                            <p className="mt-[var(--space-sm)] text-[var(--font-size-small)] text-[var(--color-text-secondary)]">
                                                Topics: {session.topicsCovered}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-[var(--space-2xl)] text-[var(--color-text-secondary)]">
                        <p>No completed sessions found</p>
                    </div>
                )}
            </Card>
        </div>
    );
}
