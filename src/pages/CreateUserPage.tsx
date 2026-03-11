import React, { useState } from 'react';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Button } from '../components/Button';
import { ArrowLeft, CheckCircle } from 'lucide-react';

interface CreateUserPageProps {
  currentUser: any;
  onNavigate: (page: string) => void;
  onLogout?: () => void;
}

export function CreateUserPage({ currentUser, onNavigate, onLogout }: CreateUserPageProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roleOptions = [
    { value: '', label: 'Select a role' },
    { value: 'main-coordinator', label: 'Main Coordinator' },
    { value: 'sub-coordinator', label: 'Sub-Coordinator' },
    { value: 'lecturer', label: 'Lecturer' },
    { value: 'staff', label: 'Staff' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('http://localhost:5000/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, role }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowSuccess(true);
        // Reset form after 3 seconds
        setTimeout(() => {
          setEmail('');
          setRole('');
          setShowSuccess(false);
        }, 3000);
      } else {
        alert(data.error || 'Failed to send invitation');
      }
    } catch (err) {
      console.error(err);
      alert('Connection failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full">
      
      <div className="flex-1 flex flex-col h-full">
        
        <main className="flex-1 overflow-y-auto p-[var(--space-xl)]">
          <div className="max-w-3xl mx-auto space-y-[var(--space-xl)]">
            {/* Breadcrumb */}
            <button
              onClick={() => onNavigate('user-management')}
              className="flex items-center gap-[var(--space-sm)] text-[var(--color-primary)] hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to User Management</span>
            </button>

            {/* Page Title */}
            <div>
              <h1 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">
                Create New User
              </h1>
              <p className="text-[var(--color-text-secondary)] mt-[var(--space-sm)]">
                Register a new user by providing their email address and role. An invitation email will be sent automatically.
              </p>
            </div>

            {/* Success Message */}
            {showSuccess && (
              <Card className="bg-[#D1FAE5] border-[var(--color-success)]">
                <div className="flex items-center gap-[var(--space-md)]">
                  <CheckCircle className="w-6 h-6 text-[var(--color-success)]" />
                  <div>
                    <p className="font-bold text-[#065F46]">User created successfully!</p>
                    <p className="text-[var(--font-size-small)] text-[#047857] mt-1">
                      An invitation email has been sent to {email} to set up their account.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Form */}
            <Card>
              <form onSubmit={handleSubmit} className="space-y-[var(--space-xl)]">
                <div className="space-y-[var(--space-lg)]">
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="user@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    fullWidth
                    helperText="The user will receive an email invitation to set up their password"
                  />

                  <Select
                    label="User Role"
                    options={roleOptions}
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                    fullWidth
                    helperText="Select the appropriate role for this user"
                  />
                </div>

                {/* Role Descriptions */}
                <div className="bg-[var(--color-bg-sidebar)] p-[var(--space-lg)] rounded-lg">
                  <h3 className="font-bold text-[var(--color-text-primary)] mb-[var(--space-md)]">
                    Role Descriptions
                  </h3>
                  <div className="space-y-[var(--space-sm)] text-[var(--font-size-small)]">
                    <div>
                      <span className="font-medium text-[var(--color-text-primary)]">Main Coordinator:</span>
                      <span className="text-[var(--color-text-secondary)] ml-2">
                        Full system access, can create users and modules
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-[var(--color-text-primary)]">Sub-Coordinator:</span>
                      <span className="text-[var(--color-text-secondary)] ml-2">
                        Manages assigned modules, tracks attendance, handles reschedules
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-[var(--color-text-primary)]">Lecturer:</span>
                      <span className="text-[var(--color-text-secondary)] ml-2">
                        Views schedule, requests reschedules, updates profile
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-[var(--color-text-primary)]">Staff:</span>
                      <span className="text-[var(--color-text-secondary)] ml-2">
                        Views and generates reports for administrative purposes
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-[var(--space-md)] pt-[var(--space-lg)] border-t border-[#E2E8F0]">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Sending Invitation...' : 'Create User & Send Invitation'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="lg"
                    onClick={() => onNavigate('user-management')}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>

            {/* Info Box */}
            <Card className="bg-[#DBEAFE] border-[var(--color-info)]">
              <div className="flex gap-[var(--space-md)]">
                <div className="text-[var(--color-info)]">ℹ️</div>
                <div>
                  <p className="font-medium text-[#1E40AF]">Important Notes</p>
                  <ul className="text-[var(--font-size-small)] text-[#1E40AF] mt-[var(--space-sm)] space-y-1 list-disc list-inside">
                    <li>The user will receive an automated email with a secure setup link</li>
                    <li>The link will expire after 24 hours for security purposes</li>
                    <li>You can resend the invitation if needed from the user management section</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}