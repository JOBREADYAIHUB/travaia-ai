// Profile section types
export type ProfileSection = 'personal' | 'professional' | 'preferences' | 'goals' | 'achievements' | 'analytics' | 'settings';

// Option type for select and multi-select inputs
export interface Option {
  value: string;
  label: string;
}

// Achievement type
export interface Achievement {
  id?: string;
  title: string;
  description: string;
  icon?: string;
  progress?: number;
  completed?: boolean;
  date?: string;
}

// Analytics data
export interface Analytics {
  profileViews: number;
  searchAppearances: number;
  connectionsGrowth: number;
  skillsGrowth: number;
}

// Personal information section
export interface PersonalInfo {
  fullName: string;
  avatar?: string;
  bio?: string;
  location?: string;
  contactEmail?: string;
  phoneNumber?: string;
  socialLinks?: string[];
}

// Professional information section
export interface ProfessionalInfo {
  currentTitle?: string;
  skills?: string[];
  experience?: string;
  education?: string;
  certifications?: string[];
  languages?: string[];
}

// Job preferences section
export interface Preferences {
  jobTypes?: Option[];
  workStyles?: Option[];
  salaryExpectations?: string;
  remotePreference?: string;
  willingToRelocate?: boolean;
  preferredLocations?: string[];
}

// Career goals section
export interface Goals {
  careerAspirations?: string;
  shortTermGoals?: string;
  longTermGoals?: string;
  desiredIndustries?: string[];
  desiredCompanySize?: Option[];
  desiredCulture?: string;
}

// Settings section
export interface Settings {
  emailNotifications?: boolean;
  profileVisibility?: string;
  language?: string;
  darkMode?: boolean;
}

// Complete profile data
export interface ProfileData {
  uid?: string;
  personal: PersonalInfo;
  professional: ProfessionalInfo;
  preferences: Preferences;
  goals: Goals;
  achievements?: Achievement[];
  analytics?: Analytics;
  settings?: Settings;
  level?: number;
  xp?: number;
  badges?: string[];
  createdAt?: string;
  updatedAt?: string;
}

// Form field types by section
export interface ProfileFieldTypes {
  personal: {
    fullName: string;
    avatar: string;
    bio: string;
    location: string;
    contactEmail: string;
    phoneNumber: string;
    socialLinks: string[];
  };
  professional: {
    currentTitle: string;
    skills: string[];
    experience: string;
    education: string;
    certifications: string[];
    languages: string[];
  };
  preferences: {
    jobTypes: Option[];
    workStyles: Option[];
    salaryExpectations: string;
    remotePreference: string;
    willingToRelocate: boolean;
    preferredLocations: string[];
  };
  goals: {
    careerAspirations: string;
    shortTermGoals: string;
    longTermGoals: string;
    desiredIndustries: string[];
    desiredCompanySize: Option[];
    desiredCulture: string;
  };
  settings: {
    emailNotifications: boolean;
    profileVisibility: string;
    language: string;
    darkMode: boolean;
  };
}
