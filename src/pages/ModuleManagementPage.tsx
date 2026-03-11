import React, { useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Button } from '../components/Button';
import { FileUpload } from '../components/FileUpload';
import { ArrowLeft, CheckCircle, Upload, Clock } from 'lucide-react';
import { mockModules } from '../lib/mockData';

interface ModuleManagementPageProps {
  currentUser: any;
  onNavigate: (page: string) => void;
  onLogout?: () => void;
}

export function ModuleManagementPage({ currentUser, onNavigate, onLogout }: ModuleManagementPageProps) {
  const [selectedModule, setSelectedModule] = useState(mockModules[0].id);
  const [defaultDay, setDefaultDay] = useState('Wednesday');
  const [defaultTime, setDefaultTime] = useState('10:00');
  const [defaultEndTime, setDefaultEndTime] = useState('12:00');
  const [reminderTime, setReminderTime] = useState('48');
  const [reminderContent, setReminderContent] = useState('Dear [Lecturer Name],\n\nThis is a friendly reminder that you have an upcoming lecture session:\n\nModule: [Module Code] - [Module Name]\nDate: [Date]\nTime: [Start Time] - [End Time]\nLocation: [Location]\n\nPlease ensure you are prepared. If you need to reschedule, please use the Lectra system as soon as possible.\n\nBest regards,\nLectra System');
  const [timetableFile, setTimetableFile] = useState<File | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const module = mockModules.find(m => m.id === selectedModule);
  
  const moduleOptions = mockModules.map(m => ({
    value: m.id,
    label: `${m.code} - ${m.name}`
  }));
  
  const dayOptions = [
    { value: 'Monday', label: 'Monday' },
    { value: 'Tuesday', label: 'Tuesday' },
    { value: 'Wednesday', label: 'Wednesday' },
    { value: 'Thursday', label: 'Thursday' },
    { value: 'Friday', label: 'Friday' },
  ];
  
  const reminderOptions = [
    { value: '24', label: '24 hours before' },
    { value: '48', label: '48 hours before' },
    { value: '72', label: '72 hours before' },
  ];
  
  const handleSaveSettings = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };
  
  return (
    <div className="flex h-screen bg-[var(--color-bg-main)]">
      <Sidebar role="sub-coordinator" currentPage="module-management" onNavigate={onNavigate} onLogout={onLogout} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userName={currentUser.name} userRole="Sub-Coordinator" />
        
        <main className="flex-1 overflow-y-auto p-[var(--space-xl)]">
          <div className="max-w-5xl mx-auto space-y-[var(--space-xl)]">
            {/* Breadcrumb */}
            <button
              onClick={() => onNavigate('sub-dashboard')}
              className="flex items-center gap-[var(--space-sm)] text-[var(--color-primary)] hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
            
            {/* Page Title */}
            <div>
              <h1 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">
                Module Management
              </h1>
              <p className="text-[var(--color-text-secondary)] mt-[var(--space-sm)]">
                Configure module settings, upload timetables, and set up automated reminders
              </p>
            </div>
            
            {/* Success Message */}
            {showSuccess && (
              <Card className="bg-[#D1FAE5] border-[var(--color-success)]">
                <div className="flex items-center gap-[var(--space-md)]">
                  <CheckCircle className="w-6 h-6 text-[var(--color-success)]" />
                  <p className="font-bold text-[#065F46]">Settings saved successfully!</p>
                </div>
              </Card>
            )}
            
            {/* Module Selection */}
            <Card>
              <Select
                label="Select Module"
                options={moduleOptions}
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                fullWidth
              />
              
              {module && (
                <>
                  <div className="mt-[var(--space-lg)] p-[var(--space-lg)] bg-[var(--color-bg-main)] rounded-lg">
                    <h3 className="font-bold text-[var(--color-text-primary)] mb-[var(--space-md)]">Module Information</h3>
                    <div className="grid grid-cols-2 gap-[var(--space-md)] text-[var(--font-size-small)]">
                      <div>
                        <span className="text-[var(--color-text-secondary)]">Academic Year:</span>
                        <span className="ml-2 font-medium">{module.academicYear}</span>
                      </div>
                      <div>
                        <span className="text-[var(--color-text-secondary)]">Semester:</span>
                        <span className="ml-2 font-medium">{module.semester}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[var(--color-text-secondary)]">Sub-Coordinator:</span>
                        <span className="ml-2 font-medium">{module.subCoordinator || 'Not assigned'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Assigned Lecturers */}
                  {module.lecturers.length > 0 && (
                    <div className="mt-[var(--space-lg)] p-[var(--space-lg)] bg-[var(--color-bg-main)] rounded-lg">
                      <h3 className="font-bold text-[var(--color-text-primary)] mb-[var(--space-md)]">
                        Assigned Lecturers ({module.lecturers.length})
                      </h3>
                      <div className="space-y-[var(--space-sm)]">
                        {module.lecturers.map((lecturer, index) => (
                          <div 
                            key={index}
                            className="flex items-center justify-between p-[var(--space-md)] bg-white rounded-lg"
                          >
                            <div className="flex items-center gap-[var(--space-md)]">
                              <div className="w-8 h-8 bg-[var(--color-primary)] rounded-full flex items-center justify-center text-white font-bold">
                                {lecturer.charAt(0)}
                              </div>
                              <span className="font-medium text-[var(--color-text-primary)]">{lecturer}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </Card>
            
            {/* Student Timetable Upload */}
            <Card>
              <div className="flex items-center gap-[var(--space-md)] mb-[var(--space-lg)]">
                <Upload className="w-6 h-6 text-[var(--color-primary)]" />
                <div>
                  <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)]">
                    Student Timetable
                  </h2>
                  <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)]">
                    Upload the fixed weekly student schedule to check for conflicts
                  </p>
                </div>
              </div>
              
              <FileUpload
                label="Upload Timetable File"
                accept=".csv,.xlsx,.xls"
                maxSize={5}
                onChange={setTimetableFile}
                helperText="Accepted formats: CSV, Excel (Max 5MB)"
              />
              
              {timetableFile && (
                <div className="mt-[var(--space-md)]">
                  <Button variant="primary" size="md">
                    Process & Validate Timetable
                  </Button>
                </div>
              )}
              
              <div className="mt-[var(--space-lg)] p-[var(--space-lg)] bg-[#DBEAFE] rounded-lg">
                <p className="text-[var(--font-size-small)] text-[#1E40AF]">
                  <strong>Required Format:</strong> CSV or Excel with columns: Day, Start Time, End Time, Subject
                </p>
                <p className="text-[var(--font-size-small)] text-[#1E40AF] mt-2">
                  Example: Monday, 08:00, 10:00, Mathematics
                </p>
              </div>
            </Card>
            
            {/* Default Schedule Settings */}
            <Card>
              <div className="flex items-center gap-[var(--space-md)] mb-[var(--space-lg)]">
                <Clock className="w-6 h-6 text-[var(--color-primary)]" />
                <div>
                  <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)]">
                    Default Weekly Schedule
                  </h2>
                  <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)]">
                    Set the default day and time for weekly lectures
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--space-lg)]">
                <Select
                  label="Default Day"
                  options={dayOptions}
                  value={defaultDay}
                  onChange={(e) => setDefaultDay(e.target.value)}
                  fullWidth
                  helperText="The usual day of the week for this module"
                />
                
                <Input
                  label="Default Time"
                  type="time"
                  value={defaultTime}
                  onChange={(e) => setDefaultTime(e.target.value)}
                  fullWidth
                  helperText="The usual start time for lectures"
                />
                
                <Input
                  label="Default End Time"
                  type="time"
                  value={defaultEndTime}
                  onChange={(e) => setDefaultEndTime(e.target.value)}
                  fullWidth
                  helperText="The usual end time for lectures"
                />
              </div>
            </Card>
            
            {/* Reminder Settings */}
            <Card>
              <div className="flex items-center gap-[var(--space-md)] mb-[var(--space-lg)]">
                <Clock className="w-6 h-6 text-[var(--color-primary)]" />
                <div>
                  <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)]">
                    Automated Reminders
                  </h2>
                  <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)]">
                    Configure when lecturers receive session reminders
                  </p>
                </div>
              </div>
              
              <Select
                label="Send Reminder"
                options={reminderOptions}
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                fullWidth
                helperText="Lecturers will receive email and WhatsApp notifications before each session"
              />
              
              <div className="mt-[var(--space-lg)]">
                <label
                  htmlFor="reminderContent"
                  className="text-[var(--font-size-small)] font-medium text-[var(--color-text-primary)] block mb-[var(--space-sm)]"
                >
                  Reminder Message Template
                </label>
                <textarea
                  id="reminderContent"
                  rows={10}
                  value={reminderContent}
                  onChange={(e) => setReminderContent(e.target.value)}
                  placeholder="Enter reminder message template"
                  className="w-full px-[var(--space-md)] py-[var(--space-sm)] border border-[#CBD5E1] rounded-lg text-[var(--font-size-body)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-opacity-20 resize-vertical font-mono"
                />
                <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] mt-[var(--space-sm)]">
                  Available placeholders: [Lecturer Name], [Module Code], [Module Name], [Date], [Start Time], [End Time], [Location]
                </p>
              </div>
              
              <div className="mt-[var(--space-lg)] p-[var(--space-lg)] bg-[var(--color-bg-sidebar)] rounded-lg">
                <h3 className="font-bold text-[var(--color-text-primary)] mb-[var(--space-sm)]">
                  Reminder Preview
                </h3>
                <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)]">
                  Lecturers will receive:
                </p>
                <ul className="mt-[var(--space-sm)] space-y-1 text-[var(--font-size-small)] list-disc list-inside">
                  <li className="text-[var(--color-text-secondary)]">
                    Email notification {reminderTime} hours before the session
                  </li>
                  <li className="text-[var(--color-text-secondary)]">
                    WhatsApp message with session details and location/Zoom link
                  </li>
                  <li className="text-[var(--color-text-secondary)]">
                    Automatic calendar invitation with meeting details
                  </li>
                </ul>
              </div>
            </Card>
            
            {/* Save Actions */}
            <div className="flex items-center gap-[var(--space-md)]">
              <Button
                variant="primary"
                size="lg"
                onClick={handleSaveSettings}
              >
                Save All Settings
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => onNavigate('sub-dashboard')}
              >
                Cancel
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}