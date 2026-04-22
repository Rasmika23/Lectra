/**
 * @file ModuleManagementPage.tsx
 * @description Complex page for managing module details, staff assignments (coordinators and lecturers),
 * recurring schedules, automated session generation, and communication.
 * Accessible to Main Coordinators and Sub-Coordinators with varying permissions.
 */

import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config';
import { useScrollToTop } from '../lib/hooks';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Button } from '../components/Button';
import { FileUpload } from '../components/FileUpload';
import {
  ArrowLeft, CheckCircle, Upload, Plus,
  ChevronRight, Users, User, BookOpen, X, AlertCircle,
  UserX, UserCheck, Clock, Bell, Trash2, Search, Calendar, Edit2, MapPin,
  Download, FileText
} from 'lucide-react';
import sampleTimetable from '../assets/Sample Timetable.xlsx?url';
import { toast } from 'sonner';
import { authHeaders } from '../lib/api';
import { AnalogTimePicker } from '../components/AnalogTimePicker';

// ── TYPES & INTERFACES ───────────────────────────────────────────────────────

interface Lecturer { id: number; name: string; email?: string; wants_reminders?: boolean; cvpath?: string; }
interface Module {
  moduleid: number;
  modulecode: string;
  modulename: string;
  academicyear: string;
  semester: number | string;
  studenttimetablepath?: string;
  subcoordinator?: string;
  subcoordinatorid?: number;
  reminder_hours?: number;
  reminder_template?: string;
  lecturers?: Lecturer[];
}
interface SystemUser {
  userid: number;
  id?: number;
  name: string;
  email: string;
  role: string;
}

interface ModuleManagementPageProps {
  currentUser: any;
  onNavigate: (page: string) => void;
  onLogout?: () => void;
}

const API = API_BASE_URL;
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DURATIONS = ['1', '1.5', '2', '3'];

export function ModuleManagementPage({ currentUser, onNavigate, onLogout }: ModuleManagementPageProps) {
  // ── STATE - DATA ──────────────────────────────────────────────────────────
  const [modules, setModules] = useState<Module[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [terms, setTerms] = useState<any[]>([]);

  // ── STATE - UI & EDIT ─────────────────────────────────────────────────────
  // Edit Module State
  const [isEditingModule, setIsEditingModule] = useState(false);
  const [editModuleCode, setEditModuleCode] = useState('');
  const [editModuleName, setEditModuleName] = useState('');
  const [editTermId, setEditTermId] = useState('');
  const [savingModule, setSavingModule] = useState(false);

  // Reminder settings
  const [reminderHours, setReminderHours] = useState('48');
  const [reminderTemplate, setReminderTemplate] = useState('');
  const [savingReminders, setSavingReminders] = useState(false);

  // Custom Message state
  const [customMessage, setCustomMessage] = useState('');
  const [selectedMessageLecturers, setSelectedMessageLecturers] = useState<number[]>([]);
  const [sendingMessage, setSendingMessage] = useState(false);
  // Search and Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('All Years');

  // Assignment states
  const [subcoError, setSubcoError] = useState('');
  const [subcoLoading, setSubcoLoading] = useState(false);
  const [selectedSubcoId, setSelectedSubcoId] = useState('');
  const [selectedLecturerId, setSelectedLecturerId] = useState('');
  const [wantsReminders, setWantsReminders] = useState(true);
  const [lecturerLoading, setLecturerLoading] = useState(false);

  // Timetable upload
  const [timetableFile, setTimetableFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');

  // Schedule state
  const [scheduleSlots, setScheduleSlots] = useState<any[]>([]);
  const [semesterEndDate, setSemesterEndDate] = useState('');
  const [newSlotDay, setNewSlotDay] = useState('Monday');
  const [newSlotTime, setNewSlotTime] = useState('09:00');
  const [newSlotDuration, setNewSlotDuration] = useState('1');
  const [newSlotLocation, setNewSlotLocation] = useState('');
  const [addingSlot, setAddingSlot] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<number | null>(null);
  const [editSlot, setEditSlot] = useState<any>({});

  // ── PERMISSIONS ───────────────────────────────────────────────────────────

  const userRole = (currentUser?.role || '').toLowerCase();
  const isMainCoordinator = userRole === 'main-coordinator';
  const isSubCoordinator = userRole === 'sub-coordinator';
  
  const currentUserId = Number(currentUser?.userid ?? currentUser?.id ?? 0);
  const module = selectedModuleId ? modules.find(m => m.moduleid === selectedModuleId) : null;
  
  const subcoId = module?.subcoordinatorid ?? (module as any)?.sub_coordinator_id;
  
  const isAssignedSubcoordinator = !!module && (
      (!!subcoId && Number(subcoId) === currentUserId) ||
      (module.lecturers || []).some((l: any) => l && Number(l.id || l.userid) === currentUserId)
  );
  const canManageModule = isMainCoordinator || (isSubCoordinator && isAssignedSubcoordinator);

  const getUserId = (u: SystemUser) => u.userid ?? u.id ?? 0;

  const scrollRef = useRef<HTMLDivElement>(null);
  // Disabled auto-scroll to top for timetable messages as it was disruptive
  useScrollToTop(scrollRef, []);

  const selectClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-all";

  // ── EFFECTS & INITIAL LOAD ────────────────────────────────────────────────
  const fetchData = async () => {
    // 1. Fetch Modules (Critical)
    try {
      const res = await fetch(`${API}/modules`, { headers: authHeaders() });
      if (res.ok) {
        setModules(await res.json());
      } else {
        console.error('Failed to fetch modules:', res.status);
      }
    } catch (err) { console.error('Error fetching modules', err); }

    // 2. Fetch Users (Non-Critical)
    try {
      const res = await fetch(`${API}/users`, { headers: authHeaders() });
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (err) { console.error('Error fetching users', err); }

    // 3. Fetch Terms (Non-Critical)
    try {
      const res = await fetch(`${API}/terms`, { headers: authHeaders() });
      if (res.ok) {
        setTerms(await res.json());
      }
    } catch (err) { console.error('Error fetching terms', err); }
  };

  useEffect(() => { fetchData(); }, []);

  const fetchSchedule = async (moduleId: number) => {
    try {
      const res = await fetch(`${API}/modules/${moduleId}/schedule`, {
        headers: authHeaders()
      });
      const data = await res.json();
      setScheduleSlots(data.slots || []);
      setSemesterEndDate(data.semesterenddate ? String(data.semesterenddate).split('T')[0] : '');
    } catch (err) { console.error('Failed to fetch schedule', err); }
  };

  const subCoordinators = users.filter(u => u.role === 'sub-coordinator');
  const allLecturers = users.filter(u => u.role === 'lecturer');
  
  // We need to fetch the custom assigned lecturers array that includes wants_reminders. 
  // For now, we use the property embedded in module if loaded properly, or fallback
  const [assignedLecturers, setAssignedLecturers] = useState<Lecturer[]>([]);
  const assignedLecturerIds = assignedLecturers.map(l => l.id);
  const availableLecturers = allLecturers.filter(u => !assignedLecturerIds.includes(u.userid));

  const fetchModuleLecturers = async (moduleId: number) => {
    try {
      const res = await fetch(`${API}/modules/${moduleId}/lecturers`, { headers: authHeaders() });
      if (res.ok) {
        setAssignedLecturers(await res.json());
      }
    } catch (e) { console.error('Failed to fetch module lecturers', e); }
  };

  const openDetail = (moduleId: number) => {
    const mod = modules.find(m => m.moduleid === moduleId);
    setSelectedModuleId(moduleId);
    setView('detail');
    setIsEditingModule(false);
    setSubcoError('');
    setSelectedSubcoId('');
    setSelectedLecturerId('');
    setWantsReminders(true);
    setUploadMessage('');
    setTimetableFile(null);
    setAddingSlot(false);
    setEditingSlotId(null);
    setCustomMessage('');
    setSelectedMessageLecturers([]);
    
    setReminderHours(mod?.reminder_hours ? String(mod.reminder_hours) : '48');
    setReminderTemplate(mod?.reminder_template || '');

    fetchSchedule(moduleId);
    fetchModuleLecturers(moduleId);
  };

  const handleDeleteModule = async (id?: number) => {
    const targetId = id || selectedModuleId;
    if (!targetId) return;
    
    if (!window.confirm('Are you sure you want to delete this module? This will also delete all associated sessions, schedules, and lecturer assignments. This action cannot be undone.')) return;

    try {
      const res = await fetch(`${API}/modules/${targetId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete module');
      }
      toast.success('Module deleted successfully');
      setView('list');
      setSelectedModuleId(null);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // ── HANDLERS - CORE MODULE ────────────────────────────────────────────────
  const handleEditModuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModuleId) return;
    setSavingModule(true);
    try {
      const res = await fetch(`${API}/modules/${selectedModuleId}`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          moduleCode: editModuleCode,
          moduleName: editModuleName,
          termId: parseInt(editTermId)
        })
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to update module');
      }
      toast.success('Module updated successfully');
      setIsEditingModule(false);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingModule(false);
    }
  };

  // ── SUB-COORDINATOR ────────────────────────────────────────────────────────
  const handleAssignSubco = async () => {
    if (!selectedSubcoId || !selectedModuleId) return;
    setSubcoLoading(true); setSubcoError('');
    try {
      const res = await fetch(`${API}/modules/${selectedModuleId}/assign-subcoordinator`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ subcoordinatorId: parseInt(selectedSubcoId) }),
      });
      const data = await res.json();
      if (!res.ok) { setSubcoError(data.error || 'Failed to assign'); return; }
      toast.success('Sub-Coordinator assigned!');
      setSelectedSubcoId('');
      await fetchData();
    } catch (err: any) { setSubcoError(err.message); }
    finally { setSubcoLoading(false); }
  };

  const handleUnassignSubco = async () => {
    if (!selectedModuleId) return;
    setSubcoLoading(true);
    try {
      const res = await fetch(`${API}/modules/${selectedModuleId}/unassign-subcoordinator`, { 
        method: 'PATCH',
        headers: authHeaders()
      });
      if (!res.ok) throw new Error('Failed to unassign');
      toast.success('Sub-Coordinator unassigned');
      await fetchData();
    } catch (err: any) { toast.error(err.message); }
    finally { setSubcoLoading(false); }
  };

  // ── LECTURERS ──────────────────────────────────────────────────────────────
  const handleAddLecturer = async () => {
    if (!selectedLecturerId || !selectedModuleId) return;
    setLecturerLoading(true);
    try {
      // Get all current assigned plus the new one
      const lecturerIds = assignedLecturers.map(l => ({ id: l.id, wants_reminders: l.wants_reminders }));
      lecturerIds.push({ id: parseInt(selectedLecturerId), wants_reminders: wantsReminders });

      const res = await fetch(`${API}/modules/${selectedModuleId}/assign-lecturers`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ lecturerIds }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      toast.success('Lecturer added!');
      setSelectedLecturerId('');
      setWantsReminders(true);
      await fetchData();
      await fetchModuleLecturers(selectedModuleId);
    } catch (err: any) { toast.error(err.message); }
    finally { setLecturerLoading(false); }
  };

  const handleRemoveLecturer = async (lecturerId: number) => {
    if (!selectedModuleId) return;
    try {
      const res = await fetch(`${API}/modules/${selectedModuleId}/lecturers/${lecturerId}`, { 
        method: 'DELETE',
        headers: authHeaders()
      });
      if (!res.ok) throw new Error('Failed to remove');
      toast.success('Lecturer removed');
      await fetchData();
      await fetchModuleLecturers(selectedModuleId);
    } catch (err: any) { toast.error(err.message); }
  };

  // ── TIMETABLE ──────────────────────────────────────────────────────────────
  const handleUploadTimetable = async () => {
    if (!timetableFile || !selectedModuleId) return;
    setIsUploading(true); setUploadMessage('');
    try {
      const formData = new FormData();
      formData.append('timetable', timetableFile);
      const res = await fetch(`${API}/modules/${selectedModuleId}/timetable`, { 
        method: 'POST', 
        body: formData,
        headers: authHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setUploadMessage('Timetable uploaded successfully!');
      setTimetableFile(null);
      await fetchData();
    } catch (err: any) { setUploadMessage('Error: ' + err.message); }
    finally { setIsUploading(false); }
  };

  const handleDeleteTimetable = async () => {
    if (!selectedModuleId) return;
    if (!window.confirm('Are you sure you want to delete the uploaded timetable?')) return;
    
    try {
      const res = await fetch(`${API}/modules/${selectedModuleId}/timetable`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      
      if (!res.ok) {
        let errorMessage = 'Failed to delete timetable';
        try {
          const data = await res.json();
          errorMessage = data.error || errorMessage;
        } catch (parseError) {
          const text = await res.text();
          errorMessage = text || res.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      toast.success('Timetable deleted successfully');
      await fetchData();
    } catch (err: any) {
      toast.error(err.message.length > 100 
        ? 'Server error: The deletion request failed (ensure the backend server is restarted).' 
        : 'Failed to delete timetable: ' + err.message);
    }
  };

  // ── REMINDERS ──────────────────────────────────────────────────────────────
  const handleSaveReminders = async () => {
    if (!selectedModuleId) return;
    setSavingReminders(true);
    try {
      const res = await fetch(`${API}/modules/${selectedModuleId}/settings`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ reminderHours: parseInt(reminderHours), reminderTemplate })
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Reminder settings saved!');
      await fetchData();
    } catch (err: any) {
      toast.error('Failed to save reminder settings: ' + err.message);
    } finally {
      setSavingReminders(false);
    }
  };

  const handleToggleLecturerReminder = async (lecturerId: number, currentStatus: boolean) => {
    if (!selectedModuleId) return;
    try {
        const updatedLecturers = assignedLecturers.map(l => ({
            id: l.id,
            wants_reminders: l.id === lecturerId ? !currentStatus : l.wants_reminders
        }));

        const res = await fetch(`${API}/modules/${selectedModuleId}/assign-lecturers`, {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ lecturerIds: updatedLecturers }),
        });
        
        if (!res.ok) throw new Error('Failed to update preference');
        toast.success('Lecturer reminder preference updated');
        await fetchModuleLecturers(selectedModuleId);
    } catch (error: any) {
        toast.error(error.message);
    }
  };

  const handleSendCustomMessage = async () => {
    if (!selectedModuleId || !customMessage.trim() || selectedMessageLecturers.length === 0) return;
    setSendingMessage(true);
    try {
      const res = await fetch(`${API}/modules/${selectedModuleId}/send-message`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ lecturerIds: selectedMessageLecturers, messageText: customMessage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message');
      toast.success('Messages dispatched successfully!');
      if (data.stats) {
          console.log('Dispatch Stats:', data.stats);
          if (data.stats.errors.length > 0) {
              toast.error(`${data.stats.errors.length} messages failed to send. check console.`);
          }
      }
      setCustomMessage('');
      setSelectedMessageLecturers([]);
    } catch (err: any) {
      toast.error('Failed to send messages: ' + err.message);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleDownloadCV = (userId: number, userName: string) => {
    const url = `${API_BASE_URL}/lecturers/${userId}/cv/download`;
    fetch(url, { headers: authHeaders() })
        .then(res => {
            if (res.ok) return res.blob();
            throw new Error('Failed to download CV');
        })
        .then(blob => {
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `CV_${userName.replace(/\s+/g, '_')}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(blobUrl);
        })
        .catch(err => {
            console.error(err);
            toast.error('Could not download CV. It might not be uploaded yet.');
        });
  };

  const toggleMessageLecturer = (id: number) => {
      setSelectedMessageLecturers(prev => 
          prev.includes(id) ? prev.filter(lId => lId !== id) : [...prev, id]
      );
  };

  const toggleAllMessageLecturers = () => {
      if (selectedMessageLecturers.length === assignedLecturers.length) {
          setSelectedMessageLecturers([]);
      } else {
          setSelectedMessageLecturers(assignedLecturers.map(l => l.id));
      }
  };

  // ── HANDLERS - SCHEDULE & RECURRING SLOTS ─────────────────────────────────
  const handleAddSlot = async () => {
    if (!semesterEndDate) { toast.error('The Main Coordinator must set a semester end date for this term first'); return; }
    setScheduleLoading(true);
    try {
      const res = await fetch(`${API}/modules/${selectedModuleId}/schedule`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ day: newSlotDay, starttime: newSlotTime, duration: newSlotDuration, location: newSlotLocation }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Slot added and sessions generated!');
      setAddingSlot(false); setNewSlotLocation('');
      await fetchSchedule(selectedModuleId!);
    } catch (err: any) { toast.error(err.message); }
    finally { setScheduleLoading(false); }
  };

  const handleUpdateSlot = async (slotId: number) => {
    setScheduleLoading(true);
    try {
      const res = await fetch(`${API}/modules/${selectedModuleId}/schedule/${slotId}`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(editSlot),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Slot updated and sessions regenerated!');
      setEditingSlotId(null);
      await fetchSchedule(selectedModuleId!);
    } catch (err: any) { toast.error(err.message); }
    finally { setScheduleLoading(false); }
  };

  const handleDeleteSlot = async (slotId: number) => {
    setScheduleLoading(true);
    try {
      const res = await fetch(`${API}/modules/${selectedModuleId}/schedule/${slotId}`, { 
        method: 'DELETE',
        headers: authHeaders()
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Slot removed and sessions updated');
      await fetchSchedule(selectedModuleId!);
    } catch (err: any) { toast.error(err.message); }
    finally { setScheduleLoading(false); }
  };

  // ── RENDERING - LIST VIEW ─────────────────────────────────────────────────
  if (view === 'list') {
    const filteredModules = modules.filter(m => {
      const matchesSearch = 
        m.modulecode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.modulename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.subcoordinator || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesYear = selectedAcademicYear === 'All Years' || m.academicyear === selectedAcademicYear;
      
      const currentUserId = Number(currentUser?.userid ?? currentUser?.id ?? 0);
      
      const subcoId = m.subcoordinatorid ?? (m as any).sub_coordinator_id;
      
      const isAssigned = isMainCoordinator || 
        (subcoId && Number(subcoId) === currentUserId) ||
        (m.lecturers || []).some((l: any) => Number(l.id || l.userid) === currentUserId);
        
      return matchesSearch && matchesYear && isAssigned;
    });

    return (
      <div ref={scrollRef} className="flex-1 p-[var(--space-xl)] overflow-x-hidden">
        <div className="max-w-7xl mx-auto space-y-[var(--space-xl)]">

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-[var(--space-md)]">
            <div>
              <h1 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">Module Management</h1>
              <p className="text-[var(--color-text-secondary)] mt-[var(--space-sm)]">
                {isMainCoordinator ? 'Create and manage modules, assign staff' : 'Your assigned modules'}
              </p>
            </div>
            {isMainCoordinator && (
              <div className="flex gap-[var(--space-sm)]">
                <Button variant="outline" size="lg" icon={<Calendar className="w-5 h-5" />} onClick={() => onNavigate('terms-management')}>
                  Manage Terms
                </Button>
                <Button variant="primary" size="lg" icon={<Plus className="w-5 h-5" />} onClick={() => onNavigate('create-module')}>
                  Create Module
                </Button>
              </div>
            )}
          </div>

          {/* Filters */}
          <Card>
            <div className="flex flex-col md:flex-row gap-[var(--space-md)]">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-disabled)]" />
                <input
                  type="text"
                  placeholder="Search modules by code, name, or coordinator..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-shadow"
                />
              </div>
              <div className="w-full md:w-64">
                <select
                  value={selectedAcademicYear}
                  onChange={(e) => setSelectedAcademicYear(e.target.value)}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white"
                >
                  <option value="All Years">All Academic Years</option>
                  {Array.from(new Set(terms.map(t => t.academicyear))).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Create Module page accessible via onNavigate */}

          {filteredModules.length === 0 ? (
            <Card>
              <div className="text-center py-12 text-[var(--color-text-secondary)]">
                <div className="flex flex-col items-center gap-3">
                    <BookOpen className="w-12 h-12 mx-auto opacity-30" />
                    <p className="font-medium">No modules found</p>
                    {searchTerm || selectedAcademicYear !== 'All Years' ? (
                        <p className="text-sm">Try adjusting your filters</p>
                    ) : (
                        isMainCoordinator && <p className="text-sm">Click "Create Module" to get started</p>
                    )}
                </div>
              </div>
            </Card>
          ) : (
            <Card padding="none" className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[var(--color-bg-sidebar)] border-b border-[#E2E8F0] text-[var(--font-size-small)] text-[var(--color-text-secondary)]">
                                <th className="p-[var(--space-md)] font-semibold">Module</th>
                                <th className="p-[var(--space-md)] font-semibold text-center">Term</th>
                                <th className="p-[var(--space-md)] font-semibold text-center">Staff</th>
                                <th className="p-[var(--space-md)] font-semibold text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredModules.map(mod => {
                                const lecCount = (mod.lecturers || []).filter(l => l !== null).length;
                                return (
                                    <tr 
                                        key={mod.moduleid} 
                                        className="border-b border-[#E2E8F0] last:border-0 hover:bg-[var(--color-bg-main)] transition-colors cursor-pointer group"
                                        onClick={() => openDetail(mod.moduleid)}
                                    >
                                        <td className="p-[var(--space-md)]">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)] bg-blue-50 px-2 py-0.5 rounded">
                                                        {mod.modulecode}
                                                    </span>
                                                </div>
                                                <p className="font-bold text-[var(--color-text-primary)]">{mod.modulename}</p>
                                            </div>
                                        </td>
                                        <td className="p-[var(--space-md)] text-center">
                                            <div className="text-[var(--font-size-small)] space-y-1 inline-flex flex-col items-start">
                                                <div className="flex items-center gap-2 text-[var(--color-text-primary)]">
                                                    <Calendar className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
                                                    <span>{mod.academicyear}</span>
                                                </div>
                                                <p className="text-[var(--color-text-secondary)] ml-5">Semester {mod.semester}</p>
                                            </div>
                                        </td>
                                        <td className="p-[var(--space-md)] text-center">
                                            <div className="text-[var(--font-size-small)] space-y-1 inline-flex flex-col items-start">
                                                <div className="flex items-center gap-2">
                                                    <UserCheck className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
                                                    {mod.subcoordinator ? (
                                                        <span className="text-[var(--color-text-primary)] font-medium">{mod.subcoordinator}</span>
                                                    ) : (
                                                        <span className="text-gray-400 italic">No Coordinator</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
                                                    <span className="text-[var(--color-text-secondary)]">{lecCount} Lecturer{lecCount !== 1 ? 's' : ''}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-[var(--space-md)] text-center">
                                            <div className="flex justify-center items-center gap-3" onClick={(e) => e.stopPropagation()}>
                                                {isMainCoordinator && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-[var(--color-error)] hover:bg-[#FEE2E2] opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={() => {
                                                            setSelectedModuleId(mod.moduleid);
                                                            handleDeleteModule(mod.moduleid);
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[var(--color-primary)] transition-colors" />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // ── RENDERING - DETAIL VIEW ───────────────────────────────────────────────
  if (!module) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--color-text-secondary)] mb-4">Module not found</p>
          <Button variant="primary" onClick={() => setView('list')}>Back to Modules</Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto p-[var(--space-xl)]">
      <div className="max-w-3xl mx-auto space-y-[var(--space-lg)]">

        {/* Back + Header */}
        <div>
          <button onClick={() => { setView('list'); setSelectedModuleId(null); setIsEditingModule(false); }} className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors mb-4 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Modules
          </button>
          
          {isEditingModule ? (
            <Card className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-[var(--color-text-primary)]">Edit Module Details</h2>
                <Button variant="ghost" size="sm" icon={<X className="w-5 h-5" />} onClick={() => setIsEditingModule(false)}>Close</Button>
              </div>
              <form onSubmit={handleEditModuleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Module Code" value={editModuleCode} onChange={e => setEditModuleCode(e.target.value.toUpperCase())} required fullWidth />
                  <Input label="Module Name" value={editModuleName} onChange={e => setEditModuleName(e.target.value)} required fullWidth />
                  <Select 
                    label="Academic Term" 
                    options={[
                      { value: '', label: 'Select a term' },
                      ...terms.map(t => ({ value: String(t.termid), label: `${t.academicyear} - Semester ${t.semester}` }))
                    ]} 
                    value={editTermId} 
                    onChange={e => setEditTermId(e.target.value)} 
                    required 
                    fullWidth 
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t border-[#E2E8F0]">
                  <Button type="button" variant="ghost" onClick={() => setIsEditingModule(false)}>Cancel</Button>
                  <Button type="submit" variant="primary" disabled={savingModule}>{savingModule ? 'Saving...' : 'Save Changes'}</Button>
                </div>
              </form>
            </Card>
          ) : (
            <div className="flex items-start justify-between gap-3 mb-6">
              <div className="flex items-start gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-primary)]">{module?.modulecode || 'N/A'}</p>
                    <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{module?.modulename || 'Untitled Module'}</h1>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Academic Year {module?.academicyear || 'Unknown'} · Semester {module?.semester || '?'}
                    </p>
                  </div>
              </div>
              {canManageModule && (
                  <div className="flex gap-2">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        icon={<Edit2 className="w-4 h-4" />} 
                        onClick={() => {
                          setIsEditingModule(true);
                          setEditModuleCode(module.modulecode);
                          setEditModuleName(module.modulename);
                          const currentTerm = terms.find(t => t.academicyear === module.academicyear && String(t.semester) === String(module.semester));
                          setEditTermId(currentTerm ? String(currentTerm.termid) : '');
                        }}
                        className="text-blue-500 hover:bg-blue-50 hover:text-blue-700 font-medium"
                    >
                        Edit
                    </Button>
                    {isMainCoordinator && (
                      <Button 
                          variant="ghost" 
                          size="sm" 
                          icon={<Trash2 className="w-4 h-4" />} 
                          onClick={() => handleDeleteModule()}
                          className="text-red-500 hover:bg-red-50 hover:text-red-700 font-medium"
                      >
                          Delete
                      </Button>
                    )}
                  </div>
              )}
            </div>
          )}
        </div>

        {/* ── SUB-COORDINATOR (main coordinator only) ── */}
        {isMainCoordinator && (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <UserCheck className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="font-bold text-[var(--color-text-primary)]">Sub-Coordinator</h2>
            </div>
            {module.subcoordinator ? (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-xl mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">{module.subcoordinator.charAt(0).toUpperCase()}</div>
                  <div>
                    <p className="font-semibold text-[var(--color-text-primary)]">{module.subcoordinator}</p>
                    <p className="text-xs text-green-600">Assigned Sub-Coordinator</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" icon={<UserX className="w-4 h-4" />} onClick={handleUnassignSubco} disabled={subcoLoading} className="text-red-500 hover:bg-red-50 hover:text-red-700">Unassign</Button>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic mb-3">No sub-coordinator assigned yet</p>
            )}
            <div className={module.subcoordinator ? 'border-t pt-3' : ''}>
              {module.subcoordinator && <p className="text-xs text-[var(--color-text-secondary)] mb-2">Replace sub-coordinator:</p>}
              <div className="flex gap-2">
                <select id="subco-select" className={`flex-1 ${selectClass}`} value={selectedSubcoId} onChange={e => { setSelectedSubcoId(e.target.value); setSubcoError(''); }}>
                  <option value="">{module.subcoordinator ? 'Select new Sub-Coordinator' : 'Select Sub-Coordinator'}</option>
                  {subCoordinators.map(u => <option key={getUserId(u)} value={String(getUserId(u))}>{u.name}</option>)}
                </select>
                <Button variant={module.subcoordinator ? 'outline' : 'primary'} onClick={handleAssignSubco} disabled={!selectedSubcoId || subcoLoading}>
                  {module.subcoordinator ? 'Replace' : 'Assign'}
                </Button>
              </div>
            </div>
            {subcoError && (
              <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{subcoError}</p>
              </div>
            )}
          </Card>
        )}

        {/* Sub-co info for non-main-coordinator */}
        {!isMainCoordinator && module.subcoordinator && (
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <UserCheck className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="font-bold text-[var(--color-text-primary)]">Sub-Coordinator</h2>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
              <div className="w-9 h-9 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {(module?.subcoordinator || '?').charAt(0).toUpperCase()}
              </div>
              <p className="font-semibold text-[var(--color-text-primary)]">{module?.subcoordinator || 'Assigned Coordinator'}</p>
            </div>
          </Card>
        )}

        {/* ── LECTURERS ── */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-[var(--color-primary)]" />
            <h2 className="font-bold text-[var(--color-text-primary)]">Lecturers <span className="text-[var(--color-text-secondary)] font-normal text-sm">({assignedLecturers.length})</span></h2>
          </div>
          {assignedLecturers.length > 0 ? (
            <div className="space-y-2 mb-4">
              {assignedLecturers.map(lec => (
                <div key={lec.id} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[var(--color-primary)] rounded-full flex items-center justify-center text-white font-bold text-xs">{lec.name?.charAt(0).toUpperCase() || '?'}</div>
                    <span className="font-medium text-[var(--color-text-primary)]">{lec.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Checkbox for reminders */}
                    {isSubCoordinator && (
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="w-4 h-4 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                                checked={lec.wants_reminders}
                                onChange={() => handleToggleLecturerReminder(lec.id, !!lec.wants_reminders)}
                            />
                            <span className="text-sm text-gray-600">Reminders</span>
                        </label>
                    )}

                    {canManageModule && (
                      <Button variant="ghost" size="sm" icon={<X className="w-3.5 h-3.5" />} onClick={() => handleRemoveLecturer(lec.id)} className="text-red-500 hover:bg-red-50 hover:text-red-700">Remove</Button>
                    )}
                    
                    <button
                        onClick={() => handleDownloadCV(lec.id, lec.name)}
                        className={`p-2 rounded-lg transition-all ${lec.cvpath ? 'text-[var(--color-primary)] hover:bg-blue-100' : 'text-gray-300 cursor-not-allowed'}`}
                        disabled={!lec.cvpath}
                        title={lec.cvpath ? 'Download CV' : 'No CV uploaded'}
                    >
                        <FileText className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic mb-4">No lecturers assigned</p>
          )}
          {canManageModule && (
            availableLecturers.length > 0 ? (
              <div className="border-t pt-4">
                  <div className="flex gap-2">
                    <select id="lecturer-select" className={`flex-1 ${selectClass}`} value={selectedLecturerId} onChange={e => setSelectedLecturerId(e.target.value)}>
                      <option value="">Add a Lecturer</option>
                      {availableLecturers.map(u => <option key={getUserId(u)} value={String(getUserId(u))}>{u.name}</option>)}
                    </select>
                    <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={handleAddLecturer} disabled={!selectedLecturerId || lecturerLoading}>Add</Button>
                  </div>
              </div>
            ) : (
              <div className="border-t pt-4"><p className="text-sm text-gray-400 italic">All available lecturers are already assigned</p></div>
            )
          )}
        </Card>

        {/* ── WEEKLY SCHEDULE ── */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-[var(--color-primary)]" />
            <h2 className="font-bold text-[var(--color-text-primary)]">Weekly Schedule</h2>
          </div>

          {/* Semester End Date */}
          <div className="mb-10 flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl p-3 px-4">
            <div className="flex items-center gap-2 text-slate-500">
              <Calendar className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Term End Date</span>
            </div>
            <p className="text-sm font-bold text-slate-700">
              {semesterEndDate
                ? new Date(semesterEndDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                : <span className="text-amber-500 text-xs font-semibold italic">Awaiting coordinator</span>}
            </p>
          </div>

          {/* Existing Slots */}
          <div className="space-y-6 mb-10">
            {scheduleSlots.length === 0 ? (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                <Clock className="w-10 h-10 text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-600 mb-1">No schedule slots available</p>
                <p className="text-xs text-slate-400">Add weekly repeating classes below</p>
              </div>
            ) : scheduleSlots.map(slot => (
              <div key={slot.scheduleid} className="group relative bg-white border border-slate-200 hover:border-blue-200 rounded-3xl p-6 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                {editingSlotId === slot.scheduleid ? (
                  <div className="w-full bg-slate-50 p-6 border border-blue-600/20 rounded-2xl">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-100">
                        <Edit2 className="w-4 h-4" />
                      </div>
                      <span className="font-black text-sm text-slate-800 uppercase tracking-wider">Modify Schedule Slot</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <select className={selectClass} value={editSlot.day} onChange={e => setEditSlot({ ...editSlot, day: e.target.value })}>
                        {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <AnalogTimePicker 
                        value={editSlot.starttime?.substring(0, 5) || '09:00'} 
                        onChange={val => setEditSlot({ ...editSlot, starttime: val })} 
                      />
                      <select className={selectClass} value={String(editSlot.duration)} onChange={e => setEditSlot({ ...editSlot, duration: e.target.value })}>
                        {DURATIONS.map(d => <option key={d} value={d}>{d}h</option>)}
                      </select>
                      <input type="text" className={selectClass} placeholder="Location / URL" value={editSlot.location || ''} onChange={e => setEditSlot({ ...editSlot, location: e.target.value })} />
                    </div>
                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
                      <Button variant="ghost" size="sm" onClick={() => setEditingSlotId(null)} className="font-bold text-slate-500">Cancel</Button>
                      <Button variant="primary" size="sm" disabled={scheduleLoading} onClick={() => handleUpdateSlot(slot.scheduleid)} className="font-bold px-6">Save Changes</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col md:flex-row md:items-center gap-6">
                    {/* Time & Day Column */}
                    <div className="flex items-center gap-5 md:pr-10 border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 min-w-[200px]">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 rounded-full bg-blue-600 ring-4 ring-blue-50" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{slot.day}</span>
                        </div>
                        <span className="text-3xl font-black text-slate-800 tracking-tighter">{slot.starttime?.substring(0, 5)}</span>
                      </div>
                    </div>

                    {/* Details Column */}
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-full border border-slate-100">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-xs font-bold">{Number(slot.duration)} Hour Session</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50/30 text-blue-700 rounded-full border border-blue-100/50">
                          <MapPin className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-xs font-bold">{slot.location || 'Location Pending'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Column */}
                    {canManageModule && (
                      <div className="flex items-center gap-2 md:pl-4">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => { setEditingSlotId(slot.scheduleid); setEditSlot({ ...slot }); }}
                          className="h-10 px-4 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all font-bold text-xs"
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          disabled={scheduleLoading} 
                          onClick={() => handleDeleteSlot(slot.scheduleid)}
                          className="h-10 px-4 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all font-bold text-xs"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add Slot */}
          {canManageModule && (
            <div className="mt-12">
              {addingSlot ? (
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 shadow-inner">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                      <Plus className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-800">Add Schedule Slot</h3>
                      <p className="text-xs text-slate-500 font-medium">Create a new weekly recurring session</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">Day of Week</label>
                      <select id="new-slot-day" className={selectClass} value={newSlotDay} onChange={e => setNewSlotDay(e.target.value)}>
                        {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <AnalogTimePicker 
                      label="Start Time"
                      value={newSlotTime} 
                      onChange={setNewSlotTime} 
                    />
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">Duration</label>
                      <select id="new-slot-duration" className={selectClass} value={newSlotDuration} onChange={e => setNewSlotDuration(e.target.value)}>
                        {DURATIONS.map(d => <option key={d} value={d}>{d}h</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">Location</label>
                      <input type="text" className={selectClass} placeholder="Room / URL" value={newSlotLocation} onChange={e => setNewSlotLocation(e.target.value)} />
                    </div>
                  </div>
                  
                  <div className="flex justify-end items-center gap-4 pt-6 border-t border-slate-200">
                    <button onClick={() => setAddingSlot(false)} className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">
                      Discard
                    </button>
                    <Button 
                      variant="primary" 
                      size="lg" 
                      disabled={scheduleLoading || !semesterEndDate} 
                      onClick={handleAddSlot}
                      className="px-8 rounded-2xl shadow-xl shadow-blue-100"
                    >
                      {scheduleLoading ? 'Saving...' : 'Generate Weekly Sessions'}
                    </Button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setAddingSlot(true)}
                  className="w-full group py-8 border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 rounded-3xl transition-all duration-300 flex flex-col items-center gap-3"
                >
                  <div className="w-12 h-12 bg-slate-100 text-slate-400 group-hover:bg-blue-600 group-hover:text-white rounded-2xl flex items-center justify-center transition-all duration-300">
                    <Plus className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-black text-slate-400 group-hover:text-blue-600 tracking-wide">Add Weekly Schedule Slot</span>
                </button>
              )}
            </div>
          )}

          {isMainCoordinator && scheduleSlots.length === 0 && (
            <p className="text-xs text-gray-400 italic">No schedule configured yet. The assigned sub-coordinator can add weekly slots.</p>
          )}
        </Card>

        {/* ── REMINDER SETTINGS (Sub-Coordinator only) ── */}
        {isSubCoordinator && (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="font-bold text-[var(--color-text-primary)]">Reminder Settings</h2>
            </div>
            
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Send Reminder</label>
                    <select className={selectClass} value={reminderHours} onChange={e => setReminderHours(e.target.value)}>
                        <option value="24">24 hours before</option>
                        <option value="48">48 hours before</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Message Template (Optional)</label>
                    <textarea 
                        className={`${selectClass} min-h-[100px] resize-y`} 
                        placeholder="Reminder: You have an upcoming session for module {moduleId} scheduled at {sessionDate}."
                        value={reminderTemplate}
                        onChange={e => setReminderTemplate(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">Variables available: &#123;lecturerName&#125;, &#123;sessionDate&#125;, &#123;moduleName&#125;, &#123;moduleCode&#125;, &#123;location&#125;</p>
                </div>

                <Button 
                    variant="primary" 
                    onClick={handleSaveReminders} 
                    disabled={savingReminders}
                    className="w-full"
                >
                    {savingReminders ? 'Saving...' : 'Save Settings'}
                </Button>
            </div>
          </Card>
        )}

        {/* ── CUSTOM MESSAGING (Sub-Coordinator only) ── */}
        {isSubCoordinator && (
          <Card>
             <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="font-bold text-[var(--color-text-primary)]">Send Custom Message</h2>
            </div>
            
            {assignedLecturers.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No lecturers assigned to this module yet.</p>
            ) : (
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                             <label className="block text-sm font-medium text-[var(--color-text-primary)]">Select Recipients</label>
                             <button type="button" onClick={toggleAllMessageLecturers} className="text-xs text-[var(--color-primary)] hover:underline">
                                 {selectedMessageLecturers.length === assignedLecturers.length ? 'Deselect All' : 'Select All'}
                             </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[150px] overflow-y-auto p-2 border border-gray-200 rounded-lg bg-gray-50">
                            {assignedLecturers.map(lec => (
                                <label key={lec.id} className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded border border-gray-100 shadow-sm hover:border-[var(--color-primary)] transition-colors">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                                        checked={selectedMessageLecturers.includes(lec.id)}
                                        onChange={() => toggleMessageLecturer(lec.id)}
                                    />
                                    <span className="text-sm font-medium text-[var(--color-text-primary)]">{lec.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Message</label>
                        <textarea 
                            className={`${selectClass} min-h-[120px] resize-y`} 
                            placeholder="Type your message here... It will be sent via Email and WhatsApp."
                            value={customMessage}
                            onChange={e => setCustomMessage(e.target.value)}
                        />
                    </div>

                    <Button 
                        variant="primary" 
                        onClick={handleSendCustomMessage} 
                        disabled={sendingMessage || selectedMessageLecturers.length === 0 || !customMessage.trim()}
                        className="w-full"
                    >
                        {sendingMessage ? 'Sending...' : `Send to ${selectedMessageLecturers.length} Lecturer${selectedMessageLecturers.length !== 1 ? 's' : ''}`}
                    </Button>
                </div>
            )}
          </Card>
        )}

        {/* ── TIMETABLE (Sub-Coordinator only) ── */}
        {isSubCoordinator && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-[var(--color-primary)]" />
                <h2 className="font-bold text-[var(--color-text-primary)]">Student Timetable</h2>
              </div>
              <a 
                href={sampleTimetable} 
                download="Sample Timetable.xlsx"
                className="flex items-center gap-2 text-xs font-bold text-[var(--color-primary)] hover:text-[var(--color-secondary)] transition-colors bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100"
              >
                <Download className="w-3.5 h-3.5" />
                Download Sample
              </a>
            </div>
            {module.studenttimetablepath ? (
              <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between gap-2 group/file">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-700 font-medium">
                    Current Timetable: {module.studenttimetablepath.split('/').pop()}
                  </span>
                </div>
                <button 
                  onClick={handleDeleteTimetable}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover/file:opacity-100"
                  title="Delete timetable"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <FileUpload 
                  label="Upload timetable (.xlsx)" 
                  accept=".xlsx,.xls" 
                  value={timetableFile}
                  onChange={f => setTimetableFile(f || null)} 
                />
                {timetableFile && (
                  <Button variant="primary" className="mt-3 w-full" onClick={handleUploadTimetable} disabled={isUploading}>
                    {isUploading ? 'Uploading...' : 'Upload Timetable'}
                  </Button>
                )}
              </>
            )}
            {uploadMessage && (
              <p className={`mt-2 text-sm ${uploadMessage.includes('success') || uploadMessage.includes('Success') ? 'text-green-600' : 'text-red-500'}`}>{uploadMessage}</p>
            )}
          </Card>
        )}

      </div>
    </div>
  );
}