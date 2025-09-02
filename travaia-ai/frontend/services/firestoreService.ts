// NOTE: 'FirebaseError: Missing or insufficient permissions' errors are backend/Firestore security rule configuration issues, not frontend code bugs. Please review Firebase Firestore security rules in the Firebase console.
import { db, storage, auth } from '../firebaseConfig';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { updateProfile as firebaseAuthUpdateProfile } from 'firebase/auth';
import {
  JobApplication,
  Resume,
  Document as AppDocument,
  UserProfile,
  ResumeTemplate,
  ResumeCategory,
  MockInterviewSession,
  TranscriptEntry,
} from '../types';

// Helper to get Firebase ID token with refresh
const getFirebaseIdToken = async (): Promise<string | null> => {
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      // Force token refresh to ensure we have a fresh token
      const token = await currentUser.getIdToken(true);
      console.log('Firestore service: Token refreshed successfully for user:', currentUser.uid);
      
      // Verify token is valid by checking its structure
      if (!token || token.length < 10) {
        throw new Error('Invalid token received');
      }
      
      // Mark authentication as initialized
      localStorage.setItem('auth_initialized', 'true');
      localStorage.setItem('last_auth_time', Date.now().toString());
      
      return token;
    } catch (error) {
      console.error('Firestore service: Token refresh failed:', error);
      throw new Error('Authentication failed. Please log in again.');
    }
  }
  return null;
};

// Helper function to validate user authorization for operations
const validateUserAuthorization = (requestedUserId: string): void => {
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    throw new Error('User not authenticated');
  }
  
  if (currentUser.uid !== requestedUserId) {
    console.error('Authorization mismatch:', {
      authenticatedUser: currentUser.uid,
      requestedUser: requestedUserId
    });
    throw new Error('Unauthorized: Cannot perform this operation for another user');
  }
};

// --- User-Specific Data Operations (Top-Level Collections with userId field) ---

export const fetchUserSectionData = async <
  T extends { id: string; userId: string },
>(
  currentUserId: string | null,
  collectionName: string,
): Promise<T[]> => {
  if (!currentUserId) {
    console.warn(
      `fetchUserSectionData: No currentUserId provided for ${collectionName}. Returning empty array. Ensure user is authenticated.`,
    );
    return [];
  }

  try {
    // Directly get the current user from Firebase Auth
    const currentUser = auth.currentUser;
    
    // Debug information
    console.log('Current auth state:', { 
      authCurrentUser: currentUser?.uid, 
      requestedUserId: currentUserId,
      emailVerified: currentUser?.emailVerified,
      providerId: currentUser?.providerId,
      tokenValid: !!currentUser && await currentUser.getIdTokenResult()
        .then(result => {
          console.log('Token expiration time:', new Date(result.expirationTime));
          return true;
        })
        .catch(err => {
          console.error('Error getting token result:', err);
          return false;
        })
    });
    
    // Force token refresh without validation
    if (currentUser) {
      try {
        const token = await currentUser.getIdToken(true);
        console.log(`Token refreshed successfully for fetching ${collectionName}. Token length:`, token.length);
      } catch (tokenError) {
        console.error('Token refresh failed:', tokenError);
      }
    } else {
      console.warn('Cannot refresh token: No current user');
    }
    
    // Log Firebase auth and collection information for debugging
    console.log('Firebase auth initialized:', !!auth);
    console.log('Collection being accessed:', collectionName);
    
    // Special case for job applications using hierarchical model
    let q;
    if (collectionName === 'jobApplications') {
      console.log('Using hierarchical path for job applications');
      q = collection(db, 'users', currentUserId, 'jobApplications');
    } else {
      // All other collections still use the flat model with userId field
      q = query(
        collection(db, collectionName),
        where('userId', '==', currentUserId),
      );
    }
    
    console.log(`Executing query for ${collectionName} with userId filter:`, currentUserId);
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map((docSnap) => {
      const docData = docSnap.data();
      // Ensure date fields that should be strings are strings
      if (collectionName === 'jobApplications') {
        if (
          docData.applicationDate &&
          typeof (docData.applicationDate as Timestamp)?.toDate === 'function'
        ) {
          docData.applicationDate = (docData.applicationDate as Timestamp)
            .toDate()
            .toISOString()
            .split('T')[0];
        } else if (
          docData.applicationDate &&
          typeof docData.applicationDate === 'string' &&
          !/^\d{4}-\d{2}-\d{2}$/.test(docData.applicationDate)
        ) {
          const d = new Date(docData.applicationDate);
          if (!isNaN(d.getTime())) {
            docData.applicationDate = d.toISOString().split('T')[0];
          } else {
            docData.applicationDate = '';
          }
        }
        if (
          docData.reminderDate &&
          typeof (docData.reminderDate as Timestamp)?.toDate === 'function'
        ) {
          docData.reminderDate = (docData.reminderDate as Timestamp)
            .toDate()
            .toISOString()
            .split('T')[0];
        } else if (
          docData.reminderDate &&
          typeof docData.reminderDate === 'string' &&
          !/^\d{4}-\d{2}-\d{2}$/.test(docData.reminderDate)
        ) {
          const d = new Date(docData.reminderDate);
          if (!isNaN(d.getTime())) {
            docData.reminderDate = d.toISOString().split('T')[0];
          } else {
            docData.reminderDate = '';
          }
        }
      }
      if (collectionName === 'documents') {
        if (
          docData.uploadDate &&
          typeof (docData.uploadDate as Timestamp)?.toDate === 'function'
        ) {
          docData.uploadDate = (docData.uploadDate as Timestamp)
            .toDate()
            .toISOString()
            .split('T')[0];
        } else if (
          docData.uploadDate &&
          typeof docData.uploadDate === 'string' &&
          !/^\d{4}-\d{2}-\d{2}$/.test(docData.uploadDate)
        ) {
          const d = new Date(docData.uploadDate);
          if (!isNaN(d.getTime())) {
            docData.uploadDate = d.toISOString().split('T')[0];
          } else {
            docData.uploadDate = '';
          }
        }
      }
      if (collectionName === 'resumes') {
        if (
          docData.lastModified &&
          typeof (docData.lastModified as Timestamp)?.toDate === 'function'
        ) {
          docData.lastModified = (docData.lastModified as Timestamp)
            .toDate()
            .toISOString();
        } else if (
          docData.lastModified &&
          typeof docData.lastModified === 'string'
        ) {
          const d = new Date(docData.lastModified);
          if (!isNaN(d.getTime())) {
            docData.lastModified = d.toISOString();
          } else {
            docData.lastModified = new Date(0).toISOString();
          }
        }
      }
      if (collectionName === 'mockInterviewSessions' && docData.transcript) {
        docData.transcript = (docData.transcript as TranscriptEntry[]).map(
          (entry) => {
            let newTimestamp: string;
            if (entry.timestamp instanceof Timestamp) {
              newTimestamp = entry.timestamp.toDate().toISOString();
            } else if (typeof entry.timestamp === 'string') {
              const d = new Date(entry.timestamp);
              newTimestamp = !isNaN(d.getTime())
                ? d.toISOString()
                : new Date().toISOString();
            } else if (typeof entry.timestamp === 'number') {
              newTimestamp = new Date(entry.timestamp).toISOString();
            } else if (entry.timestamp instanceof Date) {
              newTimestamp = entry.timestamp.toISOString();
            } else {
              newTimestamp = new Date().toISOString();
            }
            return { ...entry, timestamp: newTimestamp };
          },
        );
      }
      return { id: docSnap.id, ...docData } as T;
    });

    if (data.length > 0) {
      data.sort((a: any, b: any) => {
        const getComparableDate = (dateValue: any): Date => {
          if (dateValue?.toDate) return dateValue.toDate();
          if (dateValue && typeof dateValue === 'string') {
            const parsedDate = new Date(dateValue);
            if (!isNaN(parsedDate.getTime())) return parsedDate;
          }
          return new Date(0);
        };
        const dateA = getComparableDate(a.updatedAt || a.createdAt);
        const dateB = getComparableDate(b.updatedAt || b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
    }
    return data;
  } catch (error) {
    console.error(
      `Error fetching user-specific ${collectionName} from Firestore for user ${currentUserId}:`,
      error,
    );
    throw error;
  }
};

const addUserSpecificDocument = async <
  TData extends object,
  TResult extends { id: string },
>(
  currentUserId: string,
  collectionName: string,
  data: TData,
): Promise<TResult> => {
  if (!currentUserId)
    throw new Error(`User not authenticated for adding to ${collectionName}.`);
  
  // Validate user authorization and refresh token
  validateUserAuthorization(currentUserId);
  await getFirebaseIdToken();
  
  try {
    const docDataWithUser = {
      ...data,
      userId: currentUserId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    const docRef = await addDoc(
      collection(db, collectionName),
      docDataWithUser,
    );
    return { id: docRef.id, ...docDataWithUser } as unknown as TResult;
  } catch (error) {
    console.error(
      `Error adding document to ${collectionName} in Firestore:`,
      error,
    );
    throw error;
  }
};

const updateUserSpecificDocument = async <TData extends object>(
  userId: string,
  collectionName: string,
  docId: string,
  data: TData,
): Promise<void> => {
  if (!userId)
    throw new Error(`User not authenticated for updating ${collectionName}.`);
  
  // Validate user authorization and refresh token
  validateUserAuthorization(userId);
  await getFirebaseIdToken();
  
  try {
    const docRef = doc(db, collectionName, docId);
    const { id: dataId, userId: dataUserId, ...updatePayload } = data as any;
    await updateDoc(docRef, { ...updatePayload, updatedAt: Timestamp.now() });
  } catch (error) {
    console.error(
      `Error updating document ${docId} in ${collectionName} for user ${userId} in Firestore:`,
      error,
    );
    throw error;
  }
};

const deleteUserSpecificDocument = async (
  userId: string,
  collectionName: string,
  docId: string,
): Promise<void> => {
  if (!userId)
    throw new Error(
      `User not authenticated for deleting from ${collectionName}.`,
    );
  
  // Validate user authorization and refresh token
  validateUserAuthorization(userId);
  await getFirebaseIdToken();
  
  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(
      `Error deleting document ${docId} from ${collectionName} for user ${userId} in Firestore:`,
      error,
    );
    throw error;
  }
};

// --- JobApplication specific functions (using hierarchical model) ---
export const addJobApplication = async (
  userId: string,
  appData: Omit<JobApplication, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
): Promise<JobApplication> => {
  if (!userId) {
    throw new Error('User not authenticated for adding job application');
  }
  
  try {
    // Validate authorization and refresh token
    validateUserAuthorization(userId);
    await getFirebaseIdToken();
    
    console.log('Adding job application for user:', userId);
    
    // Use hierarchical path: users/{userId}/jobApplications/{docId}
    const userJobAppsCollection = collection(db, 'users', userId, 'jobApplications');
    
    const dataToAdd = {
      ...appData,
      userId, // Still include userId for compatibility with existing code
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    const docRef = await addDoc(userJobAppsCollection, dataToAdd);
    console.log(`Job application added with ID: ${docRef.id}`);
    
    return {
      id: docRef.id,
      ...appData,
      userId,
      createdAt: dataToAdd.createdAt,
      updatedAt: dataToAdd.updatedAt,
    } as JobApplication;
  } catch (error) {
    console.error('Error in addJobApplication:', error);
    throw error;
  }
};

export const updateJobApplication = async (
  userId: string,
  appId: string,
  appData: Partial<
    Omit<JobApplication, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  >,
): Promise<void> => {
  if (!userId) {
    throw new Error('User not authenticated for updating job application');
  }
  
  try {
    // Validate authorization and refresh token
    validateUserAuthorization(userId);
    await getFirebaseIdToken();
    
    console.log('Updating job application:', appId, 'for user:', userId);
    
    // Use hierarchical path: users/{userId}/jobApplications/{docId}
    const jobAppDocRef = doc(db, 'users', userId, 'jobApplications', appId);
    
    const dataToUpdate = {
      ...appData,
      updatedAt: Timestamp.now(),
    };
    
    await updateDoc(jobAppDocRef, dataToUpdate);
    console.log(`Job application ${appId} updated successfully`);
  } catch (error) {
    console.error('Error in updateJobApplication:', error);
    throw error;
  }
};

export const deleteJobApplication = async (userId: string, appId: string): Promise<void> => {
  if (!userId) {
    throw new Error('User not authenticated for deleting job application');
  }
  
  try {
    // Validate authorization and refresh token
    validateUserAuthorization(userId);
    await getFirebaseIdToken();
    
    console.log('Deleting job application:', appId, 'for user:', userId);
    
    // Use hierarchical path: users/{userId}/jobApplications/{docId}
    const jobAppDocRef = doc(db, 'users', userId, 'jobApplications', appId);
    
    await deleteDoc(jobAppDocRef);
    console.log(`Job application ${appId} deleted successfully`);
  } catch (error) {
    console.error('Error in deleteJobApplication:', error);
    throw error;
  }
};

// --- Resume specific functions ---
export const addResumeVersion = (
  userId: string,
  resumeData: Omit<Resume, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
) =>
  addUserSpecificDocument<
    Omit<Resume, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
    Resume
  >(userId, 'resumes', resumeData);

export const updateResumeVersion = (
  userId: string,
  resumeId: string,
  resumeData: Partial<
    Omit<Resume, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  >,
) =>
  updateUserSpecificDocument<
    Partial<Omit<Resume, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  >(userId, 'resumes', resumeId, resumeData);

export const deleteResumeVersion = (userId: string, resumeId: string) =>
  deleteUserSpecificDocument(userId, 'resumes', resumeId);

// --- AppDocument (metadata) specific functions for 'documents' collection ---
const addDocumentMetaOnly = (
  userId: string,
  docMetaData: Omit<AppDocument, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
) =>
  addUserSpecificDocument<
    Omit<AppDocument, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
    AppDocument
  >(userId, 'documents', docMetaData);

export const updateDocumentMeta = (
  userId: string,
  docMetaId: string,
  docMetaData: Partial<
    Omit<AppDocument, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  >,
) =>
  updateUserSpecificDocument<
    Partial<Omit<AppDocument, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  >(userId, 'documents', docMetaId, docMetaData);

export const deleteDocumentMeta = async (
  userId: string,
  docMetaId: string,
): Promise<void> => {
  if (!userId)
    throw new Error('User ID is required to delete document metadata.');
  try {
    const docToDeleteRef = doc(db, 'documents', docMetaId);
    const docToDeleteSnap = await getDoc(docToDeleteRef);

    if (docToDeleteSnap.exists()) {
      const docData = docToDeleteSnap.data() as AppDocument;
      if (docData.userId !== userId) {
        console.warn(
          `User ${userId} attempted to delete document ${docMetaId} belonging to ${docData.userId}. Operation denied by frontend logic.`,
        );
        throw new Error("Permission denied to delete this document's file.");
      }
      if (
        docData.fileUrl &&
        docData.fileUrl.includes('firebasestorage.googleapis.com')
      ) {
        try {
          const storageFileRef = ref(storage, docData.fileUrl);
          await deleteObject(storageFileRef);
        } catch (storageError: any) {
          if (storageError.code !== 'storage/object-not-found') {
            console.warn(
              'Could not delete file from storage (it might be already deleted or URL was a placeholder):',
              storageError.message,
            );
          }
        }
      }
    }
    await deleteUserSpecificDocument(userId, 'documents', docMetaId);
  } catch (error) {
    console.error(
      `Error deleting document meta (ID: ${docMetaId}) and its file for user ${userId}:`,
      error,
    );
    throw error;
  }
};

export const uploadAppDocument = async (
  userId: string,
  file: File,
  metadata: Omit<
    AppDocument,
    | 'id'
    | 'userId'
    | 'fileUrl'
    | 'size'
    | 'uploadDate'
    | 'createdAt'
    | 'updatedAt'
  >,
): Promise<AppDocument> => {
  if (!userId)
    throw new Error('User not authenticated for uploading document.');
  try {
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `users/${userId}/documents/${Date.now()}-${sanitizedFileName}`;
    const storageRef = ref(storage, filePath);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    const docDataForMeta: Omit<
      AppDocument,
      'id' | 'userId' | 'createdAt' | 'updatedAt'
    > = {
      ...metadata,
      fileUrl: downloadURL,
      size: `${(file.size / (1024 * 1024)).toFixed(2)}MB`,
      uploadDate: new Date().toISOString().split('T')[0],
    };
    return addDocumentMetaOnly(userId, docDataForMeta);
  } catch (error) {
    console.error('Error uploading document for user', userId, ':', error);
    throw error;
  }
};

export const addMockInterviewSession = (
  userId: string,
  sessionData: Omit<
    MockInterviewSession,
    'id' | 'userId' | 'createdAt' | 'updatedAt'
  >,
): Promise<MockInterviewSession> => {
  const dataWithTimestamps = {
    ...sessionData,
    transcript: sessionData.transcript.map((entry) => ({
      ...entry,
      timestamp:
        entry.timestamp instanceof Date
          ? Timestamp.fromDate(entry.timestamp)
          : typeof entry.timestamp === 'string'
            ? Timestamp.fromDate(new Date(entry.timestamp))
            : entry.timestamp,
    })),
  };
  return addUserSpecificDocument<
    typeof dataWithTimestamps,
    MockInterviewSession
  >(userId, 'mockInterviewSessions', dataWithTimestamps);
};

export const fetchMockInterviewSession = async (
  userId: string,
  sessionId: string,
): Promise<MockInterviewSession | null> => {
  if (!userId || !sessionId) return null;
  const docRef = doc(db, 'mockInterviewSessions', sessionId);
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as MockInterviewSession;
      if (data.userId !== userId) {
        console.warn(
          `User ${userId} attempted to fetch session ${sessionId} belonging to another user.`,
        );
        return null;
      }
      if (data.transcript) {
        data.transcript = data.transcript.map((entry) => {
          let newTimestamp: string;
          if (entry.timestamp instanceof Timestamp) {
            newTimestamp = entry.timestamp.toDate().toISOString();
          } else if (typeof entry.timestamp === 'string') {
            const d = new Date(entry.timestamp);
            newTimestamp = !isNaN(d.getTime())
              ? d.toISOString()
              : new Date().toISOString();
          } else if (typeof entry.timestamp === 'number') {
            newTimestamp = new Date(entry.timestamp).toISOString();
          } else if (entry.timestamp instanceof Date) {
            newTimestamp = entry.timestamp.toISOString();
          } else {
            newTimestamp = new Date().toISOString();
          }
          return { ...entry, timestamp: newTimestamp };
        });
      }
      return { id: docSnap.id, ...data };
    }
    return null;
  } catch (error) {
    console.error(
      `Error fetching mock interview session ${sessionId} for user ${userId}:`,
      error,
    );
    throw error;
  }
};

// --- Global Data Operations (Now via Backend API) ---

const makeAuthenticatedApiCall = async <T>(endpoint: string): Promise<T> => {
  const token = await getFirebaseIdToken();
  // For global data, token might be optional on the backend, but sending if available.
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, { method: 'GET', headers });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      message: `Failed to fetch from ${endpoint}: ${response.statusText}`,
    }));
    throw new Error(
      errorData.message ||
        `Error ${response.status} from backend calling ${endpoint}.`,
    );
  }
  return response.json() as Promise<T>;
};

export const fetchResumeTemplates = (): Promise<ResumeTemplate[]> => {
  // This now calls a backend endpoint. The backend will handle fetching from Firestore.
  return makeAuthenticatedApiCall<ResumeTemplate[]>(
    '/api/global/resume-templates',
  );
};

export const fetchResumeCategories = (): Promise<ResumeCategory[]> => {
  // This now calls a backend endpoint.
  return makeAuthenticatedApiCall<ResumeCategory[]>(
    '/api/global/resume-categories',
  );
};

// --- User Profile Specific Operations (Operate on 'users' collection, docId is userId) ---

export const fetchUserProfileDocument = async (
  userId: string,
): Promise<UserProfile | null> => {
  if (!userId) return null;
  const userDocRef = doc(db, 'users', userId);
  try {
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      return { uid: userId, ...userDocSnap.data() } as UserProfile;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching user profile for ${userId}:`, error);
    throw error;
  }
};

export const updateUserProfileDocument = async (
  userId: string,
  profileData: Partial<UserProfile>,
): Promise<void> => {
  if (!userId)
    throw new Error('User ID is required to update profile document.');
  const userDocRef = doc(db, 'users', userId);
  try {
    const dataToSet: Partial<UserProfile> & {
      updatedAt: Timestamp;
      createdAt?: Timestamp;
    } = {
      ...profileData,
      updatedAt: Timestamp.now(),
    };
    if ('uid' in dataToSet) delete (dataToSet as any).uid;

    const docSnap = await getDoc(userDocRef);
    if (!docSnap.exists()) {
      dataToSet.createdAt = Timestamp.now();
    }

    await setDoc(userDocRef, dataToSet, { merge: true });
  } catch (error) {
    console.error(`Error updating user profile for ${userId}:`, error);
    throw error;
  }
};

// Alias for updateUserProfileDocument for backward compatibility
export const updateUserProfile = updateUserProfileDocument;

export const uploadUserAvatar = async (
  userId: string,
  file: File,
): Promise<string> => {
  if (!userId) throw new Error('User not authenticated for uploading avatar.');
  try {
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `users/${userId}/avatars/${Date.now()}-${sanitizedFileName}`;
    const storageRef = ref(storage, filePath);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    await updateUserProfileDocument(userId, { avatarUrl: downloadURL });

    const currentUserAuth = auth.currentUser;
    if (currentUserAuth && currentUserAuth.uid === userId) {
      await firebaseAuthUpdateProfile(currentUserAuth, {
        photoURL: downloadURL,
      });
    }
    return downloadURL;
  } catch (error) {
    console.error('Error uploading avatar for user', userId, ':', error);
    throw error;
  }
};
