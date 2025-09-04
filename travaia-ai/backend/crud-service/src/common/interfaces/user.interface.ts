import type { Timestamp } from '@google-cloud/firestore';

// Firestore Timestamp or ISO string representation
export type DateTime = Timestamp | string;

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  createdAt: DateTime;
  updatedAt: DateTime;
}
