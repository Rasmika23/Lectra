import React, { useState, useRef, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Button } from '../components/Button';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { useScrollToTop } from '../lib/hooks';
import { fetchWithAuth } from '../lib/api';
import { toast } from 'sonner';

interface CreateModulePageProps {
  currentUser: any;
  onNavigate: (page: string) => void;
  onLogout?: () => void;
}

export function CreateModulePage({ currentUser, onNavigate, onLogout }: CreateModulePageProps) {
  const [moduleName, setModuleName] = useState('');
  const [moduleCode, setModuleCode] = useState('');
  const [termId, setTermId] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [codeError, setCodeError] = useState('');
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  useScrollToTop(scrollContainerRef, [showSuccess, codeError]);

  const [terms, setTerms] = useState<any[]>([]);
  const [isLoadingTerms, setIsLoadingTerms] = useState(true);

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/terms`);
        if (res.ok) setTerms(await res.json());
      } catch (err) {
        toast.error('Failed to load terms');
      } finally {
        setIsLoadingTerms(false);
      }
    };
    fetchTerms();
  }, []);

  const termOptions = [
    { value: '', label: isLoadingTerms ? 'Loading...' : 'Select a term' },
    ...terms.map(t => ({
      value: String(t.termid),
      label: `${t.academicyear} - Semester ${t.semester}`
    }))
  ];
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError('');
    
    // Validate module code format (e.g., COSC 2202 or ABCDS 12345)
    const codePattern = /^[A-Z]{3,5}\s\d{3,5}$/;
    if (!codePattern.test(moduleCode)) {
      setCodeError('Module code must be in format: [LETTERS] [NUMBERS] (e.g., ABCDS 12345)');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleCode,
          moduleName,
          termId: parseInt(termId)
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create module');
      }

      toast.success('Module created successfully!');
      setShowSuccess(true);
      
      // Reset form after a delay and navigate back to modules
      setTimeout(() => {
        setModuleName('');
        setModuleCode('');
        setTermId('');
        setShowSuccess(false);
        onNavigate('module-management');
      }, 2000);

    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="h-full">
            
      <div className="flex-1 flex flex-col h-full">
                
        <main 
          ref={scrollContainerRef}
          className="h-full p-[var(--space-xl)] bg-[var(--color-bg-sidebar)]"
        >
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
              <Card className="bg-[#D1FAE5] border-[var(--color-success)] mb-[var(--space-lg)]">
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
                    placeholder="e.g., ABCDS 12345"
                    value={moduleCode}
                    onChange={(e) => setModuleCode(e.target.value.toUpperCase())}
                    required
                    fullWidth
                    error={codeError}
                    helperText={!codeError ? "Format: Letters, space, and numbers (e.g., ABCDS 12345)" : undefined}
                  />
                  
                  <Select
                    label="Academic Term"
                    options={termOptions}
                    value={termId}
                    onChange={(e) => setTermId(e.target.value)}
                    required
                    fullWidth
                  />
                  
                  {/* Empty div to balance grid */}
                  <div></div>
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
                  <code className="font-mono text-[var(--color-primary)]">ABCDS 12345</code>
                  <p className="text-[var(--color-text-secondary)] mt-1">Example Code</p>
                </div>
                <div className="p-[var(--space-md)] bg-[var(--color-bg-main)] rounded">
                  <code className="font-mono text-[var(--color-primary)]">COSC 2202</code>
                  <p className="text-[var(--color-text-secondary)] mt-1">Computer Science</p>
                </div>
                <div className="p-[var(--space-md)] bg-[var(--color-bg-main)] rounded">
                  <code className="font-mono text-[var(--color-primary)]">MATH 3101</code>
                  <p className="text-[var(--color-text-secondary)] mt-1">Mathematics</p>
                </div>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
