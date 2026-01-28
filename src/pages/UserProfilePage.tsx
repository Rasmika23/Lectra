import React, { useState } from 'react';
import { User, Mail, Phone, Save, CheckCircle, Sparkles, Lock, Send } from 'lucide-react';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { User as UserType } from '../lib/mockData';

interface UserProfilePageProps {
  currentUser: UserType;
  onNavigate: (page: string) => void;
}

export function UserProfilePage({ currentUser, onNavigate }: UserProfilePageProps) {
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password Reset State
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');

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

    // Simulate API call for profile update
    setTimeout(() => {
      setIsSubmitting(false);
      setShowSuccess(true);

      // Hide success message after 3 seconds
      setTimeout(() => setShowSuccess(false), 3000);
    }, 1000);
  };

  const handleRequestPasswordReset = async () => {
    setIsSendingReset(true);
    setResetMessage('');
    setResetError('');

    try {
      const response = await fetch('http://localhost:5000/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: currentUser.email }),
      });

      const data = await response.json();

      if (response.ok) {
        setResetMessage('A password reset link has been sent to your email.');
      } else {
        setResetError(data.error || 'Failed to send reset link.');
      }
    } catch (err) {
      console.error(err);
      setResetError('Connection failed.');
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
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

      {/* Success Message for Profile Update */}
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

        {/* Password Security */}
        <Card>
          <div className="flex items-center gap-[var(--space-md)] mb-[var(--space-lg)]">
            <Lock className="w-6 h-6 text-[var(--color-primary)]" />
            <div>
              <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)]">
                Security Settings
              </h2>
              <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)]">
                Manage your password and security
              </p>
            </div>
          </div>

          <div className="space-y-[var(--space-lg)]">
            <div className="bg-[var(--color-bg-sidebar)] p-[var(--space-lg)] rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-[var(--space-md)]">
              <div>
                <h3 className="font-bold text-[var(--color-text-primary)]">Password Reset</h3>
                <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mt-1">
                  To change your password, we'll send a secure link to your email address:
                  <span className="font-medium text-[var(--color-text-primary)] ml-1">{currentUser.email}</span>
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={handleRequestPasswordReset}
                disabled={isSendingReset}
                icon={<Send className="w-4 h-4" />}
              >
                {isSendingReset ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </div>

            {/* Status Messages for Reset */}
            {resetMessage && (
              <div className="p-3 bg-blue-50 text-blue-700 text-sm rounded-md border border-blue-200 animate-[fadeIn_0.3s_ease-out]">
                {resetMessage}
              </div>
            )}
            {resetError && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200 animate-[fadeIn_0.3s_ease-out]">
                {resetError}
              </div>
            )}
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
  );
}