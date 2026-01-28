// Mock data for the Lectra application

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'main-coordinator' | 'sub-coordinator' | 'lecturer' | 'staff';
  phone?: string;
  address?: string;
}

export interface Module {
  id: string;
  name: string;
  code: string;
  academicYear: string;
  semester: string;
  subCoordinator?: string;
  lecturers: string[];
  defaultDay?: string;
  defaultTime?: string;
}

export interface Session {
  id: string;
  moduleId: string;
  moduleCode: string;
  moduleName: string;
  lecturerId: string;
  lecturerName: string;
  date: string;
  time: string;
  endTime: string; // Added end time
  duration: number; // in hours
  location: string;
  status: 'scheduled' | 'completed' | 'rescheduled' | 'cancelled';
  attended?: boolean;
  topicsCovered?: string;
  originalDate?: string;
  originalTime?: string;
}

export interface RescheduleRequest {
  id: string;
  sessionId: string;
  moduleCode: string;
  moduleName: string;
  lecturerName: string;
  currentDate: string;
  currentTime: string;
  requestedDate: string;
  requestedTime: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
}

export interface LecturerProfile {
  userId: string;
  bankName?: string;
  accountNumber?: string;
  nicNumber?: string; // Changed from file upload to number
  cvUploaded: boolean;
  cvFileName?: string;
}

export interface StudentTimetableSlot {
  day: string;
  startTime: string;
  endTime: string;
  subject: string;
}

// Mock users
export const mockUsers: User[] = [
  {
    id: '1',
    email: 'main.coordinator@university.edu',
    name: 'Dr. Sarah Johnson',
    role: 'main-coordinator',
    phone: '+94 77 123 4567',
  },
  {
    id: '2',
    email: 'sub.coordinator@university.edu',
    name: 'Mr. Rajesh Kumar',
    role: 'sub-coordinator',
    phone: '+94 77 234 5678',
  },
  {
    id: '3',
    email: 'lecturer1@example.com',
    name: 'Dr. Ruwan Wickramarachchi',
    role: 'lecturer',
    phone: '+94 77 345 6789',
    address: '123 Main Street, Colombo',
  },
  {
    id: '4',
    email: 'lecturer2@example.com',
    name: 'Prof. Janaka Wijayanayake',
    role: 'lecturer',
    phone: '+94 77 456 7890',
    address: '456 Park Avenue, Kandy',
  },
  {
    id: '5',
    email: 'staff@university.edu',
    name: 'Ms. Priya Silva',
    role: 'staff',
    phone: '+94 77 567 8901',
  },
];

// Mock modules
export const mockModules: Module[] = [
  {
    id: '1',
    name: 'Software Architecture',
    code: 'INTE 11123',
    academicYear: '2025/2026',
    semester: 'Semester 1',
    subCoordinator: 'Mr. Rajesh Kumar',
    lecturers: ['Dr. Ruwan Wickramarachchi', 'Prof. Janaka Wijayanayake'],
    defaultDay: 'Wednesday',
    defaultTime: '10:00',
  },
  {
    id: '2',
    name: 'Database Systems',
    code: 'COSC 2203',
    academicYear: '2025/2026',
    semester: 'Semester 1',
    subCoordinator: 'Mr. Rajesh Kumar',
    lecturers: ['Dr. Ruwan Wickramarachchi'],
    defaultDay: 'Friday',
    defaultTime: '14:00',
  },
  {
    id: '3',
    name: 'Machine Learning',
    code: 'COSC 3301',
    academicYear: '2025/2026',
    semester: 'Semester 2',
    lecturers: [],
  },
  {
    id: '4',
    name: 'Cloud Computing',
    code: 'INTE 4405',
    academicYear: '2025/2026',
    semester: 'Semester 2',
    subCoordinator: 'Mr. Rajesh Kumar',
    lecturers: ['Dr. Ruwan Wickramarachchi'],
    defaultDay: 'Monday',
    defaultTime: '08:00',
  },
];

// Mock sessions
export const mockSessions: Session[] = [
  {
    id: '1',
    moduleId: '1',
    moduleCode: 'INTE 11123',
    moduleName: 'Software Architecture',
    lecturerId: '3',
    lecturerName: 'Dr. Ruwan Wickramarachchi',
    date: '2026-01-28', // Wednesday
    time: '10:00',
    endTime: '12:00',
    duration: 2,
    location: 'Room 301 / Zoom: https://zoom.us/j/123456',
    status: 'scheduled',
  },
  {
    id: '2',
    moduleId: '1',
    moduleCode: 'INTE 11123',
    moduleName: 'Software Architecture',
    lecturerId: '4',
    lecturerName: 'Prof. Janaka Wijayanayake',
    date: '2026-01-29', // Thursday
    time: '14:00',
    endTime: '16:00',
    duration: 2,
    location: 'Room 302',
    status: 'scheduled',
  },
  {
    id: '3',
    moduleId: '2',
    moduleCode: 'COSC 2203',
    moduleName: 'Database Systems',
    lecturerId: '3',
    lecturerName: 'Dr. Ruwan Wickramarachchi',
    date: '2026-01-24', // Past
    time: '14:00',
    endTime: '16:00',
    duration: 2,
    location: 'Room 401',
    status: 'completed',
    attended: true,
    topicsCovered: 'Introduction to Relational Databases, SQL Basics, Table Design',
  },
  {
    id: '4',
    moduleId: '1',
    moduleCode: 'INTE 11123',
    moduleName: 'Software Architecture',
    lecturerId: '3',
    lecturerName: 'Dr. Ruwan Wickramarachchi',
    date: '2026-01-21', // Past
    time: '10:00',
    endTime: '12:00',
    duration: 2,
    location: 'Room 301',
    status: 'completed',
    attended: true,
    topicsCovered: 'Design Patterns: Singleton, Factory, Observer',
  },
  // NEW SESSIONS FOR TESTING
  {
    id: '5',
    moduleId: '4',
    moduleCode: 'INTE 4405',
    moduleName: 'Cloud Computing',
    lecturerId: '3', // Dr. Ruwan
    lecturerName: 'Dr. Ruwan Wickramarachchi',
    date: '2026-01-26', // Monday
    time: '08:00',
    endTime: '10:00',
    duration: 2,
    location: 'Lab 2',
    status: 'scheduled',
  },
  {
    id: '6',
    moduleId: '4',
    moduleCode: 'INTE 4405',
    moduleName: 'Cloud Computing',
    lecturerId: '3', // Dr. Ruwan
    lecturerName: 'Dr. Ruwan Wickramarachchi',
    date: '2026-02-02', // Next Monday
    time: '08:00',
    endTime: '10:00',
    duration: 2,
    location: 'Lab 2',
    status: 'scheduled',
  },
  {
    id: '7',
    moduleId: '2',
    moduleCode: 'COSC 2203',
    moduleName: 'Database Systems',
    lecturerId: '3', // Dr. Ruwan
    lecturerName: 'Dr. Ruwan Wickramarachchi',
    date: '2026-01-30', // Friday
    time: '14:00',
    endTime: '16:00',
    duration: 2,
    location: 'Room 401',
    status: 'scheduled',
  },
];

// Mock reschedule requests
export const mockRescheduleRequests: RescheduleRequest[] = [
  {
    id: '1',
    sessionId: '1',
    moduleCode: 'INTE 11123',
    moduleName: 'Software Architecture',
    lecturerName: 'Dr. Ruwan Wickramarachchi',
    currentDate: '2026-01-28',
    currentTime: '10:00',
    requestedDate: '2026-01-30',
    requestedTime: '09:00',
    status: 'pending',
    reason: 'Personal commitment conflict',
  },
];

// Mock lecturer profiles
export const mockLecturerProfiles: LecturerProfile[] = [
  {
    userId: '3',
    bankName: 'Bank of Ceylon',
    accountNumber: '123456789',
    nicNumber: '123456789V',
    cvUploaded: true,
    cvFileName: 'Emily_Chen_CV.pdf',
  },
  {
    userId: '4',
    bankName: 'Commercial Bank',
    accountNumber: '987654321',
    nicNumber: '987654321V',
    cvUploaded: true,
    cvFileName: 'Michael_Brown_CV.pdf',
  },
];

// Mock student timetable (fixed weekly schedule)
export const mockStudentTimetable: StudentTimetableSlot[] = [
  { day: 'Monday', startTime: '08:00', endTime: '10:00', subject: 'Mathematics' },
  { day: 'Monday', startTime: '10:00', endTime: '12:00', subject: 'Physics' },
  { day: 'Monday', startTime: '14:00', endTime: '16:00', subject: 'Chemistry' },
  { day: 'Tuesday', startTime: '08:00', endTime: '10:00', subject: 'English' },
  { day: 'Tuesday', startTime: '13:00', endTime: '15:00', subject: 'Biology' },
  { day: 'Wednesday', startTime: '08:00', endTime: '10:00', subject: 'History' },
  { day: 'Wednesday', startTime: '13:00', endTime: '15:00', subject: 'Geography' },
  { day: 'Thursday', startTime: '09:00', endTime: '11:00', subject: 'Programming Lab' },
  { day: 'Thursday', startTime: '14:00', endTime: '16:00', subject: 'Data Structures' },
  { day: 'Friday', startTime: '08:00', endTime: '10:00', subject: 'Statistics' },
  { day: 'Friday', startTime: '10:00', endTime: '12:00', subject: 'Economics' },
];

// Helper functions
export const getUserById = (id: string): User | undefined => {
  return mockUsers.find(u => u.id === id);
};

export const getUserByEmail = (email: string): User | undefined => {
  return mockUsers.find(u => u.email === email);
};

export const getModuleById = (id: string): Module | undefined => {
  return mockModules.find(m => m.id === id);
};

export const getSessionsByLecturerId = (lecturerId: string): Session[] => {
  const specificSessions = mockSessions.filter(s => s.lecturerId === lecturerId);
  // Return specific sessions if found, otherwise return ALL mock sessions for testing "any" lecturer
  return specificSessions.length > 0 ? specificSessions : mockSessions;
};

export const getUpcomingSessions = (): Session[] => {
  const today = new Date();
  return mockSessions.filter(s => {
    const sessionDate = new Date(s.date);
    return sessionDate >= today && s.status === 'scheduled';
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export const getLecturerProfile = (userId: string): LecturerProfile | undefined => {
  return mockLecturerProfiles.find(p => p.userId === userId);
};