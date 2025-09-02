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
  // limit, // Not used in provided code, uncomment if needed later
  // WriteBatch, // Not used in provided code, uncomment if needed later
  // writeBatch // Not used in provided code, uncomment if needed later
} from 'firebase/firestore';
// Storage interaction for file deletion and uploads
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { updateProfile as firebaseAuthUpdateProfile } from 'firebase/auth'; // Correct import for v9+
import {
  JobApplication,
  Resume,
  // CoverLetter, // @google/genai: CoverLetter type is removed (commented out)
  Document as AppDocument,
  UserProfile,
  ResumeTemplate,
  ResumeCategory,
  MockInterviewSession, // Added MockInterviewSession
  TranscriptEntry, // Added TranscriptEntry for processing
} from './types';

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
    const q = query(
      collection(db, collectionName),
      where('userId', '==', currentUserId),
    );
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map((docSnap) => {
      const docData = docSnap.data();
      // Ensure date fields that should be strings are strings
      if (collectionName === 'jobApplications') {
        // FIX: Robust check for Timestamp to string conversion for applicationDate
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
          // Attempt to parse if it's a non-standard string date
          const d = new Date(docData.applicationDate);
          if (!isNaN(d.getTime())) {
            docData.applicationDate = d.toISOString().split('T')[0];
          } else {
            docData.applicationDate = ''; // Invalid date string
          }
        }
        // FIX: Robust check for Timestamp to string conversion for reminderDate
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
            docData.reminderDate = ''; // Invalid date string
          }
        }
      }
      if (collectionName === 'documents') {
        // FIX: Robust check for Timestamp to string conversion for uploadDate
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
            docData.uploadDate = ''; // Invalid date string
          }
        }
      }
      // @google/genai: Removed coverLetters from this condition as CoverLetter type and related logic are removed
      // FIX: Correct handling for lastModified in resumes
      if (collectionName === 'resumes') {
        // FIX: Robust check for Timestamp to string conversion for lastModified
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
            docData.lastModified = new Date(0).toISOString(); // Invalid date string, fallback
          }
        }
      }
      // FIX: Correct handling for transcript timestamps in mockInterviewSessions
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
                : new Date().toISOString(); // Fallback to now if invalid
            } else if (typeof entry.timestamp === 'number') {
              // Assuming epoch milliseconds
              newTimestamp = new Date(entry.timestamp).toISOString();
            } else if (entry.timestamp instanceof Date) {
              // Handle if it's already a Date object
              newTimestamp = entry.timestamp.toISOString();
            } else {
              newTimestamp = new Date().toISOString(); // Default fallback for unexpected types
            }
            return { ...entry, timestamp: newTimestamp };
          },
        );
      }
      return { id: docSnap.id, ...docData } as T;
    });

    // FIX: Ensure robust sorting by date, handling potential Timestamps or ISO strings
    if (data.length > 0) {
      data.sort((a: any, b: any) => {
        const getComparableDate = (dateValue: any): Date => {
          if (dateValue?.toDate) return dateValue.toDate(); // Firestore Timestamp
          if (dateValue && typeof dateValue === 'string') {
            const parsedDate = new Date(dateValue);
            if (!isNaN(parsedDate.getTime())) return parsedDate;
          }
          return new Date(0); // Fallback for invalid or missing dates
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
  try {
    const docRef = doc(db, collectionName, docId);
    // FIX: Ensure data being updated does not include userId or id again if they are part of TData from spread
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

// --- JobApplication specific functions ---
export const addJobApplication = (
  userId: string,
  appData: Omit<JobApplication, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
) =>
  addUserSpecificDocument<
    Omit<JobApplication, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
    JobApplication
  >(userId, 'jobApplications', appData);

export const updateJobApplication = (
  userId: string,
  appId: string,
  appData: Partial<
    Omit<JobApplication, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  >,
) =>
  updateUserSpecificDocument<
    Partial<Omit<JobApplication, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  >(userId, 'jobApplications', appId, appData);

export const deleteJobApplication = (userId: string, appId: string) =>
  deleteUserSpecificDocument(userId, 'jobApplications', appId);

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

/* // @google/genai: CoverLetter specific functions commented out as CoverLetter type is removed
// --- CoverLetter specific functions ---
// export const addCoverLetterVersion = (userId: string, clData: Omit<CoverLetter, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) =>
//   addUserSpecificDocument<Omit<CoverLetter, 'id' | 'userId' | 'createdAt' | 'updatedAt'>, CoverLetter>(userId, 'coverLetters', clData);

// export const updateCoverLetterVersion = (userId: string, clId: string, clData: Partial<Omit<CoverLetter, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) =>
//   updateUserSpecificDocument<Partial<Omit<CoverLetter, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>>(userId, 'coverLetters', clId, clData);

// export const deleteCoverLetterVersion = (userId: string, clId: string) =>
//   deleteUserSpecificDocument(userId, 'coverLetters', clId);
*/

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
          // FIX: Use ref(storage, URL) for Firebase Storage download URLs
          const storageFileRef = ref(storage, docData.fileUrl);
          await deleteObject(storageFileRef);
        } catch (storageError: any) {
          // FIX: Do not re-throw if object not found, just proceed to delete metadata
          if (storageError.code !== 'storage/object-not-found') {
            console.warn(
              'Could not delete file from storage (it might be already deleted or URL was a placeholder):',
              storageError.message,
            );
            // Optionally re-throw if it's critical and not 'object-not-found'
            // throw storageError;
          }
        }
      }
    }
    // Proceed to delete metadata even if file was already gone or URL was bad
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
    // FIX: Sanitize filename for storage path
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

// --- MockInterviewSession specific functions ---
// FIX: Ensure addMockInterviewSession is exported
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

// FIX: Ensure fetchMockInterviewSession is exported
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
      // Convert Timestamps back to Date strings for transcript for frontend if necessary
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
            // Assuming epoch milliseconds
            newTimestamp = new Date(entry.timestamp).toISOString();
          } else if (entry.timestamp instanceof Date) {
            // Handle if it's already a Date object
            newTimestamp = entry.timestamp.toISOString();
          } else {
            // Default fallback for unexpected types
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

// --- Global Data Operations (Top-Level Collections, No userId filter) ---

export const fetchGlobalCollection = async <T extends { id: string }>(
  collectionName: string,
): Promise<T[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map(
      (docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as T,
    );
  } catch (error) {
    console.error(
      `Error fetching global ${collectionName} from Firestore:`,
      error,
    );
    throw error;
  }
};

export const fetchResumeTemplates = (): Promise<ResumeTemplate[]> => {
  return fetchGlobalCollection<ResumeTemplate>('templates');
};

export const fetchResumeCategories = (): Promise<ResumeCategory[]> => {
  return fetchGlobalCollection<ResumeCategory>('categories');
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
    // FIX: Clean up uid if it's part of profileData to avoid writing it inside the doc
    if ('uid' in dataToSet) delete (dataToSet as any).uid;

    const docSnap = await getDoc(userDocRef);
    if (!docSnap.exists()) {
      dataToSet.createdAt = Timestamp.now(); // Set createdAt only if document is new
    }

    await setDoc(userDocRef, dataToSet, { merge: true });
  } catch (error) {
    console.error(`Error updating user profile for ${userId}:`, error);
    throw error;
  }
};

export const uploadUserAvatar = async (
  userId: string,
  file: File,
): Promise<string> => {
  if (!userId) throw new Error('User not authenticated for uploading avatar.');
  try {
    // FIX: Sanitize filename for storage path
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `users/${userId}/avatars/${Date.now()}-${sanitizedFileName}`;
    const storageRef = ref(storage, filePath);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    // Update Firestore user profile document
    await updateUserProfileDocument(userId, { avatarUrl: downloadURL });

    // Update Firebase Auth user profile
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
