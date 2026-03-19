import React, { useState, useRef } from 'react';
import { User, Mail, Lock, Phone, Save, CheckCircle, Sparkles } from 'lucide-react';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { User as UserType } from '../lib/mockData';
import { useScrollToTop } from '../lib/hooks';

interface UserProfilePageProps {
  currentUser: UserType;
  onNavigate: (page: string) => void;
  onLogout?: () => void;
}

export function UserProfilePage({ currentUser, onNavigate, onLogout }: UserProfilePageProps) {
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  useScrollToTop(scrollContainerRef, [showSuccess, passwordError]);

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'main-coordinator':
        return 'Main Coordinator';
      case 'sub-coordinator':
        return 'Sub-Coordinator';
      case 'staff':
        return 'Staff';
      case 'lecturer':
        return 'Lecturer';
      default:
        return role;
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setPasswordError('');

    // Validate password change if attempted
    if (newPassword || currentPassword || confirmPassword) {
      if (!currentPassword) {
        setPasswordError('Please enter your current password');
        setIsSubmitting(false);
        return;
      }
      if (newPassword !== confirmPassword) {
        setPasswordError('New passwords do not match');
        setIsSubmitting(false);
        return;
      }
      if (newPassword.length < 8) {
        setPasswordError('New password must be at least 8 characters long');
        setIsSubmitting(false);
        return;
      }
    }

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setShowSuccess(true);
      
      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Hide success message after 3 seconds
      setTimeout(() => setShowSuccess(false), 3000);
    }, 1000);
  };

  return (
    <main ref={scrollContainerRef} className="h-full p-[var(--space-xl)]">
      <div className="max-w-4xl mx-auto space-y-[var(--space-xl)] animate-[fadeIn_0.5s_ease-out]">
        {/* Header with gradient accent */}
        <div className="relative">
          <div className="absolute -top-4 -left-4 w-24 h-24 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] opacity-10 rounded-full blur-3xl animate-[pulse_3s_ease-in-out_infinite]"></div>
          <h1 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)] mb-[var(--space-sm)] relative">
            My Profile
            <Sparkles className="inline-block ml-2 w-6 h-6 text-[var(--color-primary)] animate-[spin_3s_linear_infinite]" />
          </h1>
          <p className="text-[var(--color-text-secondary)] relative">
            Manage your personal information and account settings
          </p>
        </div>

        {/* Success Message with animation */}
        {showSuccess && (
          <div className="bg-gradient-to-r from-[#D1FAE5] to-[#A7F3D0] border-l-4 border-[var(--color-success)] p-[var(--space-lg)] rounded-xl shadow-lg flex items-center gap-[var(--space-md)] animate-[slideInDown_0.4s_ease-out]">
            <CheckCircle className="w-5 h-5 text-[var(--color-success)] animate-[scaleIn_0.5s_ease-out]" />
            <div>
              <h3 className="font-bold text-[var(--color-success)]">Profile Updated Successfully</h3>
              <p className="text-[var(--font-size-small)] text-[#065F46]">
                Your profile information has been saved.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-[var(--space-xl)]">
          {/* Basic Information */}
          <Card>
            <div className="flex items-center gap-[var(--space-md)] mb-[var(--space-lg)]">
              <User className="w-6 h-6 text-[var(--color-primary)]" />
              <div>
                <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)]">
                  Basic Information
                </h2>
                <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)]">
                  Update your personal details
                </p>
              </div>
            </div>

            <div className="space-y-[var(--space-lg)]">
              {/* Role Display (Read-only) */}
              <div>
                <label className="text-[var(--font-size-small)] font-medium text-[var(--color-text-primary)] block mb-[var(--space-sm)]">
                  Role
                </label>
                <div className="px-[var(--space-md)] py-[var(--space-sm)] bg-[var(--color-bg-sidebar)] rounded-lg text-[var(--font-size-body)] text-[var(--color-text-secondary)]">
                  {getRoleDisplay(currentUser.role)}
                </div>
              </div>

              <Input
                label="Full Name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                fullWidth
                icon={<User className="w-4 h-4" />}
              />

              <Input
                label="Email Address"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                fullWidth
                icon={<Mail className="w-4 h-4" />}
                helperText="This email will be used for system notifications"
              />

              <Input
                label="Phone Number"
                type="tel"
                placeholder="+94 77 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                fullWidth
                icon={<Phone className="w-4 h-4" />}
              />
            </div>
          </Card>

          {/* Change Password */}
          <Card>
            <div className="flex items-center gap-[var(--space-md)] mb-[var(--space-lg)]">
              <Lock className="w-6 h-6 text-[var(--color-primary)]" />
              <div>
                <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)]">
                  Change Password
                </h2>
                <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)]">
                  Update your password to keep your account secure
                </p>
              </div>
            </div>

            {passwordError && (
              <div className="mb-[var(--space-lg)] bg-[#FEE2E2] border-l-4 border-[var(--color-error)] p-[var(--space-md)] rounded-lg">
                <p className="text-[var(--font-size-small)] text-[var(--color-error)]">
                  {passwordError}
                </p>
              </div>
            )}

            <div className="space-y-[var(--space-lg)]">
              <Input
                label="Current Password"
                type="password"
                placeholder="Enter your current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                fullWidth
                icon={<Lock className="w-4 h-4" />}
              />

              <Input
                label="New Password"
                type="password"
                placeholder="Enter your new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                fullWidth
                icon={<Lock className="w-4 h-4" />}
                helperText="Must be at least 8 characters long"
              />

              <Input
                label="Confirm New Password"
                type="password"
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                fullWidth
                icon={<Lock className="w-4 h-4" />}
              />

              <div className="bg-[var(--color-bg-sidebar)] p-[var(--space-md)] rounded-lg">
                <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)]">
                  <strong>Password Requirements:</strong>
                </p>
                <ul className="mt-[var(--space-sm)] space-y-1 text-[var(--font-size-small)] text-[var(--color-text-secondary)] list-disc list-inside">
                  <li>At least 8 characters long</li>
                  <li>Mix of uppercase and lowercase letters recommended</li>
                  <li>Include numbers and special characters for better security</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end gap-[var(--space-md)]">
            <Button
              type="button"
              variant="outline"
              onClick={() => onNavigate('dashboard')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              icon={<Save className="w-4 h-4" />}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}