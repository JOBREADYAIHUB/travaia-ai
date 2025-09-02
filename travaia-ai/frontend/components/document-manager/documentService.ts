import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, collection, addDoc, updateDoc, deleteDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db as firestore } from '../../firebaseConfig';
import { Document } from '../../types';
import { v4 as uuidv4 } from 'uuid';

// Helper function to ensure token is fresh before operations
const ensureFreshToken = async (): Promise<string | null> => {
  const auth = getAuth();
  
  if (!auth.currentUser) {
    console.error('Document service: No authenticated user found');
    throw new Error('User not authenticated. Please log in to continue.');
  }

  try {
    // Force token refresh to ensure we have a fresh token
    const token = await auth.currentUser.getIdToken(true);
    console.log('Document service: Token refreshed successfully for user:', auth.currentUser.uid);
    
    // Verify token is valid by checking its structure
    if (!token || token.length < 10) {
      throw new Error('Invalid token received');
    }
    
    // Mark authentication as initialized
    localStorage.setItem('auth_initialized', 'true');
    localStorage.setItem('last_auth_time', Date.now().toString());
    
    return token;
  } catch (error) {
    console.error('Document service: Token refresh failed:', error);
    throw new Error('Authentication failed. Please log in again.');
  }
};

// Helper function to validate user authorization for document operations
const validateUserAuthorization = (requestedUserId: string): void => {
  const auth = getAuth();
  
  if (!auth.currentUser) {
    throw new Error('User not authenticated');
  }
  
  if (auth.currentUser.uid !== requestedUserId) {
    console.error('Authorization mismatch:', {
      authenticatedUser: auth.currentUser.uid,
      requestedUser: requestedUserId
    });
    throw new Error('Unauthorized: Cannot access documents for another user');
  }
};

// Upload document with metadata and handle versions
export const uploadDocumentWithMetadata = async (
  userId: string,
  file: File,
  metadata: Partial<Document>,
  onProgress?: (progress: number) => void
): Promise<Document> => {
  // Validate user authorization before any operation
  validateUserAuthorization(userId);
  
  // Always refresh token before any document operation
  await ensureFreshToken();
  
  console.log('Starting document upload for user:', userId, 'file:', file.name);
  try {
    const storage = getStorage();
    const timestamp = new Date().getTime();
    const fileExtension = file.name.split('.').pop() || '';
    const uniqueFileName = `${timestamp}_${uuidv4()}.${fileExtension}`;
    const storagePath = `users/${userId}/documents/${uniqueFileName}`;
    const storageRef = ref(storage, storagePath);

    // Upload file to Storage
    const uploadTask = uploadBytesResumable(storageRef, file);

    // Return promise that resolves when upload is complete
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(progress);
        },
        (error) => {
          console.error('Upload failed:', error);
          reject(error);
        },
        async () => {
          try {
            // Get download URL for preview
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

            // Prepare document metadata
            const docData: Omit<Document, 'id'> = {
              userId,
              name: metadata.name || file.name,
              fileType: metadata.fileType || fileExtension,
              mimeType: metadata.mimeType || file.type,
              originalFileName: metadata.originalFileName || file.name,
              storagePath,
              previewUrl: downloadURL,
              tags: metadata.tags || [],
              associatedCompanies: metadata.associatedCompanies || [],
              associatedJobs: metadata.associatedJobs || [],
              status: metadata.status || 'Draft',
              createdAt: new Date(),
              updatedAt: new Date(),
              versions: [
                {
                  versionId: uuidv4(),
                  storagePath,
                  timestamp: new Date().toISOString(),
                  notes: metadata.notes || 'Initial version',
                  previewUrl: downloadURL,
                }
              ],
              size: file.size,
            };

            // Save document metadata to Firestore
            const docRef = await addDoc(collection(firestore, `users/${userId}/documents`), docData);

            // Return complete document with id
            resolve({
              id: docRef.id,
              ...docData,
            } as Document);
          } catch (err) {
            console.error('Error saving document metadata:', err);
            reject(err);
          }
        }
      );
    });
  } catch (error) {
    console.error('Error in uploadDocumentWithMetadata:', error);
    throw error;
  }
};

// Fetch all documents for a user
export const fetchUserDocuments = async (userId: string): Promise<Document[]> => {
  // Validate user authorization before any operation
  validateUserAuthorization(userId);
  
  console.log('Fetching documents for user:', userId);
  try {
    // Always refresh token before operations to prevent authentication issues
    const freshToken = await ensureFreshToken();
    
    if (!freshToken) {
      console.error('Document service: Failed to refresh token for document fetch');
      throw new Error('Authentication error. Please log in again.');
    }
    
    console.log('Document service: Successfully refreshed token for document fetch');
    const auth = getAuth();
    
    // Create a wrapped Firestore operation that can handle token refresh automatically
    const executeFirestoreQueryWithRefresh = async () => {
      try {
        // Query Firestore for documents
        const docsQuery = query(
          collection(firestore, `users/${userId}/documents`)
        );
        
        console.log('Executing Firestore query with fresh token...');
        return await getDocs(docsQuery);
      } catch (error: any) {
        // If we get a permission error, try forcing a token refresh
        if (error.code === 'permission-denied' || error.message?.includes('permission')) {
          console.log('Permission denied, refreshing token and retrying...');
          await auth.currentUser!.getIdToken(true); // Force token refresh
          
          // Retry the query after token refresh
          const docsQuery = query(
            collection(firestore, `users/${userId}/documents`)
          );
          return await getDocs(docsQuery);
        }
        throw error; // Re-throw if not a permission error
      }
    };
    
    // Execute the query with automatic token refresh
    const querySnapshot = await executeFirestoreQueryWithRefresh();
    console.log(`Retrieved ${querySnapshot.docs.length} documents from Firestore`);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Document));
  } catch (error) {
    console.error('Error fetching documents:', error);
    
    // Provide more detailed error information for debugging
    if (error instanceof Error) {
      if (error.message.includes('permission-denied')) {
        console.error('This is likely a Firebase security rule issue - check that the user is properly authenticated');
      }
    }
    
    throw error;
  }
};

// Delete a document
export const deleteDocument = async (
  userId: string,
  docId: string
): Promise<void> => {
  // Validate user authorization before any operation
  validateUserAuthorization(userId);
  
  console.log('Deleting document for user:', userId, 'docId:', docId);
  // Always refresh token before operations to prevent authentication issues
  const freshToken = await ensureFreshToken();
  
  if (!freshToken) {
    console.error('Document service: Failed to refresh token for document deletion');
    throw new Error('Authentication error. Please log in again.');
  }
  
  console.log('Document service: Successfully refreshed token for document deletion');
  try {
    // Get current document data
    const docRef = doc(firestore, `users/${userId}/documents/${docId}`);
    const docSnap = await getDocs(query(collection(firestore, `users/${userId}/documents`), where('id', '==', docId)));
    
    if (docSnap.empty) {
      throw new Error('Document not found');
    }

    const docData = docSnap.docs[0].data() as Document;
    
    // Delete file from Storage
    const storage = getStorage();
    const fileRef = ref(storage, docData.storagePath);
    await deleteObject(fileRef);

    // Delete document metadata from Firestore
    // docRef is already defined above, reuse it
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

// Update document metadata
export const updateDocumentMetadata = async (
  userId: string, 
  docId: string, 
  updates: Partial<Document>,
  userToken?: string
): Promise<void> => {
  // Validate user authorization before any operation
  validateUserAuthorization(userId);
  
  console.log('Updating document metadata for user:', userId, 'docId:', docId);
  try {
    const auth = getAuth();
    
    // Ensure authentication is ready if a token is provided
    if (userToken && !auth.currentUser) {
      console.log('Refreshing authentication for document update');
      // Wait briefly for auth to catch up if needed
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Force token refresh to ensure we have the latest permissions
    if (auth.currentUser) {
      try {
        await auth.currentUser.getIdToken(true);
        console.log('Refreshed token for document update');
      } catch (refreshError) {
        console.warn('Token refresh failed:', refreshError);
      }
    }
    
    const docRef = doc(firestore, `users/${userId}/documents/${docId}`);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(), // Use ISO date instead of serverTimestamp
    });
  } catch (error) {
    console.error('Error updating document metadata:', error);
    throw error;
  }
};

// Upload a new version of an existing document
export const uploadNewDocumentVersion = async (
  userId: string,
  docId: string,
  file: File,
  versionNotes: string = '',
  onProgress?: (progress: number) => void,
  userToken?: string
): Promise<Document> => {
  // Ensure authentication is fresh
  if (userToken) {
    const auth = getAuth();
    if (auth.currentUser) {
      try {
        await auth.currentUser.getIdToken(true);
        console.log('Refreshed token for document version upload');
      } catch (refreshError) {
        console.warn('Token refresh failed:', refreshError);
      }
    }
  }
  try {
    const storage = getStorage();
    const timestamp = new Date().getTime();
    const fileExtension = file.name.split('.').pop() || '';
    const uniqueFileName = `${timestamp}_${uuidv4()}.${fileExtension}`;
    const storagePath = `users/${userId}/documents/${uniqueFileName}`;
    const storageRef = ref(storage, storagePath);

    // Upload file to Storage
    const uploadTask = uploadBytesResumable(storageRef, file);

    // Return promise that resolves when upload is complete
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(progress);
        },
        (error) => {
          console.error('Upload failed:', error);
          reject(error);
        },
        async () => {
          try {
            // Get download URL for preview
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

            // Get current document data
            const docRef = doc(firestore, `users/${userId}/documents/${docId}`);
            const docSnap = await getDocs(query(collection(firestore, `users/${userId}/documents`), where('id', '==', docId)));
            
            if (docSnap.empty) {
              throw new Error('Document not found');
            }

            const docData = docSnap.docs[0].data() as Document;
            
            // Create new version entry
            const newVersion = {
              versionId: uuidv4(),
              storagePath,
              timestamp: new Date().toISOString(),
              notes: versionNotes,
              previewUrl: downloadURL,
            };
            
            // Update document with new version
            await updateDoc(docRef, {
              storagePath, // Update to point to newest version
              previewUrl: downloadURL,
              updatedAt: serverTimestamp(),
              versions: [...(docData.versions || []), newVersion],
            });

            // Return updated document
            resolve({
              ...docData,
              storagePath,
              previewUrl: downloadURL,
              updatedAt: new Date(),
              versions: [...(docData.versions || []), newVersion],
            });
          } catch (err) {
            console.error('Error updating document with new version:', err);
            reject(err);
          }
        }
      );
    });
  } catch (error) {
    console.error('Error in uploadNewDocumentVersion:', error);
    throw error;
  }
};

// Revert to a specific version
export const revertToVersion = async (
  userId: string,
  docId: string,
  versionId: string,
  userToken?: string
): Promise<Document> => {
  try {
    // Ensure authentication is fresh
    if (userToken) {
      const auth = getAuth();
      if (auth.currentUser) {
        try {
          await auth.currentUser.getIdToken(true);
          console.log('Refreshed token for revert operation');
        } catch (refreshError) {
          console.warn('Token refresh failed:', refreshError);
        }
      }
    }
    
    // Get current document data
    const docRef = doc(firestore, `users/${userId}/documents/${docId}`);
    const docSnap = await getDocs(query(collection(firestore, `users/${userId}/documents`), where('id', '==', docId)));
    
    if (docSnap.empty) {
      throw new Error('Document not found');
    }

    const docData = docSnap.docs[0].data() as Document;
    
    // Find the version to revert to
    const targetVersion = docData.versions?.find(v => v.versionId === versionId);
    
    if (!targetVersion) {
      throw new Error('Version not found');
    }
    
    // Create a new version entry for the revert action
    const newVersion = {
      versionId: uuidv4(),
      storagePath: targetVersion.storagePath,
      timestamp: new Date().toISOString(),
      notes: `Reverted to version from ${new Date(targetVersion.timestamp).toLocaleString()}`,
      previewUrl: targetVersion.previewUrl,
    };
    
    // Update document to point to the reverted version
    await updateDoc(docRef, {
      storagePath: targetVersion.storagePath,
      previewUrl: targetVersion.previewUrl,
      updatedAt: serverTimestamp(),
      versions: [...(docData.versions || []), newVersion],
    });

    // Return updated document
    return {
      ...docData,
      storagePath: targetVersion.storagePath,
      previewUrl: targetVersion.previewUrl,
      updatedAt: new Date(),
      versions: [...(docData.versions || []), newVersion],
    };
  } catch (error) {
    console.error('Error reverting to version:', error);
    throw error;
  }
};
