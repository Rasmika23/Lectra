import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Button } from '../components/Button';
import { FileUpload } from '../components/FileUpload';
import {
  ArrowLeft, CheckCircle, Upload, Plus,
  ChevronRight, Users, User, BookOpen, X, AlertCircle,
  UserX, UserCheck, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { authHeaders } from '../lib/api';

interface Lecturer { id: number; name: string; }
interface Module {
  moduleid: number;
  modulecode: string;
  modulename: string;
  academicyear: string;
  semester: number | string;
  studenttimetablepath?: string;
  subcoordinator?: string;
  subcoordinatorid?: number;
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

const API = 'http://localhost:5000';
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DURATIONS = ['1', '1.5', '2', '3'];

export function ModuleManagementPage({ currentUser, onNavigate, onLogout }: ModuleManagementPageProps) {
  const [modules, setModules] = useState<Module[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [view, setView] = useState<'list' | 'detail'>('list');

  // Create module state
  const [isCreating, setIsCreating] = useState(false);
  const [newModuleName, setNewModuleName] = useState('');
  const [newModuleCode, setNewModuleCode] = useState('');
  const [newAcademicYear, setNewAcademicYear] = useState('2024/2025');
  const [newSemester, setNewSemester] = useState('1');

  // Assignment state
  const [subcoError, setSubcoError] = useState('');
  const [subcoLoading, setSubcoLoading] = useState(false);
  const [selectedSubcoId, setSelectedSubcoId] = useState('');
  const [selectedLecturerId, setSelectedLecturerId] = useState('');
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

  const isMainCoordinator = currentUser.role === 'main-coordinator';
  const isSubCoordinator = currentUser.role === 'sub-coordinator';

  const getUserId = (u: SystemUser) => u.userid ?? u.id ?? 0;

  const selectClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-all";

  const fetchData = async () => {
    try {
      const [modRes, usersRes] = await Promise.all([
        fetch(`${API}/modules`, { headers: authHeaders() }),
        fetch(`${API}/users`, { headers: authHeaders() }),
      ]);
      if (!modRes.ok || !usersRes.ok) throw new Error('Fetch failed');
      setModules(await modRes.json());
      setUsers(await usersRes.json());
    } catch (err) { console.error('Failed to fetch data', err); }
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

  const module = modules.find(m => m.moduleid === selectedModuleId);
  const subCoordinators = users.filter(u => u.role === 'sub-coordinator');
  const allLecturers = users.filter(u => u.role === 'lecturer');
  const assignedLecturers: Lecturer[] = (module?.lecturers || []).filter(l => l !== null);
  const assignedLecturerIds = assignedLecturers.map(l => l.id);
  const availableLecturers = allLecturers.filter(u => !assignedLecturerIds.includes(u.userid));

  const openDetail = (moduleId: number) => {
    setSelectedModuleId(moduleId);
    setView('detail');
    setSubcoError('');
    setSelectedSubcoId('');
    setSelectedLecturerId('');
    setUploadMessage('');
    setTimetableFile(null);
    setAddingSlot(false);
    setEditingSlotId(null);
    fetchSchedule(moduleId);
  };

  // ── CREATE MODULE ──────────────────────────────────────────────────────────
  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/modules`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ moduleCode: newModuleCode, moduleName: newModuleName, academicYear: newAcademicYear, semester: newSemester }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      toast.success('Module created!');
      setIsCreating(false);
      setNewModuleName(''); setNewModuleCode('');
      await fetchData();
    } catch (err: any) { toast.error(err.message); }
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
      const res = await fetch(`${API}/modules/${selectedModuleId}/lecturers`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ lecturerId: parseInt(selectedLecturerId) }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      toast.success('Lecturer added!');
      setSelectedLecturerId('');
      await fetchData();
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

  // ── SCHEDULE HELPERS ───────────────────────────────────────────────────────
  const handleSaveSemesterEnd = async () => {
    setScheduleLoading(true);
    try {
      const res = await fetch(`${API}/modules/${selectedModuleId}/semesterenddate`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ semesterenddate: semesterEndDate }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Semester end date saved and sessions updated!');
      await fetchSchedule(selectedModuleId!);
    } catch (err: any) { toast.error(err.message); }
    finally { setScheduleLoading(false); }
  };

  const handleAddSlot = async () => {
    if (!semesterEndDate) { toast.error('Set a semester end date first'); return; }
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

  // ═══════════════════════════════════════════════════════════════════════════
  // MODULE LIST VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  if (view === 'list') {
    const displayModules = isMainCoordinator
      ? modules
      : modules.filter(m =>
          m.subcoordinatorid === (currentUser.userid ?? currentUser.id) ||
          (m.lecturers || []).some(l => l.id === (currentUser.userid ?? currentUser.id))
        );

    return (
      <div className="h-full overflow-y-auto p-[var(--space-xl)]">
        <div className="max-w-5xl mx-auto space-y-[var(--space-xl)]">

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-[var(--space-md)]">
            <div>
              <h1 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">Module Management</h1>
              <p className="text-[var(--color-text-secondary)] mt-[var(--space-sm)]">
                {isMainCoordinator ? 'Create and manage modules, assign staff' : 'Your assigned modules'}
              </p>
            </div>
            {isMainCoordinator && (
              <Button variant="primary" size="lg" icon={<Plus className="w-5 h-5" />} onClick={() => setIsCreating(true)}>
                Create Module
              </Button>
            )}
          </div>

          {/* Create Module Modal */}
          {isCreating && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Create New Module</h2>
                  <button onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleCreateModule} className="space-y-4">
                  <Input label="Module Code" value={newModuleCode} onChange={e => setNewModuleCode(e.target.value)} required fullWidth placeholder="e.g. CS3012" />
                  <Input label="Module Name" value={newModuleName} onChange={e => setNewModuleName(e.target.value)} required fullWidth placeholder="e.g. Software Engineering" />
                  <Input label="Academic Year" value={newAcademicYear} onChange={e => setNewAcademicYear(e.target.value)} required fullWidth placeholder="e.g. 2024/2025" />
                  <Select label="Semester" options={[{ value: '1', label: 'Semester 1' }, { value: '2', label: 'Semester 2' }]} value={newSemester} onChange={e => setNewSemester(e.target.value)} fullWidth />
                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="ghost" fullWidth onClick={() => setIsCreating(false)}>Cancel</Button>
                    <Button type="submit" variant="primary" fullWidth>Create Module</Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {displayModules.length === 0 ? (
            <Card>
              <div className="text-center py-12 text-[var(--color-text-secondary)]">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No modules found</p>
                {isMainCoordinator && <p className="text-sm mt-1">Click "Create Module" to get started</p>}
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--space-lg)]">
              {displayModules.map(mod => {
                const lecCount = (mod.lecturers || []).filter(l => l !== null).length;
                return (
                  <button key={mod.moduleid} onClick={() => openDetail(mod.moduleid)} className="text-left group w-full">
                    <Card className="group-hover:border-[var(--color-primary)] transition-all duration-200 cursor-pointer h-full">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-[var(--color-primary)] bg-blue-50 px-2 py-0.5 rounded-full">{mod.modulecode}</span>
                            <span className="text-xs text-[var(--color-text-secondary)]">Yr {mod.academicyear} · Sem {mod.semester}</span>
                          </div>
                          <h3 className="font-bold text-[var(--color-text-primary)] text-base leading-tight mb-3">{mod.modulename}</h3>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-sm">
                              <User className="w-3.5 h-3.5 text-[var(--color-text-secondary)] flex-shrink-0" />
                              {mod.subcoordinator ? <span className="text-[var(--color-text-primary)] font-medium truncate">{mod.subcoordinator}</span> : <span className="text-gray-400 italic">No Sub-Coordinator</span>}
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="w-3.5 h-3.5 text-[var(--color-text-secondary)] flex-shrink-0" />
                              {lecCount > 0 ? <span className="text-[var(--color-text-primary)] font-medium">{lecCount} Lecturer{lecCount !== 1 ? 's' : ''}</span> : <span className="text-gray-400 italic">No Lecturers</span>}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[var(--color-primary)] flex-shrink-0 mt-1 transition-colors" />
                      </div>
                    </Card>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODULE DETAIL VIEW
  // ═══════════════════════════════════════════════════════════════════════════
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
    <div className="h-full overflow-y-auto p-[var(--space-xl)]">
      <div className="max-w-3xl mx-auto space-y-[var(--space-lg)]">

        {/* Back + Header */}
        <div>
          <button onClick={() => { setView('list'); setSelectedModuleId(null); }} className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors mb-4 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Modules
          </button>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-[var(--color-primary)] rounded-xl flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-primary)]">{module.modulecode}</p>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{module.modulename}</h1>
              <p className="text-sm text-[var(--color-text-secondary)]">Academic Year {module.academicyear} · Semester {module.semester}</p>
            </div>
          </div>
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
              <div className="w-9 h-9 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">{module.subcoordinator.charAt(0).toUpperCase()}</div>
              <p className="font-semibold text-[var(--color-text-primary)]">{module.subcoordinator}</p>
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
                  {isMainCoordinator && (
                    <Button variant="ghost" size="sm" icon={<X className="w-3.5 h-3.5" />} onClick={() => handleRemoveLecturer(lec.id)} className="text-red-500 hover:bg-red-50 hover:text-red-700">Remove</Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic mb-4">No lecturers assigned</p>
          )}
          {isMainCoordinator && (
            availableLecturers.length > 0 ? (
              <div className="border-t pt-4 flex gap-2">
                <select id="lecturer-select" className={`flex-1 ${selectClass}`} value={selectedLecturerId} onChange={e => setSelectedLecturerId(e.target.value)}>
                  <option value="">Add a Lecturer</option>
                  {availableLecturers.map(u => <option key={getUserId(u)} value={String(getUserId(u))}>{u.name}</option>)}
                </select>
                <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={handleAddLecturer} disabled={!selectedLecturerId || lecturerLoading}>Add</Button>
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
          <div className="mb-5">
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Semester End Date</label>
            {isSubCoordinator ? (
              <div className="flex gap-2">
                <input type="date" className={`flex-1 ${selectClass}`} value={semesterEndDate} onChange={e => setSemesterEndDate(e.target.value)} />
                <Button variant="outline" disabled={!semesterEndDate || scheduleLoading} onClick={handleSaveSemesterEnd}>Save</Button>
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-primary)]">
                {semesterEndDate
                  ? new Date(semesterEndDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                  : <span className="italic text-gray-400">Not set</span>}
              </p>
            )}
          </div>

          {/* Existing Slots */}
          <div className="space-y-3 mb-4">
            {scheduleSlots.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No schedule slots added yet</p>
            ) : scheduleSlots.map(slot => (
              <div key={slot.scheduleid} className="p-3 border border-blue-100 bg-blue-50 rounded-xl">
                {editingSlotId === slot.scheduleid ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <select className={selectClass} value={editSlot.day} onChange={e => setEditSlot({ ...editSlot, day: e.target.value })}>
                        {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <input type="time" className={selectClass} value={editSlot.starttime?.substring(0, 5) || ''} onChange={e => setEditSlot({ ...editSlot, starttime: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select className={selectClass} value={String(editSlot.duration)} onChange={e => setEditSlot({ ...editSlot, duration: e.target.value })}>
                        {DURATIONS.map(d => <option key={d} value={d}>{d}h</option>)}
                      </select>
                      <input type="text" className={selectClass} placeholder="Location / URL" value={editSlot.location || ''} onChange={e => setEditSlot({ ...editSlot, location: e.target.value })} />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="primary" size="sm" disabled={scheduleLoading} onClick={() => handleUpdateSlot(slot.scheduleid)}>Save</Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditingSlotId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-[var(--color-text-primary)]">{slot.day} at {slot.starttime?.substring(0, 5)}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">{slot.duration}h · {slot.location || 'No location set'}</p>
                    </div>
                    {isSubCoordinator && (
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingSlotId(slot.scheduleid); setEditSlot({ ...slot }); }}>Edit</Button>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" disabled={scheduleLoading} onClick={() => handleDeleteSlot(slot.scheduleid)}>Remove</Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add Slot (sub-coordinator only) */}
          {isSubCoordinator && (
            addingSlot ? (
              <div className="border-t pt-4 space-y-3">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">New recurring slot:</p>
                <div className="grid grid-cols-2 gap-2">
                  <select id="new-slot-day" className={selectClass} value={newSlotDay} onChange={e => setNewSlotDay(e.target.value)}>
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <input type="time" className={selectClass} value={newSlotTime} onChange={e => setNewSlotTime(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select id="new-slot-duration" className={selectClass} value={newSlotDuration} onChange={e => setNewSlotDuration(e.target.value)}>
                    {DURATIONS.map(d => <option key={d} value={d}>{d}h</option>)}
                  </select>
                  <input type="text" className={selectClass} placeholder="Location / Room / URL" value={newSlotLocation} onChange={e => setNewSlotLocation(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" disabled={scheduleLoading || !semesterEndDate} onClick={handleAddSlot}>
                    {scheduleLoading ? 'Saving...' : 'Add & Generate'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setAddingSlot(false)}>Cancel</Button>
                </div>
                {!semesterEndDate && <p className="text-xs text-amber-600">⚠ Set a semester end date above before adding slots</p>}
              </div>
            ) : (
              <Button variant="outline" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setAddingSlot(true)}>Add Slot</Button>
            )
          )}

          {isMainCoordinator && scheduleSlots.length === 0 && (
            <p className="text-xs text-gray-400 italic">No schedule configured yet. The assigned sub-coordinator can add weekly slots.</p>
          )}
        </Card>

        {/* ── TIMETABLE (Sub-Coordinator only) ── */}
        {isSubCoordinator && (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Upload className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="font-bold text-[var(--color-text-primary)]">Student Timetable</h2>
            </div>
            {module.studenttimetablepath && (
              <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-700">Uploaded: {module.studenttimetablepath.split('/').pop()}</span>
              </div>
            )}
            <FileUpload label="Upload timetable (.xlsx)" accept=".xlsx,.xls" onChange={f => setTimetableFile(f || null)} />
            {timetableFile && (
              <Button variant="primary" className="mt-3" onClick={handleUploadTimetable} disabled={isUploading}>
                {isUploading ? 'Uploading...' : 'Upload Timetable'}
              </Button>
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