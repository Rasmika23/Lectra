import React, { useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Select } from '../components/Select';
import { Modal } from '../components/Modal';
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';
import { mockStudentTimetable, mockSessions } from '../lib/mockData';

interface LectureReschedulePageProps {
  currentUser: any;
  onNavigate: (page: string) => void;
}

interface TimeSlot {
  day: string;
  time: string;
  available: boolean;
  reason?: string;
}

export function LectureReschedulePage({ currentUser, onNavigate }: LectureReschedulePageProps) {
  const [duration, setDuration] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(0); // 0 = current week
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Mock session being rescheduled
  const currentSession = {
    moduleCode: 'INTE 11123',
    moduleName: 'Software Architecture',
    currentDate: 'Wednesday, January 28, 2026',
    currentTime: '10:00',
  };

  const durationOptions = [
    { value: '', label: 'Select duration' },
    { value: '1', label: '1 hour' },
    { value: '1.5', label: '1.5 hours' },
    { value: '2', label: '2 hours' },
    { value: '3', label: '3 hours' },
  ];

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00'
  ];

  const getWeekDates = (weekOffset: number) => {
    const today = new Date('2026-01-28');
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1 + (weekOffset * 7));

    return days.map((day, index) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + index);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
  };

  const isSlotAvailable = (day: string, time: string): { available: boolean; reason?: string } => {
    if (!duration) return { available: false, reason: 'Select duration first' };

    const durationHours = parseFloat(duration);
    const [hour, minute] = time.split(':').map(Number);
    const endHour = hour + durationHours;

    // Check student timetable conflicts
    const studentConflict = mockStudentTimetable.some(slot => {
      if (slot.day !== day) return false;
      const [slotStartHour] = slot.startTime.split(':').map(Number);
      const [slotEndHour] = slot.endTime.split(':').map(Number);

      // Check if there's any overlap
      return (hour < slotEndHour && endHour > slotStartHour);
    });

    if (studentConflict) {
      return { available: false, reason: 'Student Busy' };
    }

    // Check lecturer's existing sessions (simplified)
    const lecturerConflict = mockSessions.some(session => {
      const sessionDay = new Date(session.date).toLocaleDateString('en-US', { weekday: 'long' });
      if (sessionDay !== day) return false;

      const [sessionHour] = session.time.split(':').map(Number);
      const sessionEndHour = sessionHour + session.duration;

      return (hour < sessionEndHour && endHour > sessionHour);
    });

    if (lecturerConflict) {
      return { available: false, reason: 'Lecturer Busy' };
    }

    // Check if end time is within working hours
    if (endHour > 18) {
      return { available: false, reason: 'After hours' };
    }

    return { available: true };
  };

  const getTimeRange = (startTime: string, durationHours: number): string => {
    const [hour, minute] = startTime.split(':').map(Number);
    const endHour = hour + durationHours;
    const endMinute = minute;

    const formatTime = (h: number, m: number) => {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    return `${startTime} - ${formatTime(endHour, endMinute)}`;
  };

  const handleSlotClick = (day: string, time: string) => {
    const slotStatus = isSlotAvailable(day, time);
    if (slotStatus.available) {
      setSelectedSlot({ day, time, ...slotStatus });
      setShowConfirmModal(true);
    }
  };

  const handleConfirmReschedule = () => {
    // Handle reschedule submission
    setShowConfirmModal(false);
    alert('Reschedule request submitted successfully!');
    onNavigate('lecturer-portal');
  };

  const weekDates = getWeekDates(selectedWeek);

  return (
    <div className="flex h-screen bg-[var(--color-bg-main)]">
      <Sidebar role="lecturer" currentPage="lecturer-portal" onNavigate={onNavigate} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userName={currentUser.name} userRole="Visiting Lecturer" />

        <main className="flex-1 overflow-y-auto p-[var(--space-xl)]">
          <div className="max-w-7xl mx-auto space-y-[var(--space-xl)]">
            {/* Breadcrumb */}
            <button
              onClick={() => onNavigate('lecturer-portal')}
              className="flex items-center gap-[var(--space-sm)] text-[var(--color-primary)] hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to My Schedule</span>
            </button>

            {/* Page Title */}
            <div>
              <h1 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">
                Reschedule Lecture
              </h1>
              <p className="text-[var(--color-text-secondary)] mt-[var(--space-sm)]">
                Select a new time slot that works for both you and the students
              </p>
            </div>

            {/* Current Session Info */}
            <Card className="bg-[#DBEAFE] border-[var(--color-info)]">
              <div className="flex items-start gap-[var(--space-md)]">
                <Calendar className="w-6 h-6 text-[var(--color-info)] flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-[#1E40AF]">
                    {currentSession.moduleCode} - {currentSession.moduleName}
                  </h3>
                  <p className="text-[var(--font-size-small)] text-[#1E40AF] mt-1">
                    Currently scheduled: {currentSession.currentDate} at {currentSession.currentTime}
                  </p>
                </div>
              </div>
            </Card>

            {/* Control Panel */}
            <Card>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--space-lg)]">
                <Select
                  label="Session Duration"
                  options={durationOptions}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  fullWidth
                  helperText="Select the duration to see available slots"
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

            {/* Instructions */}
            {!duration && (
              <Card className="bg-[#FEF3C7] border-[var(--color-warning)]">
                <div className="flex items-center gap-[var(--space-md)]">
                  <Clock className="w-6 h-6 text-[var(--color-warning)]" />
                  <p className="text-[var(--font-size-small)] text-[#92400E]">
                    Please select a session duration to see available time slots in the calendar below.
                  </p>
                </div>
              </Card>
            )}

            {/* Calendar Grid */}
            <Card padding="none">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]" role="grid" aria-label="Available time slots">
                  <thead>
                    <tr className="border-b border-[#E2E8F0]">
                      <th className="p-[var(--space-md)] text-left font-bold text-[var(--color-text-primary)] bg-[var(--color-bg-sidebar)]">
                        Time
                      </th>
                      {days.map((day, index) => (
                        <th
                          key={day}
                          className="p-[var(--space-md)] text-center font-bold text-[var(--color-text-primary)] bg-[var(--color-bg-sidebar)]"
                        >
                          <div>{day}</div>
                          <div className="text-[var(--font-size-small)] font-normal text-[var(--color-text-secondary)] mt-1">
                            {weekDates[index]}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {timeSlots.map((time) => (
                      <tr key={time} className="border-b border-[#E2E8F0] last:border-0">
                        <td className="p-[var(--space-md)] font-medium text-[var(--color-text-secondary)] bg-[var(--color-bg-sidebar)]">
                          {time}
                        </td>
                        {days.map((day) => {
                          const slotStatus = isSlotAvailable(day, time);
                          const isAvailable = slotStatus.available;
                          const reason = slotStatus.reason;

                          return (
                            <td key={`${day}-${time}`} className="p-1">
                              <button
                                onClick={() => handleSlotClick(day, time)}
                                disabled={!isAvailable}
                                className={`
                                  w-full h-16 rounded text-[var(--font-size-small)] font-medium
                                  transition-all duration-200 flex flex-col items-center justify-center
                                  ${isAvailable
                                    ? 'bg-[#D1FAE5] text-[#065F46] hover:bg-[#A7F3D0] cursor-pointer border-2 border-transparent hover:border-[var(--color-success)]'
                                    : 'bg-[#F1F5F9] text-[var(--color-text-disabled)] cursor-not-allowed'
                                  }
                                `}
                                aria-label={`${day} at ${isAvailable ? getTimeRange(time, parseFloat(duration)) : time}: ${isAvailable ? 'Available' : reason}`}
                              >
                                {isAvailable ? (
                                  <>
                                    <span className="font-bold">Available</span>
                                    <span className="text-[11px] mt-1">{getTimeRange(time, parseFloat(duration))}</span>
                                  </>
                                ) : (
                                  <span className="text-[10px] text-center px-1">{reason}</span>
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
            </Card>

            {/* Legend */}
            <Card>
              <h3 className="font-bold text-[var(--color-text-primary)] mb-[var(--space-md)]">
                Legend
              </h3>
              <div className="flex flex-wrap gap-[var(--space-lg)]">
                <div className="flex items-center gap-[var(--space-sm)]">
                  <div className="w-8 h-8 bg-[#D1FAE5] border-2 border-[var(--color-success)] rounded" aria-hidden="true" />
                  <span className="text-[var(--font-size-small)] text-[var(--color-text-secondary)]">
                    Available for selected duration
                  </span>
                </div>
                <div className="flex items-center gap-[var(--space-sm)]">
                  <div className="w-8 h-8 bg-[#F1F5F9] rounded" aria-hidden="true" />
                  <span className="text-[var(--font-size-small)] text-[var(--color-text-secondary)]">
                    Student or Lecturer busy
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </main>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Reschedule Request"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowConfirmModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmReschedule}>
              Submit Request
            </Button>
          </>
        }
      >
        <div className="space-y-[var(--space-lg)]">
          <p className="text-[var(--color-text-secondary)]">
            You are requesting to reschedule the following session:
          </p>

          <div className="p-[var(--space-lg)] bg-[var(--color-bg-sidebar)] rounded-lg space-y-[var(--space-md)]">
            <div>
              <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)]">Module</p>
              <p className="font-bold text-[var(--color-text-primary)]">
                {currentSession.moduleCode} - {currentSession.moduleName}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-[var(--space-md)]">
              <div>
                <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)]">Current Time</p>
                <p className="font-medium text-[var(--color-text-primary)]">
                  {currentSession.currentDate}
                </p>
                <p className="font-medium text-[var(--color-text-primary)]">
                  {currentSession.currentTime}
                </p>
              </div>

              {selectedSlot && (
                <div>
                  <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)]">New Time</p>
                  <p className="font-medium text-[var(--color-success)]">
                    {selectedSlot.day}
                  </p>
                  <p className="font-medium text-[var(--color-success)]">
                    {getTimeRange(selectedSlot.time, parseFloat(duration))}
                  </p>
                </div>
              )}
            </div>
          </div>

          <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)]">
            Your request will be sent to the Sub-Coordinator for approval. You will be notified once it's been reviewed.
          </p>
        </div>
      </Modal>
    </div>
  );
}