import React, { useState, useRef, useEffect } from 'react';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { FileUpload } from '../components/FileUpload';
import { ArrowLeft, CheckCircle, FileText, CreditCard, IdCard, Globe, Landmark, Hash, User as UserIcon } from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import { useScrollToTop } from '../lib/hooks';
import { toast } from 'sonner';

interface LecturerProfilePageProps {
  currentUser: any;
  onNavigate: (page: string) => void;
  onLogout?: () => void;
}

export function LecturerProfilePage({ currentUser, onNavigate, onLogout }: LecturerProfilePageProps) {
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [bankCountry, setBankCountry] = useState('');
  const [swiftBic, setSwiftBic] = useState('');
  const [iban, setIban] = useState('');
  const [nicNumber, setNicNumber] = useState('');
  const [cvUploaded, setCvUploaded] = useState(false);
  const [cvFileName, setCvFileName] = useState<string | null>(null);
  
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Separate states for contact and bank saving
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [isSubmittingBank, setIsSubmittingBank] = useState(false);
  const [showSuccessContact, setShowSuccessContact] = useState(false);
  const [showSuccessBank, setShowSuccessBank] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // We'll use a local hook or just scroll manually if needed

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetchWithAuth('http://localhost:5000/lecturer/profile');
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

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingContact(true);
    console.log('FRONTEND: Saving contact info:', { phone, address, nicNumber });
    
    try {
      const response = await fetchWithAuth('http://localhost:5000/lecturer/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          address,
          nicNumber
          // CV upload would typically be a separate request if we're doing file upload,
          // but for now, we're just saving textual details.
        })
      });

      if (response.ok) {
        setShowSuccessContact(true);
        toast.success('Contact information updated');
        setTimeout(() => setShowSuccessContact(false), 3000);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to update contact info');
      }
    } catch (error) {
      console.error('Error updating contact info:', error);
      toast.error('An error occurred while saving contact info');
    } finally {
      setIsSubmittingContact(false);
    }
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingBank(true);
    
    try {
      const response = await fetchWithAuth('http://localhost:5000/lecturer/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankDetails: {
            bankName,
            accountNumber,
            accountHolderName,
            bankCountry,
            swiftBic,
            iban
          }
        })
      });

      if (response.ok) {
        setShowSuccessBank(true);
        toast.success('Bank details updated successfully');
        setTimeout(() => setShowSuccessBank(false), 3000);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to update bank details');
      }
    } catch (error) {
      console.error('Error updating bank details:', error);
      toast.error('An error occurred while saving bank details');
    } finally {
      setIsSubmittingBank(false);
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
                      {cvUploaded && (
                        <div className="p-[var(--space-md)] bg-[var(--color-bg-main)] rounded-lg flex items-center justify-between">
                          <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)]">
                            Current file: <span className="font-medium text-[var(--color-text-primary)]">{cvFileName}</span>
                          </p>
                          <div className="flex items-center gap-[var(--space-sm)] text-[var(--color-success)]">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-[var(--font-size-small)]">Uploaded</span>
                          </div>
                        </div>
                      )}
                      
                      <FileUpload
                        label={cvUploaded ? "Upload New CV (Optional)" : "Upload CV"}
                        accept=".pdf,.doc,.docx"
                        maxSize={10}
                        onChange={setCvFile}
                        helperText="Accepted formats: PDF, DOC, DOCX (Max 10MB)"
                      />
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
                    >
                      {isSubmittingBank ? 'Saving...' : 'Save Bank Details'}
                    </Button>
                  </div>
                </form>
              </Card>
            </section>
            
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