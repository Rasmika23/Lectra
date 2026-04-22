import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config';
import { useScrollToTop } from '../lib/hooks';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Button } from '../components/Button';
import {
  ArrowLeft, Plus, Calendar, Edit2, Trash2, Check, X
} from 'lucide-react';
import { toast } from 'sonner';
import { DatePicker } from '../components/DatePicker';
import { authHeaders } from '../lib/api';

interface Term {
  termid: number;
  academicyear: string;
  semester: string;
  semesterenddate: string | null;
}

interface TermsManagementPageProps {
  currentUser: any;
  onNavigate: (page: string) => void;
  onLogout?: () => void;
}

const API = API_BASE_URL;

export function TermsManagementPage({ currentUser, onNavigate, onLogout }: TermsManagementPageProps) {
  const [terms, setTerms] = useState<Term[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingTermId, setEditingTermId] = useState<number | null>(null);

  // New Term Form
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newYear, setNewYear] = useState('');
  const [newSemester, setNewSemester] = useState('');
  const [newEndDate, setNewEndDate] = useState('');

  // Edit Term Form
  const [editYear, setEditYear] = useState('');
  const [editSemester, setEditSemester] = useState('');
  const [editEndDate, setEditEndDate] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollToTop(scrollRef, [showForm]);

  const fetchTerms = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/terms`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch terms');
      const data = await res.json();
      setTerms(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load terms');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTerms();
  }, []);

  const handleCreateTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API}/terms`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          academicyear: newYear,
          semester: newSemester,
          semesterenddate: newEndDate || null
        })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create term');
      }
      toast.success('Term created successfully');
      setShowForm(false);
      setNewYear('');
      setNewSemester('');
      setNewEndDate('');
      await fetchTerms();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (term: Term) => {
    setEditingTermId(term.termid);
    setEditYear(term.academicyear);
    setEditSemester(term.semester);
    
    // Safely handle date splitting for the edit form
    let dateStr = '';
    if (term.semesterenddate) {
      if (typeof term.semesterenddate === 'string') {
        dateStr = term.semesterenddate.split('T')[0];
      } else if (term.semesterenddate instanceof Date) {
        dateStr = term.semesterenddate.toISOString().split('T')[0];
      }
    }
    setEditEndDate(dateStr);
  };

  const handleCancelEdit = () => {
    setEditingTermId(null);
  };

  const handleSaveEdit = async () => {
    if (!editingTermId) return;
    try {
      const res = await fetch(`${API}/terms/${editingTermId}`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          academicyear: editYear,
          semester: editSemester,
          semesterenddate: editEndDate || null
        })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update term');
      }
      toast.success('Term updated successfully');
      setEditingTermId(null);
      await fetchTerms();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this term?')) return;
    try {
      const res = await fetch(`${API}/terms/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete term');
      }
      toast.success('Term deleted successfully');
      await fetchTerms();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const academicYearOptions = [
    { value: '', label: 'Select academic year' },
    { value: '2024/2025', label: '2024/2025' },
    { value: '2025/2026', label: '2025/2026' },
    { value: '2026/2027', label: '2026/2027' },
    { value: '2027/2028', label: '2027/2028' },
    { value: '2028/2029', label: '2028/2029' }
  ];

  const semesterOptions = [
    { value: '', label: 'Select semester' },
    { value: '1', label: 'Semester 1' },
    { value: '2', label: 'Semester 2' }
  ];

  const today = new Date().toISOString().split('T')[0];

  return (
    <div ref={scrollRef} className="flex-1 p-[var(--space-xl)] overflow-x-hidden">
      <div className="max-w-4xl mx-auto space-y-[var(--space-xl)]">

        <button
          onClick={() => onNavigate('module-management')}
          className="flex items-center gap-[var(--space-sm)] text-[var(--color-primary)] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Module Management</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-[var(--space-md)]">
          <div>
            <h1 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">Manage Terms</h1>
            <p className="text-[var(--color-text-secondary)] mt-[var(--space-sm)]">
              Create and configure academic terms for modules
            </p>
          </div>
          {!showForm && (
            <Button variant="primary" icon={<Plus className="w-5 h-5" />} onClick={() => setShowForm(true)}>
              Create Term
            </Button>
          )}
        </div>

        {showForm && (
          <Card>
            <div className="flex items-center justify-between mb-[var(--space-lg)]">
              <h2 className="text-xl font-bold text-[var(--color-text-primary)]">New Academic Term</h2>
              <Button variant="ghost" size="sm" icon={<X className="w-5 h-5" />} onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
            <form onSubmit={handleCreateTerm} className="space-y-[var(--space-lg)]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--space-md)]">
                <Select
                  label="Academic Year"
                  options={academicYearOptions}
                  value={newYear}
                  onChange={(e) => setNewYear(e.target.value)}
                  required
                />
                <Select
                  label="Semester"
                  options={semesterOptions}
                  value={newSemester}
                  onChange={(e) => setNewSemester(e.target.value)}
                  required
                />
                <DatePicker
                  label="Semester End Date"
                  value={newEndDate}
                  onChange={setNewEndDate}
                  required
                />
              </div>
              <div className="flex justify-end pt-[var(--space-md)] border-t border-[#E2E8F0]">
                <Button type="submit" variant="primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Save Term'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--color-bg-sidebar)] border-b border-[#E2E8F0] text-[var(--font-size-small)] text-[var(--color-text-secondary)]">
                  <th className="p-[var(--space-md)] font-semibold">Academic Year</th>
                  <th className="p-[var(--space-md)] font-semibold">Semester</th>
                  <th className="p-[var(--space-md)] font-semibold">End Date</th>
                  <th className="p-[var(--space-md)] font-semibold text-center w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && terms.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-[var(--space-xl)] text-center text-[var(--color-text-secondary)]">
                      Loading terms...
                    </td>
                  </tr>
                ) : terms.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-[var(--space-xl)] text-center text-[var(--color-text-secondary)]">
                      <div className="flex flex-col items-center gap-3">
                        <Calendar className="w-12 h-12 opacity-30 mx-auto" />
                        <p>No terms found</p>
                        <p className="text-sm">Click "Create Term" to add one</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  terms.map(term => {
                    const isEditing = editingTermId === term.termid;
                    return (
                      <tr key={term.termid} className="border-b border-[#E2E8F0] last:border-0 hover:bg-[var(--color-bg-main)] transition-colors">
                        <td className="p-[var(--space-md)]">
                          {isEditing ? (
                            <Select 
                              options={academicYearOptions} 
                              value={editYear} 
                              onChange={(e) => setEditYear(e.target.value)}
                            />
                          ) : (
                            <span className="font-medium text-[var(--color-text-primary)]">{term.academicyear}</span>
                          )}
                        </td>
                        <td className="p-[var(--space-md)]">
                          {isEditing ? (
                            <Select 
                              options={semesterOptions} 
                              value={editSemester} 
                              onChange={(e) => setEditSemester(e.target.value)}
                            />
                          ) : (
                            <span className="text-[var(--color-text-secondary)]">Semester {term.semester}</span>
                          )}
                        </td>
                        <td className="p-[var(--space-md)]">
                          {isEditing ? (
                            <DatePicker 
                              value={editEndDate}
                              onChange={setEditEndDate}
                            />
                          ) : (
                            <span className="text-[var(--color-text-secondary)] flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              {term.semesterenddate ? new Date(term.semesterenddate).toLocaleDateString() : 'Not Set'}
                            </span>
                          )}
                        </td>
                        <td className="p-[var(--space-md)]">
                          <div className="flex items-center justify-center gap-2">
                            {isEditing ? (
                              <>
                                <Button variant="ghost" size="sm" onClick={handleSaveEdit} className="text-green-600 hover:bg-green-50">
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={handleCancelEdit} className="text-gray-500 hover:bg-gray-100">
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => handleStartEdit(term)} className="text-blue-500 hover:bg-blue-50">
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(term.termid)} className="text-red-500 hover:bg-red-50">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

      </div>
    </div>
  );
}
