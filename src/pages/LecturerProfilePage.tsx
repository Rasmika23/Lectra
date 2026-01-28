import React, { useState } from 'react';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { FileUpload } from '../components/FileUpload';
import { ArrowLeft, CheckCircle, FileText, CreditCard, IdCard } from 'lucide-react';
import { getLecturerProfile } from '../lib/mockData';

interface LecturerProfilePageProps {
  currentUser: any;
  onNavigate: (page: string) => void;
}

export function LecturerProfilePage({ currentUser, onNavigate }: LecturerProfilePageProps) {
  const profile = getLecturerProfile(currentUser.id);

  const [phone, setPhone] = useState(currentUser.phone || '');
  const [address, setAddress] = useState(currentUser.address || '');
  const [bankName, setBankName] = useState(profile?.bankName || '');
  const [accountNumber, setAccountNumber] = useState(profile?.accountNumber || '');
  const [nicNumber, setNicNumber] = useState(profile?.nicNumber || '');
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setShowSuccess(true);
      setIsSubmitting(false);

      // Hide success message after 3 seconds
      setTimeout(() => setShowSuccess(false), 3000);
    }, 1000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-[var(--space-xl)]">
      {/* Breadcrumb */}
      <button
        onClick={() => onNavigate('lecturer-portal')}
        className="flex items-center gap-[var(--space-sm)] text-[var(--color-primary)] hover:underline"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to My Schedule</span>
      </button>

      {/* Page Title */}
      <div>
        <h1 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">
          My Profile
        </h1>
        <p className="text-[var(--color-text-secondary)] mt-[var(--space-sm)]">
          Update your contact information, bank details, and required documents
        </p>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <Card className="bg-[#D1FAE5] border-[var(--color-success)]">
          <div className="flex items-center gap-[var(--space-md)]">
            <CheckCircle className="w-6 h-6 text-[var(--color-success)]" />
            <p className="font-bold text-[#065F46]">Profile updated successfully!</p>
          </div>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-[var(--space-xl)]">
        {/* Basic Information */}
        <Card>
          <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)] mb-[var(--space-lg)]">
            Contact Information
          </h2>

          <div className="space-y-[var(--space-lg)]">
            <Input
              label="Full Name"
              type="text"
              value={currentUser.name}
              disabled
              fullWidth
              helperText="Contact your coordinator to update your name"
            />

            <Input
              label="Email Address"
              type="email"
              value={currentUser.email}
              disabled
              fullWidth
              helperText="Contact your coordinator to update your email"
            />

            <Input
              label="Phone Number"
              type="tel"
              placeholder="+94 77 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              fullWidth
            />

            <div>
              <label
                htmlFor="address"
                className="text-[var(--font-size-small)] font-medium text-[var(--color-text-primary)] block mb-[var(--space-sm)]"
              >
                Home Address <span className="text-[var(--color-error)]">*</span>
              </label>
              <textarea
                id="address"
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter your complete address"
                required
                className="w-full px-[var(--space-md)] py-[var(--space-sm)] border border-[#CBD5E1] rounded-lg text-[var(--font-size-body)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-opacity-20 resize-vertical"
              />
            </div>
          </div>
        </Card>

        {/* Bank Details */}
        <Card>
          <div className="flex items-center gap-[var(--space-md)] mb-[var(--space-lg)]">
            <CreditCard className="w-6 h-6 text-[var(--color-primary)]" />
            <div>
              <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)]">
                Bank Details
              </h2>
              <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)]">
                Required for payroll processing
              </p>
            </div>
          </div>

          <div className="space-y-[var(--space-lg)]">
            <Input
              label="Bank Name"
              type="text"
              placeholder="e.g., Bank of Ceylon"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              required
              fullWidth
            />

            <Input
              label="Account Number"
              type="text"
              placeholder="Enter your account number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              required
              fullWidth
              helperText="Please verify this information is correct for payment processing"
            />

            <Input
              label="NIC Number"
              type="text"
              placeholder="e.g., 123456789V or 200012345678"
              value={nicNumber}
              onChange={(e) => setNicNumber(e.target.value)}
              required
              fullWidth
              helperText="Enter your National Identity Card number"
            />
          </div>

          <div className="mt-[var(--space-lg)] p-[var(--space-md)] bg-[#FEF3C7] rounded-lg">
            <p className="text-[var(--font-size-small)] text-[#92400E]">
              ⚠️ <strong>Important:</strong> Double-check your bank details. Incorrect information may delay payment.
            </p>
          </div>
        </Card>

        {/* Document Uploads */}
        <Card>
          <div className="flex items-center gap-[var(--space-md)] mb-[var(--space-lg)]">
            <FileText className="w-6 h-6 text-[var(--color-primary)]" />
            <div>
              <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)]">
                Curriculum Vitae (CV)
              </h2>
              <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)]">
                Upload your CV for administrative records
              </p>
            </div>
          </div>

          <div className="space-y-[var(--space-xl)]">
            <div>
              <div className="flex items-center justify-between mb-[var(--space-md)]">
                <div className="flex items-center gap-[var(--space-sm)]">
                  <IdCard className="w-5 h-5 text-[var(--color-text-secondary)]" />
                  <h3 className="font-bold text-[var(--color-text-primary)]">
                    Upload CV Document
                  </h3>
                </div>
                {profile?.cvUploaded && (
                  <div className="flex items-center gap-[var(--space-sm)] text-[var(--color-success)]">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-[var(--font-size-small)]">Uploaded</span>
                  </div>
                )}
              </div>

              {profile?.cvUploaded && (
                <div className="mb-[var(--space-md)] p-[var(--space-md)] bg-[var(--color-bg-main)] rounded-lg">
                  <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)]">
                    Current file: <span className="font-medium text-[var(--color-text-primary)]">{profile.cvFileName}</span>
                  </p>
                </div>
              )}

              <FileUpload
                label={profile?.cvUploaded ? "Upload New CV (Optional)" : "Upload CV"}
                accept=".pdf,.doc,.docx"
                maxSize={10}
                onChange={setCvFile}
                helperText="Accepted formats: PDF, DOC, DOCX (Max 10MB)"
              />
            </div>
          </div>
        </Card>

        {/* Privacy Notice */}
        <Card className="bg-[#DBEAFE] border-[var(--color-info)]">
          <div className="flex gap-[var(--space-md)]">
            <div className="text-[var(--color-info)]">🔒</div>
            <div>
              <p className="font-medium text-[#1E40AF]">Data Privacy & Security</p>
              <p className="text-[var(--font-size-small)] text-[#1E40AF] mt-[var(--space-sm)]">
                Your personal information and documents are encrypted and stored securely.
                This information is only accessible to authorized university personnel for
                administrative and payroll purposes.
              </p>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-[var(--space-md)]">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving Changes...' : 'Save Profile'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => onNavigate('lecturer-portal')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}