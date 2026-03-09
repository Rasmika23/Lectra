import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { ArrowLeft, Search, Edit, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { authenticatedFetch } from '../lib/api';

interface Module {
    id: string;
    name: string;
    code: string;
    academicYear: string;
    semester: string;
    subCoordinatorId: string;
    subCoordinator?: string;
}

interface ModulesPageProps {
    currentUser: any;
    onNavigate: (page: string) => void;
}

export function ModulesPage({ currentUser, onNavigate }: ModulesPageProps) {
    const [modules, setModules] = useState<Module[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Edit State
    const [editingModule, setEditingModule] = useState<Module | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [subCoordinators, setSubCoordinators] = useState<any[]>([]);

    // Lecturer Management State
    const [moduleLecturers, setModuleLecturers] = useState<any[]>([]);
    const [availableLecturers, setAvailableLecturers] = useState<any[]>([]);
    const [selectedLecturerToAdd, setSelectedLecturerToAdd] = useState('');

    useEffect(() => {
        fetchModules();
        if (currentUser.role === 'main-coordinator') {
            fetchSubCoordinators();
            fetchAvailableLecturers();
        }
    }, [currentUser]);

    const fetchModules = async () => {
        try {
            let url = 'http://localhost:5000/modules';
            if (currentUser.role === 'sub-coordinator') {
                url += `?subCoordinatorId=${currentUser.id}`;
            }

            const response = await authenticatedFetch(url);
            if (response.ok) {
                const data = await response.json();
                setModules(data);
            } else {
                toast.error('Failed to load modules');
            }
        } catch (error) {
            console.error(error);
            toast.error('Connection error');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSubCoordinators = async () => {
        try {
            const response = await authenticatedFetch('http://localhost:5000/users');
            if (response.ok) {
                const data = await response.json();
                setSubCoordinators(data.filter((u: any) => u.role === 'sub-coordinator'));
            }
        } catch (error) {
            console.error('Failed to fetch sub-coordinators', error);
        }
    };

    const fetchAvailableLecturers = async () => {
        try {
            const response = await authenticatedFetch('http://localhost:5000/users');
            if (response.ok) {
                const data = await response.json();
                setAvailableLecturers(data.filter((u: any) => u.role === 'lecturer'));
            }
        } catch (error) {
            console.error('Failed to fetch available lecturers', error);
        }
    };

    const fetchModuleLecturers = async (moduleId: string) => {
        try {
            const response = await authenticatedFetch(`http://localhost:5000/modules/${moduleId}/lecturers`);
            if (response.ok) {
                const data = await response.json();
                setModuleLecturers(data);
            }
        } catch (error) {
            console.error('Failed to fetch module lecturers', error);
        }
    };

    const handleEditClick = (module: Module) => {
        setEditingModule({ ...module });
        fetchModuleLecturers(module.id); // Fetch lecturers when opening edit
        setSelectedLecturerToAdd(''); // Reset selection
    };

    const handleAddLecturer = async () => {
        if (!editingModule || !selectedLecturerToAdd) return;

        try {
            const response = await authenticatedFetch(`http://localhost:5000/modules/${editingModule.id}/lecturers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lecturerId: selectedLecturerToAdd }),
            });

            if (response.ok) {
                toast.success('Lecturer added successfully');
                fetchModuleLecturers(editingModule.id);
                setSelectedLecturerToAdd('');
            } else {
                const data = await response.json();
                toast.error(data.error || 'Failed to add lecturer');
            }
        } catch (error) {
            console.error(error);
            toast.error('Connection error');
        }
    };

    const handleRemoveLecturer = async (lecturerId: string) => {
        if (!editingModule) return;

        try {
            const response = await authenticatedFetch(`http://localhost:5000/modules/${editingModule.id}/lecturers/${lecturerId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                toast.success('Lecturer removed successfully');
                fetchModuleLecturers(editingModule.id);
            } else {
                toast.error('Failed to remove lecturer');
            }
        } catch (error) {
            console.error(error);
            toast.error('Connection error');
        }
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingModule) return;

        setIsSaving(true);
        try {
            // Ensure semester is just the number/string expected by backend
            const response = await authenticatedFetch(`http://localhost:5000/modules/${editingModule.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingModule),
            });

            if (response.ok) {
                toast.success(`Module ${editingModule.code} updated successfully`);
                setEditingModule(null);
                fetchModules(); // Refresh list
            } else {
                toast.error('Failed to update module');
            }
        } catch (error) {
            console.error(error);
            toast.error('Connection error during update');
        } finally {
            setIsSaving(false);
        }
    };

    const filteredModules = modules.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-6xl mx-auto space-y-[var(--space-xl)]">
            {/* Breadcrumb */}
            <button
                onClick={() => onNavigate(currentUser.role === 'main-coordinator' ? 'main-dashboard' : 'sub-dashboard')}
                className="flex items-center gap-[var(--space-sm)] text-[var(--color-primary)] hover:underline"
            >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Dashboard</span>
            </button>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-[var(--space-md)]">
                <div>
                    <h1 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">
                        Modules
                    </h1>
                    <p className="text-[var(--color-text-secondary)] mt-[var(--space-sm)]">
                        {currentUser.role === 'main-coordinator'
                            ? 'View and manage all academic modules'
                            : 'View modules assigned to you'}
                    </p>
                </div>

                {currentUser.role === 'main-coordinator' && (
                    <Button
                        variant="primary"
                        onClick={() => onNavigate('create-module')}
                    >
                        + Create New Module
                    </Button>
                )}
            </div>

            {/* Edit Form (if editing) */}
            {editingModule && (
                <Card className="animate-[slideInDown_0.3s_ease-out] border-l-4 border-[var(--color-primary)]">
                    <div className="flex justify-between items-center mb-[var(--space-lg)]">
                        <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)]">
                            Edit Module: {editingModule.code}
                        </h2>
                        <Button variant="ghost" onClick={() => setEditingModule(null)}>Cancel</Button>
                    </div>

                    <form onSubmit={handleSaveEdit} className="space-y-[var(--space-lg)]">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--space-lg)]">
                            <Input
                                label="Module Name"
                                value={editingModule.name}
                                onChange={(e) => setEditingModule({ ...editingModule, name: e.target.value })}
                                required
                                fullWidth
                            />
                            <Input
                                label="Module Code"
                                value={editingModule.code}
                                onChange={(e) => setEditingModule({ ...editingModule, code: e.target.value })}
                                required
                                fullWidth
                            />
                            <Input
                                label="Academic Year"
                                value={editingModule.academicYear}
                                onChange={(e) => setEditingModule({ ...editingModule, academicYear: e.target.value })}
                                required
                                fullWidth
                            />
                            <Select
                                label="Semester"
                                value={editingModule.semester.replace('Semester ', '')} // Simple normalization
                                options={[
                                    { value: '1', label: 'Semester 1' },
                                    { value: '2', label: 'Semester 2' }
                                ]}
                                onChange={(e) => setEditingModule({ ...editingModule, semester: e.target.value })}
                                fullWidth
                            />

                            {/* Only Main Coordinator can reassign Sub-Coordinator */}
                            {currentUser.role === 'main-coordinator' && (
                                <div className="col-span-1 md:col-span-2">
                                    <Select
                                        label="Assigned Sub-Coordinator"
                                        value={editingModule.subCoordinatorId || ''}
                                        options={[
                                            { value: '', label: 'Unassigned' },
                                            ...subCoordinators.map(u => ({ value: u.id.toString(), label: u.name }))
                                        ]}
                                        onChange={(e) => setEditingModule({ ...editingModule, subCoordinatorId: e.target.value })}
                                        fullWidth
                                    />
                                </div>
                            )}
                        </div>

                        {/* Lecturer Assignment Section */}
                        {currentUser.role === 'main-coordinator' && (
                            <div className="pt-[var(--space-md)] border-t border-gray-200">


                                <div className="mb-[var(--space-md)]">
                                    <label className="text-[var(--font-size-small)] font-medium text-[var(--color-text-primary)] mb-[var(--space-sm)] block">
                                        Select Lecturer
                                    </label>
                                    <div className="flex gap-[var(--space-md)] items-center">
                                        <div className="flex-1">
                                            <Select
                                                value={selectedLecturerToAdd}
                                                options={[
                                                    { value: '', label: 'Select a lecturer to add' },
                                                    ...availableLecturers.map(u => ({ value: u.id.toString(), label: u.name }))
                                                ]}
                                                onChange={(e) => setSelectedLecturerToAdd(e.target.value)}
                                                fullWidth
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="primary"
                                            onClick={handleAddLecturer}
                                            disabled={!selectedLecturerToAdd}
                                        >
                                            Add Lecturer
                                        </Button>
                                    </div>
                                </div>

                                {moduleLecturers.length === 0 ? (
                                    <p className="text-gray-500 italic text-sm">No lecturers assigned.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {moduleLecturers.map(lecturer => (
                                            <div key={lecturer.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                                                <span className="font-medium">{lecturer.name}</span>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-sm text-gray-500">{lecturer.email}</span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => handleRemoveLecturer(lecturer.id)}
                                                    >
                                                        Remove
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end pt-[var(--space-md)] border-t border-gray-200">
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* Search */}
            <Card>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search modules..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </Card>

            {/* Modules Table */}
            <Card padding="none" className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-[var(--color-text-secondary)]">Code</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-[var(--color-text-secondary)]">Module Name</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-[var(--color-text-secondary)]">Year/Sem</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-[var(--color-text-secondary)]">Sub-Coordinator</th>
                                <th className="text-right py-4 px-6 text-sm font-semibold text-[var(--color-text-secondary)]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr><td colSpan={5} className="py-8 text-center text-gray-500">Loading modules...</td></tr>
                            ) : filteredModules.length === 0 ? (
                                <tr><td colSpan={5} className="py-8 text-center text-gray-500">No modules found.</td></tr>
                            ) : (
                                filteredModules.map((module) => (
                                    <tr key={module.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="py-4 px-6 font-mono font-medium text-[var(--color-primary)]">
                                            {module.code}
                                        </td>
                                        <td className="py-4 px-6 font-medium text-[var(--color-text-primary)]">
                                            {module.name}
                                        </td>
                                        <td className="py-4 px-6 text-sm text-[var(--color-text-secondary)]">
                                            {module.academicYear} <br /> {module.semester}
                                        </td>
                                        <td className="py-4 px-6 text-sm">
                                            {module.subCoordinator || <span className="text-gray-400 italic">Unassigned</span>}
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex justify-end gap-2">
                                                {currentUser.role === 'main-coordinator' && (
                                                    <button
                                                        onClick={() => handleEditClick(module)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                                        title="Edit Module"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => onNavigate('module-management')}
                                                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                                                    title="Manage Timetable & Settings"
                                                >
                                                    <Settings size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
