export interface Version {
  versionId: string;
  storagePath: string;
  timestamp: string; // ISO 8601 format
  notes: string;
  previewUrl: string;
}

export interface Document {
  id: string;
  userId: string;
  name: string;
  category?: string;
  fileType: string;
  mimeType: string;
  originalFileName?: string;
  storagePath: string;
  previewUrl: string;
  size: number;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  versions: Version[];
  tags?: string[];
  associatedCompanies?: string[];
  associatedJobs?: string[];
  status?: string;
  notes?: string;
  jobApplicationId?: string;
  url?: string; // This seems to be legacy, replaced by previewUrl
}
