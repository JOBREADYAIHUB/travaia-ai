import type { Timestamp } from '@google-cloud/firestore';

// Firestore Timestamp or ISO string representation
export type DateTime = Timestamp | string;

export type JobApplicationStatus =
  | 'Applied'
  | 'Interviewing'
  | 'Offer'
  | 'Rejected'
  | 'Hired';

export interface JobApplication {
  id: string;
  userId: string; // reference to User.id
  jobTitle: string;
  company: string;
  status: JobApplicationStatus | string;
  dateApplied: DateTime;
  notes?: string;
  jobLink?: string;
  resumeVersion?: string;
  createdAt: DateTime;
  updatedAt: DateTime;
}
