import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { Users, Search, Trash2, Shield, Mail, Calendar, UserPlus } from 'lucide-react';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    department: string;
    joinDate: string;
    assignedModules?: string;
}

interface UserManagementPageProps {
    currentUser: any;
    onNavigate: (page: string) => void;
  onLogout?: () => void;
}

export function UserManagementPage({ currentUser, onNavigate, onLogout }: UserManagementPageProps) {
    const [users, setUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRole, setSelectedRole] = useState('All Roles');
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await fetch('http://localhost:5000/users');
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteUser = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
            return;
        }

        setIsDeleting(id);
        try {
            const response = await fetch(`http://localhost:5000/users/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setUsers(users.filter(user => user.id !== id));
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to delete user');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Connection error while trying to delete user');
        } finally {
            setIsDeleting(null);
        }
    };

    const getRoleDisplay = (role: string) => {
        switch (role) {
            case 'main-coordinator': return 'Main Coordinator';
            case 'sub-coordinator': return 'Sub-Coordinator';
            case 'lecturer': return 'Lecturer';
            case 'staff': return 'Staff';
            default: return role;
        }
    };

    const getRoleBadgeVariant = (role: string) => {
        switch (role) {
            case 'main-coordinator': return 'info';
            case 'sub-coordinator': return 'warning';
            case 'lecturer': return 'success';
            case 'staff': return 'neutral';
            default: return 'neutral';
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = selectedRole === 'All Roles' || getRoleDisplay(user.role) === selectedRole;
        return matchesSearch && matchesRole;
    });

    return (
        <div className="h-full">
            
            <div className="flex-1 flex flex-col h-full">
                
                <main className="flex-1 overflow-y-auto p-[var(--space-xl)]">
                    <div className="max-w-7xl mx-auto space-y-[var(--space-xl)]">
                        {/* Page Header */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-[var(--space-md)]">
                            <div>
                                <h1 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">
                                    User Management
                                </h1>
                                <p className="text-[var(--color-text-secondary)] mt-[var(--space-sm)]">
                                    Manage all system users, their roles, and access permissions
                                </p>
                            </div>

                            <Button
                                variant="primary"
                                size="lg"
                                icon={<UserPlus className="w-5 h-5" />}
                                onClick={() => onNavigate('create-user')}
                            >
                                Create New User
                            </Button>
                        </div>

                        {/* Filters */}
                        <Card>
                            <div className="flex flex-col md:flex-row gap-[var(--space-md)]">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-disabled)]" />
                                    <input
                                        type="text"
                                        placeholder="Search users by name or email..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-shadow"
                                    />
                                </div>
                                <div className="w-full md:w-64">
                                    <select
                                        value={selectedRole}
                                        onChange={(e) => setSelectedRole(e.target.value)}
                                        className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white"
                                    >
                                        <option value="All Roles">All Roles</option>
                                        <option value="Main Coordinator">Main Coordinator</option>
                                        <option value="Sub-Coordinator">Sub-Coordinator</option>
                                        <option value="Lecturer">Lecturer</option>
                                        <option value="Staff">Staff</option>
                                    </select>
                                </div>
                            </div>
                        </Card>

                        {/* Users List */}
                        <Card padding="none" className="overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-[var(--color-bg-sidebar)] border-b border-[#E2E8F0] text-[var(--font-size-small)] text-[var(--color-text-secondary)]">
                                            <th className="p-[var(--space-md)] font-semibold w-[40%]">User Details</th>
                                            <th className="p-[var(--space-md)] font-semibold w-[20%]">Role</th>
                                            <th className="p-[var(--space-md)] font-semibold w-[20%]">Assigned Modules</th>
                                            <th className="p-[var(--space-md)] font-semibold w-[20%] text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isLoading ? (
                                            <tr>
                                                <td colSpan={5} className="p-[var(--space-xl)] text-center text-[var(--color-text-secondary)]">
                                                    Loading users...
                                                </td>
                                            </tr>
                                        ) : filteredUsers.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="p-[var(--space-xl)] text-center text-[var(--color-text-secondary)]">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <Users className="w-8 h-8 opacity-50" />
                                                        <p>No users found matching your search.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredUsers.map((user) => (
                                                <tr key={user.id} className="border-b border-[#E2E8F0] last:border-0 hover:bg-[var(--color-bg-main)] transition-colors">
                                                    <td className="p-[var(--space-md)]">
                                                        <div className="flex flex-col">
                                                            <p className="font-bold text-[var(--color-text-primary)]">{user.name}</p>
                                                            <div className="flex items-center gap-1 text-[var(--font-size-small)] text-[var(--color-text-secondary)] mt-1">
                                                                <Mail className="w-3 h-3" />
                                                                <span>{user.email}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-[var(--space-md)]">
                                                        <StatusBadge status={getRoleBadgeVariant(user.role)}>
                                                            {getRoleDisplay(user.role)}
                                                        </StatusBadge>
                                                    </td>
                                                    <td className="p-[var(--space-md)] text-[var(--font-size-small)] text-[var(--color-text-secondary)]">
                                                        {user.assignedModules || '-'}
                                                    </td>
                                                    <td className="p-[var(--space-md)] text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-[var(--color-error)] hover:bg-[#FEE2E2] hover:text-[var(--color-error)]"
                                                            disabled={isDeleting === user.id || currentUser.email === user.email}
                                                            onClick={() => handleDeleteUser(user.id, user.name)}
                                                            title={currentUser.email === user.email ? "Cannot delete yourself" : "Delete User"}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                </main>
            </div>
        </div>
    );
}
