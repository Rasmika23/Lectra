import React, { useState, useRef } from 'react';
import { User, Mail, Lock, Phone, Save, CheckCircle, Sparkles, Loader2 } from 'lucide-react';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { OTPModal } from '../components/OTPModal';
import { fetchWithAuth } from '../lib/api';
import { toast } from 'sonner';
import { useScrollToTop } from '../lib/hooks';

interface UserProfilePageProps {
  currentUser: any;
  onNavigate: (page: string) => void;
  onLogout?: () => void;
  onUserUpdate?: (user: any) => void;
}

export function UserProfilePage({ currentUser, onNavigate, onLogout, onUserUpdate }: UserProfilePageProps) {
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  
  // OTP States
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otpPurpose, setOtpPurpose] = useState<'EMAIL_CHANGE' | 'PASSWORD_CHANGE'>('EMAIL_CHANGE');
  const [tempData, setTempData] = useState<any>(null);

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

  const handleRequestOtp = async (purpose: 'EMAIL_CHANGE' | 'PASSWORD_CHANGE', data: any) => {
    setIsSubmitting(true);
    try {
      const response = await fetchWithAuth('http://localhost:5000/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to send OTP');
      }

      setOtpPurpose(purpose);
      setTempData(data);
      setIsOtpModalOpen(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyAndUpdate = async (otpCode: string) => {
    // First verify locally that OTP matches our purpose on backend indirectly by passing it to update
    // But backend verify-otp marks it as verified.
    try {
      // 1. Mark OTP as verified on backend
      const verifyRes = await fetchWithAuth('http://localhost:5000/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otpCode, purpose: otpPurpose })
      });

      if (!verifyRes.ok) {
        const err = await verifyRes.json();
        throw new Error(err.error || 'Invalid OTP');
      }

      // 2. Perform actual update
      const updateRes = await fetchWithAuth('http://localhost:5000/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...tempData, otpCode })
      });

      if (!updateRes.ok) {
        const err = await updateRes.json();
        throw new Error(err.error || 'Update failed');
      }

      const result = await updateRes.json();
      
      // Update parent state
      const updatedUser = { ...currentUser, ...result.user };
      if (onUserUpdate) onUserUpdate(updatedUser);
      
      setIsOtpModalOpen(false);
      setShowSuccess(true);
      toast.success('Profile updated successfully');
      
      // Clear sensitive fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTempData(null);
      
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      throw err; // Let OTPModal handle the error display
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    const isEmailChanged = email !== currentUser.email;
    const isPasswordChanging = !!newPassword;

    // Validation
    if (isPasswordChanging) {
      if (!currentPassword) {
        setPasswordError('Current password is required to set a new password');
        return;
      }
      if (newPassword !== confirmPassword) {
        setPasswordError('New passwords do not match');
        return;
      }
      if (newPassword.length < 8) {
        setPasswordError('New password must be at least 8 characters');
        return;
      }
    }

    if (isEmailChanged || isPasswordChanging) {
      // Trigger OTP flow
      const purpose = isEmailChanged ? 'EMAIL_CHANGE' : 'PASSWORD_CHANGE';
      const data = {
        name,
        email: isEmailChanged ? email : undefined,
        phone,
        currentPassword: isPasswordChanging ? currentPassword : undefined,
        newPassword: isPasswordChanging ? newPassword : undefined
      };
      await handleRequestOtp(purpose, data);
    } else {
      // Simple update (Name only)
      setIsSubmitting(true);
      try {
        const response = await fetchWithAuth('http://localhost:5000/user/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, phone })
        });

        if (response.ok) {
          const result = await response.json();
          const updatedUser = { ...currentUser, ...result.user };
          if (onUserUpdate) onUserUpdate(updatedUser);
          setShowSuccess(true);
          toast.success('Profile updated successfully');
          setTimeout(() => setShowSuccess(false), 3000);
        } else {
          const err = await response.json();
          toast.error(err.error || 'Failed to update profile');
        }
      } catch (err) {
        toast.error('Connection error');
      } finally {
        setIsSubmitting(false);
      }
    }
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
              icon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>

        <OTPModal
          isOpen={isOtpModalOpen}
          onClose={() => setIsOtpModalOpen(false)}
          onVerify={handleVerifyAndUpdate}
          onResend={() => handleRequestOtp(otpPurpose, tempData)}
          purpose={otpPurpose}
        />
      </div>
    </main>
  );
}