import React, { useState } from 'react';
import { authenticatedFetch } from '../lib/api';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Button } from '../components/Button';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface CreateModulePageProps {
  currentUser: any;
  onNavigate: (page: string) => void;
}

export function CreateModulePage({ currentUser, onNavigate }: CreateModulePageProps) {
  const [moduleName, setModuleName] = useState('');
  const [moduleCode, setModuleCode] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [semester, setSemester] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [codeError, setCodeError] = useState('');

  const academicYearOptions = [
    { value: '', label: 'Select academic year' },
    { value: '2024/2025', label: '2024/2025' },
    { value: '2025/2026', label: '2025/2026' },
    { value: '2026/2027', label: '2026/2027' },
  ];

  const semesterOptions = [
    { value: '', label: 'Select semester' },
    { value: 'Semester 1', label: 'Semester 1' },
    { value: 'Semester 2', label: 'Semester 2' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError('');

    // Validate module code format (example: INTE 11123)
    const codePattern = /^[A-Z]{3,4}\s\d{4,5}$/;
    if (!codePattern.test(moduleCode)) {
      setCodeError('Module code must be in format: INTE 11123 (3-4 letters, space, 4-5 digits)');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authenticatedFetch('http://localhost:5000/modules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: moduleName,
          code: moduleCode,
          academicYear,
          semester,
        }),
      });

      if (response.ok) {
        setShowSuccess(true);
        toast.success('Module created successfully');
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Reset form after 3 seconds
        setTimeout(() => {
          setModuleName('');
          setModuleCode('');
          setAcademicYear('');
          setSemester('');
          setShowSuccess(false);
        }, 3000);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to create module');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (error) {
      console.error('Error creating module:', error);
      toast.error('Network error. Please try again.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-[var(--space-xl)]">
      {/* Breadcrumb */}
      <button
        onClick={() => onNavigate('main-dashboard')}
        className="flex items-center gap-[var(--space-sm)] text-[var(--color-primary)] hover:underline"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </button>

      {/* Page Title */}
      <div>
        <h1 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">
          Create New Module
        </h1>
        <p className="text-[var(--color-text-secondary)] mt-[var(--space-sm)]">
          Set up a new academic module for the visiting lecturer program
        </p>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <Card className="bg-[#D1FAE5] border-[var(--color-success)]">
          <div className="flex items-center gap-[var(--space-md)]">
            <CheckCircle className="w-6 h-6 text-[var(--color-success)]" />
            <div>
              <p className="font-bold text-[#065F46]">Module created successfully!</p>
              <p className="text-[var(--font-size-small)] text-[#047857] mt-1">
                {moduleCode} - {moduleName} has been added to the system.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Form */}
      <Card>
        <form onSubmit={handleSubmit} className="space-y-[var(--space-xl)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--space-lg)]">
            <Input
              label="Module Name"
              type="text"
              placeholder="e.g., Software Architecture"
              value={moduleName}
              onChange={(e) => setModuleName(e.target.value)}
              required
              fullWidth
            />

            <Input
              label="Module Code"
              type="text"
              placeholder="e.g., INTE 11123"
              value={moduleCode}
              onChange={(e) => setModuleCode(e.target.value.toUpperCase())}
              required
              fullWidth
              error={codeError}
              helperText={!codeError ? "Format: 3-4 letters, space, 4-5 digits" : undefined}
            />

            <Select
              label="Academic Year"
              options={academicYearOptions}
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              required
              fullWidth
            />

            <Select
              label="Semester"
              options={semesterOptions}
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              required
              fullWidth
            />
          </div>

          {/* Next Steps Info */}
          <div className="bg-[var(--color-bg-sidebar)] p-[var(--space-lg)] rounded-lg">
            <h3 className="font-bold text-[var(--color-text-primary)] mb-[var(--space-md)]">
              Next Steps After Creation
            </h3>
            <ol className="space-y-[var(--space-sm)] text-[var(--font-size-small)] list-decimal list-inside">
              <li className="text-[var(--color-text-secondary)]">
                Assign a Sub-Coordinator to manage this module
              </li>
              <li className="text-[var(--color-text-secondary)]">
                Add Visiting Lecturers to the module
              </li>
              <li className="text-[var(--color-text-secondary)]">
                Sub-Coordinator will upload student timetable and set reminders
              </li>
              <li className="text-[var(--color-text-secondary)]">
                System will begin sending automated reminders to lecturers
              </li>
            </ol>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-[var(--space-md)] pt-[var(--space-lg)] border-t border-[#E2E8F0]">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Module...' : 'Create Module'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => onNavigate('main-dashboard')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>

      {/* Example Modules */}
      <Card>
        <h3 className="font-bold text-[var(--color-text-primary)] mb-[var(--space-md)]">
          Example Module Codes
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-[var(--space-md)] text-[var(--font-size-small)]">
          <div className="p-[var(--space-md)] bg-[var(--color-bg-main)] rounded">
            <code className="font-mono text-[var(--color-primary)]">INTE 11123</code>
            <p className="text-[var(--color-text-secondary)] mt-1">Computer Science</p>
          </div>
          <div className="p-[var(--space-md)] bg-[var(--color-bg-main)] rounded">
            <code className="font-mono text-[var(--color-primary)]">MATH 3101</code>
            <p className="text-[var(--color-text-secondary)] mt-1">Mathematics</p>
          </div>
          <div className="p-[var(--space-md)] bg-[var(--color-bg-main)] rounded">
            <code className="font-mono text-[var(--color-primary)]">PHYS 2205</code>
            <p className="text-[var(--color-text-secondary)] mt-1">Physics</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
