import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { Download, FileText, Calendar, TrendingUp, Clock } from 'lucide-react';
import { mockSessions, mockModules } from '../lib/mockData';

interface ReportsPageProps {
  currentUser: any;
  onNavigate: (page: string) => void;
}

interface ReportFormInputs {
  reportType: string;
  selectedModule: string;
  startDate: string;
  endDate: string;
  format: string;
}

export function ReportsPage({ currentUser, onNavigate }: ReportsPageProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<ReportFormInputs | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    trigger
  } = useForm<ReportFormInputs>({
    defaultValues: {
      reportType: '',
      selectedModule: 'all',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      format: 'pdf',
    },
    mode: 'onChange' // Validate on change for immediate feedback
  });

  const watchAllFields = watch();
  const startDate = watch('startDate');

  const reportTypeOptions = [
    { value: '', label: 'Select report type' },
    { value: 'attendance', label: 'Attendance Report' },
    { value: 'topics', label: 'Topics Covered Report' },
    { value: 'reschedules', label: 'Rescheduled Sessions Report' },
    { value: 'completion', label: 'Module Completion Report' },
  ];

  const moduleOptions = [
    { value: 'all', label: 'All Modules' },
    ...mockModules.map(m => ({
      value: m.id,
      label: `${m.code} - ${m.name}`
    }))
  ];

  const formatOptions = [
    { value: 'pdf', label: 'PDF Document' },
    { value: 'excel', label: 'Excel Spreadsheet' },
    { value: 'csv', label: 'CSV File' },
  ];

  const handleGeneratePreview = (data: ReportFormInputs) => {
    setPreviewData(data);
    setShowPreview(true);
  };

  const handleDownload = async () => {
    const isValid = await trigger();
    if (isValid) {
      alert(`Downloading ${watchAllFields.reportType} report as ${watchAllFields.format.toUpperCase()}...`);
    }
  };

  // Calculate statistics
  const totalSessions = mockSessions.length;
  const completedSessions = mockSessions.filter(s => s.status === 'completed').length;
  const rescheduledSessions = mockSessions.filter(s => s.status === 'rescheduled').length;
  const attendanceRate = Math.round((mockSessions.filter(s => s.attended).length / completedSessions) * 100) || 0;

  return (
    <div className="max-w-7xl mx-auto space-y-[var(--space-xl)]">
      {/* Page Title */}
      <div>
        <h1 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">
          Reports & Analytics
        </h1>
        <p className="text-[var(--color-text-secondary)] mt-[var(--space-sm)]">
          Generate comprehensive reports for attendance, topics, and module completion
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-[var(--space-lg)]">
        <Card padding="lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mb-[var(--space-sm)]">
                Total Sessions
              </p>
              <h2 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">
                {totalSessions}
              </h2>
            </div>
            <Calendar className="w-6 h-6 text-[var(--color-primary)]" />
          </div>
        </Card>

        <Card padding="lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mb-[var(--space-sm)]">
                Completed
              </p>
              <h2 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">
                {completedSessions}
              </h2>
            </div>
            <TrendingUp className="w-6 h-6 text-[var(--color-success)]" />
          </div>
        </Card>

        <Card padding="lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mb-[var(--space-sm)]">
                Rescheduled
              </p>
              <h2 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">
                {rescheduledSessions}
              </h2>
            </div>
            <Clock className="w-6 h-6 text-[var(--color-warning)]" />
          </div>
        </Card>

        <Card padding="lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mb-[var(--space-sm)]">
                Attendance Rate
              </p>
              <h2 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">
                {attendanceRate}%
              </h2>
            </div>
            <FileText className="w-6 h-6 text-[var(--color-info)]" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[var(--space-xl)]">
        {/* Report Configuration */}
        <form className="lg:col-span-1 space-y-[var(--space-xl)]" onSubmit={handleSubmit(handleGeneratePreview)}>
          <Card>
            <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)] mb-[var(--space-lg)]">
              Report Configuration
            </h2>

            <div className="space-y-[var(--space-lg)]">
              <Select
                label="Report Type"
                options={reportTypeOptions}
                fullWidth
                {...register("reportType", { required: "Please select a report type" })}
                error={errors.reportType?.message}
              />

              <Select
                label="Module"
                options={moduleOptions}
                fullWidth
                {...register("selectedModule")}
              />

              <Input
                label="Start Date"
                type="date"
                fullWidth
                {...register("startDate", {
                  required: "Start date is required",
                  validate: (value) => {
                    const selected = new Date(value);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0); // Reset time for accurate comparison
                    return selected <= today || "Start date cannot be in the future";
                  }
                })}
                error={errors.startDate?.message}
              />

              <Input
                label="End Date"
                type="date"
                fullWidth
                {...register("endDate", {
                  required: "End date is required",
                  validate: (value) => {
                    if (!startDate) return true;
                    return new Date(value) >= new Date(startDate) || "End date must be after start date";
                  }
                })}
                error={errors.endDate?.message}
              />

              <Select
                label="Export Format"
                options={formatOptions}
                fullWidth
                {...register("format")}
              />
            </div>

            <div className="mt-[var(--space-xl)] space-y-[var(--space-md)]">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
              >
                Generate Preview
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                fullWidth
                onClick={handleDownload}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </Button>
            </div>
          </Card>

          {/* Report Descriptions */}
          <Card>
            <h3 className="font-bold text-[var(--color-text-primary)] mb-[var(--space-md)]">
              Report Types
            </h3>
            <div className="space-y-[var(--space-md)] text-[var(--font-size-small)]">
              <div>
                <p className="font-medium text-[var(--color-text-primary)]">Attendance Report</p>
                <p className="text-[var(--color-text-secondary)] mt-1">
                  Lecturer attendance records for payroll
                </p>
              </div>
              <div>
                <p className="font-medium text-[var(--color-text-primary)]">Topics Covered</p>
                <p className="text-[var(--color-text-secondary)] mt-1">
                  Session content for academic audits
                </p>
              </div>
              <div>
                <p className="font-medium text-[var(--color-text-primary)]">Reschedules</p>
                <p className="text-[var(--color-text-secondary)] mt-1">
                  Log of all rescheduled sessions
                </p>
              </div>
              <div>
                <p className="font-medium text-[var(--color-text-primary)]">Module Completion</p>
                <p className="text-[var(--color-text-secondary)] mt-1">
                  Progress tracking per module
                </p>
              </div>
            </div>
          </Card>
        </form>

        {/* Report Preview */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-[var(--space-lg)]">
              <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)]">
                Report Preview
              </h2>
              {showPreview && previewData && (
                <StatusBadge status="info">
                  {previewData.reportType.charAt(0).toUpperCase() + previewData.reportType.slice(1)} Report
                </StatusBadge>
              )}
            </div>

            {showPreview && previewData ? (
              <div className="space-y-[var(--space-lg)]">
                {/* Report Header */}
                <div className="p-[var(--space-lg)] bg-[var(--color-bg-sidebar)] rounded-lg">
                  <h3 className="font-bold text-[var(--color-text-primary)] mb-[var(--space-sm)]">
                    {previewData.reportType.charAt(0).toUpperCase() + previewData.reportType.slice(1)} Report
                  </h3>
                  <div className="grid grid-cols-2 gap-[var(--space-md)] text-[var(--font-size-small)]">
                    <div>
                      <span className="text-[var(--color-text-secondary)]">Period:</span>
                      <span className="ml-2 font-medium">{previewData.startDate} to {previewData.endDate}</span>
                    </div>
                    <div>
                      <span className="text-[var(--color-text-secondary)]">Module:</span>
                      <span className="ml-2 font-medium">
                        {previewData.selectedModule === 'all' ? 'All Modules' : mockModules.find(m => m.id === previewData.selectedModule)?.code}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Report Content */}
                <div className="overflow-x-auto">
                  <table className="w-full" role="table">
                    <thead>
                      <tr className="border-b-2 border-[#E2E8F0]">
                        <th className="text-left py-[var(--space-md)] px-[var(--space-sm)] text-[var(--font-size-small)] font-bold text-[var(--color-text-primary)]">
                          Date
                        </th>
                        <th className="text-left py-[var(--space-md)] px-[var(--space-sm)] text-[var(--font-size-small)] font-bold text-[var(--color-text-primary)]">
                          Module
                        </th>
                        <th className="text-left py-[var(--space-md)] px-[var(--space-sm)] text-[var(--font-size-small)] font-bold text-[var(--color-text-primary)]">
                          Lecturer
                        </th>
                        {previewData.reportType === 'attendance' && (
                          <th className="text-center py-[var(--space-md)] px-[var(--space-sm)] text-[var(--font-size-small)] font-bold text-[var(--color-text-primary)]">
                            Status
                          </th>
                        )}
                        {previewData.reportType === 'topics' && (
                          <th className="text-left py-[var(--space-md)] px-[var(--space-sm)] text-[var(--font-size-small)] font-bold text-[var(--color-text-primary)]">
                            Topics Covered
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {mockSessions
                        .filter(s => s.status === 'completed')
                        .slice(0, 5)
                        .map((session) => (
                          <tr key={session.id} className="border-b border-[#E2E8F0]">
                            <td className="py-[var(--space-md)] px-[var(--space-sm)] text-[var(--font-size-small)]">
                              {new Date(session.date).toLocaleDateString()}
                            </td>
                            <td className="py-[var(--space-md)] px-[var(--space-sm)] text-[var(--font-size-small)]">
                              {session.moduleCode}
                            </td>
                            <td className="py-[var(--space-md)] px-[var(--space-sm)] text-[var(--font-size-small)]">
                              {session.lecturerName}
                            </td>
                            {previewData.reportType === 'attendance' && (
                              <td className="py-[var(--space-md)] px-[var(--space-sm)] text-center">
                                {session.attended ? (
                                  <StatusBadge status="success">Present</StatusBadge>
                                ) : (
                                  <StatusBadge status="neutral">Not Recorded</StatusBadge>
                                )}
                              </td>
                            )}
                            {previewData.reportType === 'topics' && (
                              <td className="py-[var(--space-md)] px-[var(--space-sm)] text-[var(--font-size-small)]">
                                {session.topicsCovered || 'Not recorded'}
                              </td>
                            )}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Report Summary */}
                <div className="p-[var(--space-lg)] bg-[var(--color-bg-sidebar)] rounded-lg">
                  <h4 className="font-bold text-[var(--color-text-primary)] mb-[var(--space-md)]">
                    Summary
                  </h4>
                  <div className="grid grid-cols-3 gap-[var(--space-lg)] text-center">
                    <div>
                      <p className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)]">
                        {completedSessions}
                      </p>
                      <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mt-1">
                        Sessions
                      </p>
                    </div>
                    <div>
                      <p className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)]">
                        {mockSessions.reduce((sum, s) => sum + s.duration, 0)}
                      </p>
                      <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mt-1">
                        Total Hours
                      </p>
                    </div>
                    <div>
                      <p className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)]">
                        {attendanceRate}%
                      </p>
                      <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mt-1">
                        Recorded
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-[var(--space-2xl)] text-[var(--color-text-secondary)]">
                <FileText className="w-16 h-16 mx-auto mb-[var(--space-lg)] opacity-50" />
                <p className="font-medium">No preview available</p>
                <p className="text-[var(--font-size-small)] mt-2">
                  Select a report type and click "Generate Preview" to see the report data
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
