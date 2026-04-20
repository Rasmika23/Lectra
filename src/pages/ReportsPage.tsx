import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { Download, FileText, Calendar, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { fetchWithAuth } from '../lib/api';

interface ReportsPageProps {
  currentUser: any;
  onNavigate: (page: string) => void;
  onLogout?: () => void;
}

export function ReportsPage({ currentUser, onNavigate, onLogout }: ReportsPageProps) {
  const [reportType, setReportType] = useState('');
  const [selectedModule, setSelectedModule] = useState('all');
  const [selectedLecturer, setSelectedLecturer] = useState('all');
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [format, setFormat] = useState('pdf');
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  
  const [modules, setModules] = useState<any[]>([]);
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFilters();
  }, []);

  // Reset lecturer selection when module changes
  useEffect(() => {
    setSelectedLecturer('all');
  }, [selectedModule]);

  const fetchFilters = async () => {
    try {
      const [modulesRes, usersRes] = await Promise.all([
        fetchWithAuth(`${API_BASE_URL}/modules`),
        fetchWithAuth(`${API_BASE_URL}/users`)
      ]);
      
      const modulesData = await modulesRes.json();
      const usersData = await usersRes.json();
      
      setModules(modulesData);
      setLecturers(usersData.filter((u: any) => u.role === 'lecturer'));
    } catch (err) {
      console.error('Error fetching filters:', err);
      setError('Failed to load filter options');
    }
  };

  const reportTypeOptions = [
    { value: '', label: 'Select report type' },
    { value: 'attendance', label: 'Attendance Report' },
    { value: 'topics', label: 'Topics Covered Report' },
    { value: 'reschedules', label: 'Rescheduled Sessions Report' },
    { value: 'bank-details', label: 'Lecturer Bank Details' },
    { value: 'weekly-schedule', label: 'Weekly Schedule Report' },
    { value: 'visiting-lecturers', label: 'Visiting Lecturers Report' },
    { value: 'modules', label: 'Module Assignments Report' },
  ];

  const isDateDisabled = ['visiting-lecturers', 'modules', 'bank-details', 'weekly-schedule'].includes(reportType);

  const moduleOptions = [
    { value: 'all', label: 'All Modules' },
    ...modules.map(m => ({
      value: m.moduleid.toString(),
      label: `[${m.modulecode}] ${m.modulename} (${m.academicyear} - Sem ${m.semester})`
    }))
  ];

  const lecturerOptions = [
    { value: 'all', label: 'All Lecturers' },
    ...lecturers
      .filter(l => {
        if (selectedModule === 'all') return true;
        const moduleIdNum = parseInt(selectedModule);
        return l.assignedmoduleids && Array.isArray(l.assignedmoduleids) && l.assignedmoduleids.includes(moduleIdNum);
      })
      .map(l => ({
        value: l.userid.toString(),
        label: l.name
      }))
  ];

  const formatOptions = [
    { value: 'pdf', label: 'PDF Document' },
    { value: 'excel', label: 'Excel Spreadsheet' },
  ];

  const handleGeneratePreview = async () => {
    if (!reportType) return;
    
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        type: reportType,
        moduleId: selectedModule,
        lecturerId: selectedLecturer,
        startDate,
        endDate
      });
      
      const res = await fetchWithAuth(`${API_BASE_URL}/reports/data?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch preview data');
      
      const data = await res.json();
      setPreviewData(data);
      setShowPreview(true);
    } catch (err: any) {
      console.error('Error generating preview:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!reportType) return;
    
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        type: reportType,
        moduleId: selectedModule,
        lecturerId: selectedLecturer,
        startDate,
        endDate,
        format
      });
      
      const res = await fetchWithAuth(`${API_BASE_URL}/reports/export?${queryParams.toString()}`);
      
      // If response is JSON, it might be an error even with 200 status (unlikely but safe to check)
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to export report');
      }

      if (!res.ok) throw new Error('Failed to export report');
      
      const arrayBuffer = await res.arrayBuffer();
      // Explicitly set the MIME type based on format to ensure browser consistency
      const fileBlob = new Blob([arrayBuffer], { 
        type: format === 'excel' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
          : 'application/pdf' 
      });
      
      const url = window.URL.createObjectURL(fileBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}_report.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
    } catch (err: any) {
      console.error('Error downloading report:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderTableHeaders = () => {
    if (previewData.length === 0) return null;
    return (
      <tr className="border-b-2 border-[#E2E8F0]">
        {Object.keys(previewData[0]).map((key) => (
          <th key={key} className="text-left py-[var(--space-md)] px-[var(--space-sm)] text-[var(--font-size-small)] font-bold text-[var(--color-text-primary)]">
            {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}
          </th>
        ))}
      </tr>
    );
  };

  const renderTableRows = () => {
    return previewData.slice(0, 10).map((row, idx) => (
      <tr key={idx} className="border-b border-[#E2E8F0]">
        {Object.values(row).map((val: any, i) => (
          <td key={i} className="py-[var(--space-md)] px-[var(--space-sm)] text-[var(--font-size-small)]">
            {typeof val === 'boolean' ? (
              val ? <StatusBadge status="success">Yes</StatusBadge> : <StatusBadge status="neutral">No</StatusBadge>
            ) : (
              val?.toString() || ''
            )}
          </td>
        ))}
      </tr>
    ));
  };

  return (
    <div className="h-full">
      <div className="flex-1 flex flex-col h-full">
        <main className="flex-1 overflow-y-auto p-[var(--space-xl)]">
          <div className="max-w-7xl mx-auto space-y-[var(--space-xl)]">
            <div>
              <h1 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">
                Reports & Analytics
              </h1>
              <p className="text-[var(--color-text-secondary)] mt-[var(--space-sm)]">
                Generate comprehensive reports for attendance, topics, and bank details
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
                <AlertCircle className="w-5 h-5 mr-3" />
                {error}
              </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-[var(--space-xl)]">
              <div className="lg:col-span-1 space-y-[var(--space-xl)]">
                <Card>
                  <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)] mb-[var(--space-lg)]">
                    Configuration
                  </h2>
                  
                  <div className="space-y-[var(--space-lg)]">
                    <Select
                      label="Report Type"
                      options={reportTypeOptions}
                      value={reportType}
                      onChange={(e) => setReportType(e.target.value)}
                      fullWidth
                      required
                    />
                    
                    <Select
                      label="Module"
                      options={moduleOptions}
                      value={selectedModule}
                      onChange={(e) => setSelectedModule(e.target.value)}
                      fullWidth
                    />

                    <Select
                      label="Lecturer"
                      options={lecturerOptions}
                      value={selectedLecturer}
                      onChange={(e) => setSelectedLecturer(e.target.value)}
                      fullWidth
                    />
                    
                    <Input
                      label="Start Date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      fullWidth
                      disabled={isDateDisabled}
                    />
                    
                    <Input
                      label="End Date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      fullWidth
                      disabled={isDateDisabled}
                    />
                    
                    <Select
                      label="Export Format"
                      options={formatOptions}
                      value={format}
                      onChange={(e) => setFormat(e.target.value)}
                      fullWidth
                    />
                  </div>
                  
                  <div className="mt-[var(--space-xl)] space-y-[var(--space-md)]">
                    <Button
                      variant="primary"
                      size="lg"
                      fullWidth
                      onClick={handleGeneratePreview}
                      disabled={!reportType || loading}
                    >
                      {loading ? 'Processing...' : 'Generate Preview'}
                    </Button>
                    <Button
                      variant="secondary"
                      size="lg"
                      fullWidth
                      onClick={handleDownload}
                      disabled={!reportType || loading}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Report
                    </Button>
                  </div>
                </Card>
              </div>
              
              <div className="lg:col-span-2">
                <Card>
                  <div className="flex items-center justify-between mb-[var(--space-lg)]">
                    <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)]">
                      Report Preview
                    </h2>
                    {showPreview && reportType && (
                      <StatusBadge status="info">
                        {reportTypeOptions.find(o => o.value === reportType)?.label}
                      </StatusBadge>
                    )}
                  </div>
                  
                  {showPreview && previewData.length > 0 ? (
                    <div className="space-y-[var(--space-lg)]">
                      <div className="overflow-x-auto">
                        <table className="w-full" role="table">
                          <thead>
                            {renderTableHeaders()}
                          </thead>
                          <tbody>
                            {renderTableRows()}
                          </tbody>
                        </table>
                      </div>
                      {previewData.length > 10 && (
                        <p className="text-center text-[var(--font-size-small)] text-[var(--color-text-secondary)] italic">
                          Showing first 10 records. Download the full report for all data.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-[var(--space-2xl)] text-[var(--color-text-secondary)]">
                      <FileText className="w-16 h-16 mx-auto mb-[var(--space-lg)] opacity-50" />
                      <p className="font-medium">{loading ? 'Loading data...' : 'No data available'}</p>
                      {!loading && (
                        <p className="text-[var(--font-size-small)] mt-2">
                          Select filters and click "Generate Preview"
                        </p>
                      )}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
