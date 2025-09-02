import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db as firestore } from '../firebaseConfig';

// Helper function to ensure token is fresh before operations
const ensureFreshToken = async (): Promise<string | null> => {
  const auth = getAuth();
  
  if (!auth.currentUser) {
    console.error('Profile picture service: No authenticated user found');
    throw new Error('User not authenticated. Please log in to continue.');
  }

  try {
    // Force token refresh to ensure we have a fresh token
    const token = await auth.currentUser.getIdToken(true);
    console.log('Profile picture service: Token refreshed successfully for user:', auth.currentUser.uid);
    
    // Verify token is valid by checking its structure
    if (!token || token.length < 10) {
      throw new Error('Invalid token received');
    }
    
    return token;
  } catch (error) {
    console.error('Profile picture service: Token refresh failed:', error);
    throw new Error('Authentication failed. Please log in again.');
  }
};

// Helper function to validate user authorization for profile operations
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
    throw new Error('Unauthorized: Cannot access profile for another user');
  }
};

// Validate image file before upload
const validateImageFile = (file: File): void => {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
  }

  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (file.size > maxSize) {
    throw new Error('File size too large. Please upload an image smaller than 5MB.');
  }

  // Check minimum dimensions (optional - can be implemented with FileReader if needed)
  // For now, we'll rely on client-side validation in the component
};

export interface ProfilePictureUploadResult {
  avatarUrl: string;
  storagePath: string;
  uploadedAt: Date;
}

// Upload profile picture and update user profile
export const uploadProfilePicture = async (
  userId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<ProfilePictureUploadResult> => {
  // Validate user authorization before any operation
  validateUserAuthorization(userId);
  
  // Validate image file
  validateImageFile(file);
  
  // Always refresh token before any profile operation
  await ensureFreshToken();
  
  console.log('Starting profile picture upload for user:', userId, 'file:', file.name);
  
  try {
    const storage = getStorage();
    // Use consistent naming: userId.jpg for easy retrieval
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const consistentFileName = `${userId}.${fileExtension}`;
    const storagePath = `users/${userId}/profile/avatar/${consistentFileName}`;
    const storageRef = ref(storage, storagePath);

    // Upload file to Storage
    const uploadTask = uploadBytesResumable(storageRef, file);

    // Return promise that resolves when upload is complete
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Profile picture upload progress: ${progress.toFixed(1)}%`);
          if (onProgress) onProgress(progress);
        },
        (error) => {
          console.error('Profile picture upload failed:', error);
          reject(new Error(`Upload failed: ${error.message}`));
        },
        async () => {
          try {
            // Get download URL for the uploaded image
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log('Profile picture uploaded successfully:', downloadURL);

            // Update user profile document in Firestore
            const userDocRef = doc(firestore, 'users', userId);
            await updateDoc(userDocRef, {
              avatarUrl: downloadURL,
              avatarStoragePath: storagePath,
              updatedAt: serverTimestamp(),
            });

            console.log('User profile updated with new avatar URL');

            // Return upload result
            resolve({
              avatarUrl: downloadURL,
              storagePath,
              uploadedAt: new Date(),
            });
          } catch (err) {
            console.error('Error updating user profile with avatar URL:', err);
            reject(new Error(`Failed to update profile: ${err instanceof Error ? err.message : 'Unknown error'}`));
          }
        }
      );
    });
  } catch (error) {
    console.error('Error in uploadProfilePicture:', error);
    throw error;
  }
};

// Delete current profile picture and update user profile
export const deleteProfilePicture = async (userId: string): Promise<void> => {
  // Validate user authorization before any operation
  validateUserAuthorization(userId);
  
  // Always refresh token before any profile operation
  await ensureFreshToken();
  
  console.log('Deleting profile picture for user:', userId);
  
  try {
    // Get current user document to find existing avatar storage path
    const userDocRef = doc(firestore, 'users', userId);
    
    // Note: We would need to fetch the document first to get the avatarStoragePath
    // For now, we'll just update the profile to remove the avatar URL
    // In a production system, you'd want to fetch the document, get the storage path,
    // delete the file from storage, then update the document
    
    await updateDoc(userDocRef, {
      avatarUrl: null,
      avatarStoragePath: null,
      updatedAt: serverTimestamp(),
    });

    console.log('Profile picture removed from user profile');
  } catch (error) {
    console.error('Error deleting profile picture:', error);
    throw new Error(`Failed to delete profile picture: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Helper function to generate a preview URL for an image file (client-side only)
export const generateImagePreview = (file: File): string => {
  return URL.createObjectURL(file);
};
