import React, { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { ArrowLeft, Trash2, Search, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { authenticatedFetch } from '../lib/api';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
}

interface UserManagementPageProps {
    currentUser: any;
    onNavigate: (page: string) => void;
    onLogout?: () => void;
}

export function UserManagementPage({ currentUser, onNavigate, onLogout }: UserManagementPageProps) {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await authenticatedFetch('http://localhost:5000/users');
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            } else {
                toast.error('Failed to load users');
            }
        } catch (error) {
            console.error(error);
            toast.error('Connection error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
            return;
        }

        setIsDeleting(id);
        try {
            const response = await authenticatedFetch(`http://localhost:5000/users/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                toast.success(`User ${name} deleted successfully`);
                setUsers(users.filter(u => u.id !== id));
            } else {
                toast.error('Failed to delete user');
            }
        } catch (error) {
            console.error(error);
            toast.error('Connection error during deletion');
        } finally {
            setIsDeleting(null);
        }
    };

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-6xl mx-auto space-y-[var(--space-xl)]">
            {/* Breadcrumb */}
            <button
                onClick={() => onNavigate('main-dashboard')}
                className="flex items-center gap-[var(--space-sm)] text-[var(--color-primary)] hover:underline"
            >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Dashboard</span>
            </button>

            {/* Title & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-[var(--space-md)]">
                <div>
                    <h1 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">
                        User Management
                    </h1>
                    <p className="text-[var(--color-text-secondary)] mt-[var(--space-sm)]">
                        View and manage all system users
                    </p>
                </div>
                <Button
                    variant="primary"
                    onClick={() => onNavigate('create-user')}
                >
                    + Create New User
                </Button>
            </div>

            {/* Search */}
            <Card>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search users by name, email, or role..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </Card>

            {/* Users Table */}
            <Card padding="none" className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-[var(--color-text-secondary)]">User</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-[var(--color-text-secondary)]">Role</th>
                                <th className="text-right py-4 px-6 text-sm font-semibold text-[var(--color-text-secondary)]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={3} className="py-8 text-center text-gray-500">Loading users...</td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="py-8 text-center text-gray-500">No users found.</td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                                    <UserIcon size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-[var(--color-text-primary)]">{user.name}</p>
                                                    <p className="text-sm text-gray-500">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <StatusBadge
                                                status={
                                                    user.role === 'main-coordinator' ? 'success' :
                                                        user.role === 'sub-coordinator' ? 'info' :
                                                            'warning'
                                                }
                                            >
                                                {user.role.replace('-', ' ')}
                                            </StatusBadge>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            {user.role !== 'main-coordinator' && (
                                                <button
                                                    onClick={() => handleDelete(user.id, user.name)}
                                                    disabled={isDeleting === user.id}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                                    title="Delete User"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
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
