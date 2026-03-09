import React, { useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Checkbox } from '../components/Checkbox';
import { ArrowLeft, CheckCircle, Calendar, Clock, MapPin } from 'lucide-react';
import { mockSessions, mockModules } from '../lib/mockData';

interface AttendanceRecordingPageProps {
  currentUser: any;
  onNavigate: (page: string) => void;
}

export function AttendanceRecordingPage({ currentUser, onNavigate }: AttendanceRecordingPageProps) {
  // Get completed sessions without attendance recorded
  const sessionsNeedingAttendance = mockSessions.filter(
    s => s.status === 'completed' && !s.attended
  );

  const [selectedModule, setSelectedModule] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [attendance, setAttendance] = useState<{ [key: string]: boolean }>({});
  const [topicsCovered, setTopicsCovered] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get sessions for selected module
  const moduleSessions = selectedModule
    ? mockSessions.filter(s => s.moduleId === selectedModule && s.status === 'completed')
    : [];

  const session = selectedSession ? mockSessions.find(s => s.id === selectedSession) : null;
  const module = session ? mockModules.find(m => m.id === session.moduleId) : null;

  const moduleOptions = [
    { value: '', label: 'Select a module' },
    ...mockModules.map(m => ({
      value: m.id,
      label: `${m.code} - ${m.name}`
    }))
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setShowSuccess(true);
      setIsSubmitting(false);

      // Reset after 2 seconds and go back
      setTimeout(() => {
        onNavigate('sub-dashboard');
      }, 2000);
    }, 1000);
  };

  // Get lecturers for the module
  const lecturers = module?.lecturers || [];

  return (
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

      {/* Success Message */}
      {showSuccess && (
        <Card className="bg-[#D1FAE5] border-[var(--color-success)]">
          <div className="flex items-center gap-[var(--space-md)]">
            <CheckCircle className="w-6 h-6 text-[var(--color-success)]" />
            <div>
              <p className="font-bold text-[#065F46]">Attendance recorded successfully!</p>
              <p className="text-[var(--font-size-small)] text-[#047857] mt-1">
                The data has been saved for administrative review and payroll processing.
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
        <select
          value={selectedModule}
          onChange={(e) => {
            setSelectedModule(e.target.value);
            setSelectedSession('');
            setAttendance({});
            setTopicsCovered('');
          }}
          className="w-full px-[var(--space-md)] py-[var(--space-sm)] border border-[#CBD5E1] rounded-lg text-[var(--font-size-body)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-opacity-20"
        >
          {moduleOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Card>

      {/* Session Selection */}
      {selectedModule && (
        <Card>
          <label className="text-[var(--font-size-small)] font-medium text-[var(--color-text-primary)] block mb-[var(--space-sm)]">
            Select Session
          </label>
          {moduleSessions.length > 0 ? (
            <select
              value={selectedSession}
              onChange={(e) => {
                setSelectedSession(e.target.value);
                setAttendance({});
                setTopicsCovered('');
              }}
              className="w-full px-[var(--space-md)] py-[var(--space-sm)] border border-[#CBD5E1] rounded-lg text-[var(--font-size-body)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-opacity-20"
            >
              <option value="">Select a session</option>
              {moduleSessions.map(s => (
                <option key={s.id} value={s.id}>
                  {formatDate(s.date)} at {s.time} - {s.endTime}
                  {s.attended ? ' (Already recorded)' : ' (Needs recording)'}
                </option>
              ))}
            </select>
          ) : (
            <div className="p-[var(--space-lg)] bg-[var(--color-bg-sidebar)] rounded-lg text-center">
              <p className="text-[var(--color-text-secondary)]">
                No completed sessions found for this module
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Session Details */}
      {session && (
        <Card>
          <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)] mb-[var(--space-lg)]">
            Session Details
          </h2>

          <div className="space-y-[var(--space-md)]">
            <div className="p-[var(--space-lg)] bg-[var(--color-bg-main)] rounded-lg">
              <h3 className="font-bold text-[var(--color-text-primary)] mb-[var(--space-md)]">
                {session.moduleCode} - {session.moduleName}
              </h3>

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
          </div>
        </Card>
      )}

      {/* Attendance Form */}
      <form onSubmit={handleSubmit} className="space-y-[var(--space-xl)]">
        <Card>
          <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)] mb-[var(--space-lg)]">
            Lecturer Attendance
          </h2>

          <div className="space-y-[var(--space-md)]">
            <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)]">
              Mark the lecturers who attended this session:
            </p>

            {lecturers.length > 0 ? (
              <div className="space-y-[var(--space-md)]">
                {lecturers.map((lecturer, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-[var(--space-lg)] bg-[var(--color-bg-main)] rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-[var(--color-text-primary)]">
                        {lecturer}
                      </p>
                      <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mt-1">
                        Visiting Lecturer
                      </p>
                    </div>
                    <Checkbox
                      label="Present"
                      checked={attendance[lecturer] || false}
                      onChange={(e) => setAttendance({
                        ...attendance,
                        [lecturer]: e.target.checked
                      })}
                    />
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
          <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)] mb-[var(--space-lg)]">
            Topics Covered
          </h2>

          <div>
            <label
              htmlFor="topics"
              className="text-[var(--font-size-small)] font-medium text-[var(--color-text-primary)] block mb-[var(--space-sm)]"
            >
              Session Content <span className="text-[var(--color-error)]">*</span>
            </label>
            <textarea
              id="topics"
              rows={5}
              value={topicsCovered}
              onChange={(e) => setTopicsCovered(e.target.value)}
              placeholder="e.g., Introduction to Design Patterns, Singleton Pattern Implementation, Factory Pattern Examples"
              required
              className="w-full px-[var(--space-md)] py-[var(--space-sm)] border border-[#CBD5E1] rounded-lg text-[var(--font-size-body)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-opacity-20 resize-vertical"
            />
            <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mt-[var(--space-sm)]">
              Provide a detailed summary of what was taught in this session for academic records
            </p>
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
                <li>This data cannot be edited after submission</li>
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
            disabled={isSubmitting || !topicsCovered}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Attendance Record'}
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
    </div>
  );
}