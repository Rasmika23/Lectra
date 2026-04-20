import React, { useState, useRef, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { FileUpload } from '../components/FileUpload';
import { ArrowLeft, CheckCircle, FileText, CreditCard, IdCard, Globe, Landmark, Hash, User as UserIcon, Trash2, Mail, User, Save, Loader2 } from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import { useScrollToTop } from '../lib/hooks';
import { toast } from 'sonner';
import { OTPModal } from '../components/OTPModal';

interface LecturerProfilePageProps {
  currentUser: any;
  onNavigate: (page: string) => void;
  onLogout?: () => void;
  onUserUpdate?: (user: any) => void;
}

export function LecturerProfilePage({ currentUser, onNavigate, onLogout, onUserUpdate }: LecturerProfilePageProps) {
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [bankCountry, setBankCountry] = useState('');
  const [swiftBic, setSwiftBic] = useState('');
  const [iban, setIban] = useState('');
  const [nicNumber, setNicNumber] = useState('');
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [cvUploaded, setCvUploaded] = useState(false);
  const [cvFileName, setCvFileName] = useState<string | null>(null);
  
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Separate states for contact and bank saving
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [isSubmittingBank, setIsSubmittingBank] = useState(false);
  const [showSuccessContact, setShowSuccessContact] = useState(false);
  const [showSuccessBank, setShowSuccessBank] = useState(false);

  // OTP States
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otpPurpose, setOtpPurpose] = useState<'EMAIL_CHANGE' | 'BANK_DETAILS_CHANGE'>('EMAIL_CHANGE');
  const [tempData, setTempData] = useState<any>(null);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // We'll use a local hook or just scroll manually if needed

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetchWithAuth(`${API_BASE_URL}/lecturer/profile`);
        if (response.ok) {
          const data = await response.json();
          setPhone(data.phone);
          setAddress(data.address);
          setNicNumber(data.nicNumber);
          setCvUploaded(data.cvUploaded);
          setCvFileName(data.cvFileName);
          
          if (data.bankDetails) {
            setBankName(data.bankDetails.bankName);
            setAccountNumber(data.bankDetails.accountNumber);
            setAccountHolderName(data.bankDetails.accountHolderName);
            setBankCountry(data.bankDetails.bankCountry);
            setSwiftBic(data.bankDetails.swiftBic);
            setIban(data.bankDetails.iban);
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error('Failed to load profile details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleRequestOtp = async (purpose: 'EMAIL_CHANGE' | 'BANK_DETAILS_CHANGE', data: any) => {
    // If it's a contact update but name changed without email, we don't need OTP
    // This is handled in handleSaveContact
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/auth/request-otp`, {
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
    }
  };

  const handleVerifyAndUpdate = async (otpCode: string) => {
    try {
      // 1. Verify OTP
      const verifyRes = await fetchWithAuth(`${API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otpCode, purpose: otpPurpose })
      });

      if (!verifyRes.ok) {
        const err = await verifyRes.json();
        throw new Error(err.error || 'Invalid OTP');
      }

      // 2. Perform Update based on purpose
      if (otpPurpose === 'EMAIL_CHANGE') {
        const response = await fetchWithAuth(`${API_BASE_URL}/user/profile`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: tempData.name, email: tempData.email, otpCode })
        });

        if (response.ok) {
           const result = await response.json();
           const updatedUser = { ...currentUser, ...result.user };
           if (onUserUpdate) onUserUpdate(updatedUser);
           // Now save the rest of lecturer info
           await saveLecturerProfile(tempData.lecturerData);
        } else {
           const err = await response.json();
           throw new Error(err.error || 'Failed to update user profile');
        }
      } else if (otpPurpose === 'BANK_DETAILS_CHANGE') {
        const response = await fetchWithAuth(`${API_BASE_URL}/lecturer/profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bankDetails: tempData.bankDetails, otpCode })
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Failed to update bank details');
        }
        setShowSuccessBank(true);
        toast.success('Bank details updated');
        setTimeout(() => setShowSuccessBank(false), 3000);
      }

      setIsOtpModalOpen(false);
      setTempData(null);
    } catch (err: any) {
      throw err;
    }
  };

  const saveLecturerProfile = async (data: any) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/lecturer/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        setShowSuccessContact(true);
        toast.success('Contact information updated');
        setTimeout(() => setShowSuccessContact(false), 3000);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to update contact info');
      }
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingContact(true);
    
    try {
      // 1. CV Upload (independent)
      if (cvFile) {
        const formData = new FormData();
        formData.append('cv', cvFile);
        const cvResponse = await fetchWithAuth(`${API_BASE_URL}/lecturer/profile/cv`, {
          method: 'POST',
          body: formData,
        });

        if (!cvResponse.ok) {
          const errorData = await cvResponse.json();
          throw new Error(errorData.error || 'Failed to upload CV');
        }

        const cvData = await cvResponse.json();
        setCvUploaded(true);
        setCvFileName(cvData.cvFileName);
        setCvFile(null);
        toast.success('CV uploaded successfully');
      }

      const isNameChanged = name !== currentUser.name;
      const isEmailChanged = email !== currentUser.email;
      const lecturerData = { phone, address, nicNumber };

      if (isEmailChanged) {
        await handleRequestOtp('EMAIL_CHANGE', { name, email, lecturerData });
      } else {
        // Just name or other contact info
        if (isNameChanged) {
            await fetchWithAuth(`${API_BASE_URL}/user/profile`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            const updatedUser = { ...currentUser, name };
            if (onUserUpdate) onUserUpdate(updatedUser);
        }
        await saveLecturerProfile(lecturerData);
      }

    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'An error occurred while saving profile');
    } finally {
      setIsSubmittingContact(false);
    }
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    const bankDetails = {
        bankName,
        accountNumber,
        accountHolderName,
        bankCountry,
        swiftBic,
        iban
      };
    
    await handleRequestOtp('BANK_DETAILS_CHANGE', { bankDetails });
  };

  const handleDeleteCv = async () => {
    if (!window.confirm('Are you sure you want to remove your current CV?')) {
      return;
    }

    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/lecturer/profile/cv`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCvUploaded(false);
        setCvFileName(null);
        toast.success('CV removed successfully');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to delete CV');
      }
    } catch (error) {
      console.error('Error deleting CV:', error);
      toast.success('An error occurred while deleting CV');
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="flex-1 flex flex-col h-full">
        <main 
          ref={scrollContainerRef}
          className="h-full p-[var(--space-xl)] bg-[var(--color-bg-sidebar)]"
        >
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
                Manage your personal details, documents, and banking information separately.
              </p>
            </div>
            
            {/* Contact & Personal Information Section */}
            <section className="space-y-[var(--space-lg)]">
              <Card>
                <div className="flex items-center justify-between mb-[var(--space-lg)]">
                  <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)]">
                    Contact & Personal Information
                  </h2>
                  {showSuccessContact && (
                    <div className="flex items-center gap-[var(--space-sm)] text-[var(--color-success)] animate-fade-in">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-[var(--font-size-small)] font-medium">Saved!</span>
                    </div>
                  )}
                </div>
                
                <form onSubmit={handleSaveContact} className="space-y-[var(--space-lg)]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--space-lg)]">
                    <Input
                      label="Full Name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      fullWidth
                      icon={<User className="w-4 h-4" />}
                      helperText="Contact your coordinator if you need to update your official name."
                    />
                    
                    <Input
                      label="Email Address"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      fullWidth
                      icon={<Mail className="w-4 h-4" />}
                      helperText="Changing your email will require verification."
                    />
                    
                    <Input
                      label="Phone Number"
                      type="tel"
                      placeholder="+94 77 123 4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      fullWidth
                      helperText="Please include the country code in your phone number."
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
                      icon={<IdCard className="w-4 h-4 text-[var(--color-text-secondary)]" />}
                    />
                  </div>
                  
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

                  {/* Document Uploads (CV) integrated into Contact Section */}
                  <div className="pt-[var(--space-lg)] border-t border-[var(--color-bg-sidebar)]">
                    <div className="flex items-center gap-[var(--space-md)] mb-[var(--space-md)]">
                      <FileText className="w-5 h-5 text-[var(--color-primary)]" />
                      <h3 className="font-bold text-[var(--color-text-primary)]">
                        Curriculum Vitae (CV)
                      </h3>
                    </div>
                    
                    <div className="space-y-[var(--space-md)]">
                      {cvUploaded ? (
                        <div className="p-[var(--space-md)] bg-[var(--color-bg-sidebar)] border border-[#E2E8F0] rounded-xl flex items-center justify-between group hover:border-[var(--color-primary)] transition-all">
                          <div className="flex items-center gap-[var(--space-md)]">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[var(--font-size-small)] font-medium text-[var(--color-text-primary)]">
                                    Current CV
                                </p>
                                <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)]">
                                    {cvFileName}
                                </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-[var(--space-md)]">
                            <div className="hidden sm:flex items-center gap-[var(--space-sm)] text-[var(--color-success)] px-[var(--space-sm)] py-1 bg-green-50 rounded-full border border-green-100">
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-xs font-medium uppercase tracking-wider">Active</span>
                            </div>
                            <button
                                type="button"
                                onClick={handleDeleteCv}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors group-hover:opacity-100"
                                title="Remove CV"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <FileUpload
                          label="Upload CV"
                          accept=".pdf,.doc,.docx"
                          maxSize={10}
                          onChange={setCvFile}
                          helperText="Accepted formats: PDF, DOC, DOCX (Max 10MB)"
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end pt-[var(--space-md)]">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={isSubmittingContact}
                    >
                      {isSubmittingContact ? 'Saving...' : 'Save Contact Details'}
                    </Button>
                  </div>
                </form>
              </Card>
            </section>
            
            {/* Bank Details Section at the Bottom */}
            <section className="space-y-[var(--space-lg)]">
              <Card>
                <div className="flex items-center justify-between mb-[var(--space-lg)]">
                  <div className="flex items-center gap-[var(--space-md)]">
                    <CreditCard className="w-6 h-6 text-[var(--color-primary)]" />
                    <div>
                      <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)]">
                        Bank Details
                      </h2>
                      <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)]">
                        Required for payroll processing. Supports international transfers.
                      </p>
                    </div>
                  </div>
                  {showSuccessBank && (
                    <div className="flex items-center gap-[var(--space-sm)] text-[var(--color-success)] animate-fade-in">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-[var(--font-size-small)] font-medium">Saved!</span>
                    </div>
                  )}
                </div>
                
                <form onSubmit={handleSaveBank} className="space-y-[var(--space-lg)]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--space-lg)]">
                    <div className="md:col-span-2">
                      <Input
                        label="Account Holder Name"
                        type="text"
                        placeholder="Enter full name as it appears on account"
                        value={accountHolderName}
                        onChange={(e) => setAccountHolderName(e.target.value)}
                        required
                        fullWidth
                        icon={<UserIcon className="w-4 h-4 text-[var(--color-text-secondary)]" />}
                      />
                    </div>

                    <Input
                      label="Bank Name"
                      type="text"
                      placeholder="e.g., Bank of Ceylon or HSBC"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      required
                      fullWidth
                      icon={<Landmark className="w-4 h-4 text-[var(--color-text-secondary)]" />}
                    />
                    
                    <Input
                      label="Bank Country"
                      type="text"
                      placeholder="e.g., Sri Lanka or United Kingdom"
                      value={bankCountry}
                      onChange={(e) => setBankCountry(e.target.value)}
                      required
                      fullWidth
                      icon={<Globe className="w-4 h-4 text-[var(--color-text-secondary)]" />}
                    />

                    <Input
                      label="Account Number"
                      type="text"
                      placeholder="Enter your account number"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      required
                      fullWidth
                      icon={<Hash className="w-4 h-4 text-[var(--color-text-secondary)]" />}
                    />

                    <Input
                      label="IBAN (Optional)"
                      type="text"
                      placeholder="Enter IBAN for international transfers"
                      value={iban}
                      onChange={(e) => setIban(e.target.value)}
                      fullWidth
                      icon={<Hash className="w-4 h-4 text-[var(--color-text-secondary)]" />}
                    />

                    <Input
                      label="SWIFT/BIC (Optional)"
                      type="text"
                      placeholder="Enter SWIFT/BIC code"
                      value={swiftBic}
                      onChange={(e) => setSwiftBic(e.target.value)}
                      fullWidth
                      icon={<Globe className="w-4 h-4 text-[var(--color-text-secondary)]" />}
                    />
                  </div>
                  
                  <div className="p-[var(--space-md)] bg-[#FEF3C7] rounded-lg">
                    <p className="text-[var(--font-size-small)] text-[#92400E]">
                      ⚠️ <strong>Important:</strong> Double-check your bank details. Incorrect information may delay payment.
                    </p>
                  </div>

                  <div className="flex justify-end pt-[var(--space-md)]">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={isSubmittingBank}
                      icon={isSubmittingBank ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    >
                      {isSubmittingBank ? 'Saving...' : 'Save Bank Details'}
                    </Button>
                  </div>
                </form>
              </Card>
            </section>

            <OTPModal
              isOpen={isOtpModalOpen}
              onClose={() => setIsOtpModalOpen(false)}
              onVerify={handleVerifyAndUpdate}
              onResend={() => handleRequestOtp(otpPurpose, tempData)}
              purpose={otpPurpose}
            />

            
            {/* Privacy Notice at the very bottom */}
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
          </div>
        </main>
      </div>
    </div>
  );
}