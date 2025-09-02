import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, collection, addDoc, updateDoc, deleteDoc, query, where, getDocs, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db as firestore } from '../../firebaseConfig';
import { Document, DocumentVersion } from '../../types';
import { v4 as uuidv4 } from 'uuid';

// Extended interface for resume-specific documents
export interface ResumeDocument extends Document {
  category: 'resume' | 'coverLetter' | 'portfolio' | 'references' | 'bio' | 'email' | 'letter' | 'other';
  templateId?: string;
  templateName?: string;
  content?: string; // For text-based documents
  aiGenerated?: boolean;
  targetCompany?: string;
  targetRole?: string;
  industry?: string;
  customizations?: Record<string, any>;
  lastEditedBy?: 'user' | 'ai';
}

// Template interface for document templates
export interface DocumentTemplate {
  id: string;
  name: string;
  category: ResumeDocument['category'];
  description: string;
  icon: string;
  content: string; // Template content/structure
  fields: TemplateField[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateField {
  id: string;
  name: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'date' | 'number';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // For select/multiselect fields
  defaultValue?: any;
}

// Helper function to ensure token is fresh before operations
const ensureFreshToken = async (): Promise<string | null> => {
  const auth = getAuth();
  
  if (!auth.currentUser) {
    console.error('Resume document service: No authenticated user found');
    throw new Error('User not authenticated. Please log in to continue.');
  }

  try {
    const token = await auth.currentUser.getIdToken(true);
    console.log('Resume document service: Token refreshed successfully for user:', auth.currentUser.uid);
    
    if (!token || token.length < 10) {
      throw new Error('Invalid token received');
    }
    
    localStorage.setItem('auth_initialized', 'true');
    localStorage.setItem('last_auth_time', Date.now().toString());
    
    return token;
  } catch (error) {
    console.error('Resume document service: Token refresh failed:', error);
    throw new Error('Authentication failed. Please log in again.');
  }
};

// Helper function to validate user authorization
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

// Create a new document from template
export const createDocumentFromTemplate = async (
  userId: string,
  templateId: string,
  documentData: Partial<ResumeDocument>,
  content?: string
): Promise<ResumeDocument> => {
  validateUserAuthorization(userId);
  await ensureFreshToken();

  console.log('Creating document from template:', templateId, 'for user:', userId);

  try {
    // Get template data (in real implementation, this would fetch from Firestore)
    const template = await getDocumentTemplate(templateId);
    
    if (!template) {
      throw new Error('Template not found');
    }

    // Prepare document metadata
    const docData: Omit<ResumeDocument, 'id'> = {
      userId,
      name: documentData.name || `${template.name} - ${new Date().toLocaleDateString()}`,
      fileType: 'pdf', // Will be generated as PDF
      mimeType: 'application/pdf',
      originalFileName: documentData.name || template.name,
      storagePath: '', // Will be set when PDF is generated
      previewUrl: '', // Will be set when PDF is generated
      category: template.category,
      templateId: template.id,
      templateName: template.name,
      content: content || template.content,
      aiGenerated: documentData.aiGenerated || false,
      targetCompany: documentData.targetCompany,
      targetRole: documentData.targetRole,
      industry: documentData.industry,
      customizations: documentData.customizations || {},
      lastEditedBy: 'user',
      tags: documentData.tags || [template.category],
      associatedCompanies: documentData.associatedCompanies || [],
      associatedJobs: documentData.associatedJobs || [],
      versions: [],
      status: 'draft',
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };

    // Add document to Firestore
    const docRef = await addDoc(collection(firestore, `users/${userId}/resumeDocuments`), docData);
    
    const newDocument: ResumeDocument = {
      ...docData,
      id: docRef.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log('Document created successfully:', newDocument.id);
    return newDocument;
  } catch (error) {
    console.error('Error creating document from template:', error);
    throw error;
  }
};

// Fetch all resume documents for a user
export const fetchUserResumeDocuments = async (userId: string): Promise<ResumeDocument[]> => {
  validateUserAuthorization(userId);
  await ensureFreshToken();

  console.log('Fetching resume documents for user:', userId);

  try {
    const q = query(
      collection(firestore, `users/${userId}/resumeDocuments`),
      orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const documents: ResumeDocument[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      documents.push({
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as ResumeDocument);
    });

    console.log(`Fetched ${documents.length} resume documents for user:`, userId);
    return documents;
  } catch (error) {
    console.error('Error fetching user resume documents:', error);
    throw error;
  }
};

// Update document content and metadata
export const updateResumeDocument = async (
  userId: string,
  docId: string,
  updates: Partial<ResumeDocument>
): Promise<void> => {
  validateUserAuthorization(userId);
  await ensureFreshToken();

  console.log('Updating resume document:', docId, 'for user:', userId);

  try {
    const docRef = doc(firestore, `users/${userId}/resumeDocuments/${docId}`);
    
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp(),
      lastEditedBy: updates.aiGenerated ? 'ai' : 'user',
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if ((updateData as any)[key] === undefined) {
        delete (updateData as any)[key];
      }
    });

    await updateDoc(docRef, updateData);
    console.log('Document updated successfully:', docId);
  } catch (error) {
    console.error('Error updating resume document:', error);
    throw error;
  }
};

// Delete a resume document
export const deleteResumeDocument = async (
  userId: string,
  docId: string
): Promise<void> => {
  validateUserAuthorization(userId);
  await ensureFreshToken();

  console.log('Deleting resume document:', docId, 'for user:', userId);

  try {
    // Get document data to delete associated files
    const docRef = doc(firestore, `users/${userId}/resumeDocuments/${docId}`);
    const docSnap = await getDocs(query(collection(firestore, `users/${userId}/resumeDocuments`), where('id', '==', docId)));
    
    if (!docSnap.empty) {
      const docData = docSnap.docs[0].data() as ResumeDocument;
      
      // Delete file from Storage if it exists
      if (docData.storagePath) {
        try {
          const storage = getStorage();
          const fileRef = ref(storage, docData.storagePath);
          await deleteObject(fileRef);
          console.log('Deleted file from storage:', docData.storagePath);
        } catch (storageError) {
          console.warn('Could not delete file from storage:', storageError);
          // Continue with document deletion even if file deletion fails
        }
      }

      // Delete all versions from Storage
      if (docData.versions && docData.versions.length > 0) {
        const storage = getStorage();
        for (const version of docData.versions) {
          try {
            const versionRef = ref(storage, version.storagePath);
            await deleteObject(versionRef);
          } catch (versionError) {
            console.warn('Could not delete version file:', version.versionId, versionError);
          }
        }
      }
    }

    // Delete document from Firestore
    await deleteDoc(docRef);
    console.log('Document deleted successfully:', docId);
  } catch (error) {
    console.error('Error deleting resume document:', error);
    throw error;
  }
};

// Generate PDF from document content
export const generateDocumentPDF = async (
  userId: string,
  docId: string,
  content: string,
  templateId?: string
): Promise<{ downloadUrl: string; storagePath: string }> => {
  validateUserAuthorization(userId);
  await ensureFreshToken();

  console.log('Generating PDF for document:', docId);

  try {
    // In a real implementation, this would call a Cloud Function or service
    // to generate the PDF from the content and template
    
    // For now, create a placeholder PDF blob
    const pdfBlob = new Blob([content], { type: 'application/pdf' });
    const file = new File([pdfBlob], `document_${docId}.pdf`, { type: 'application/pdf' });

    // Upload to Firebase Storage
    const storage = getStorage();
    const timestamp = new Date().getTime();
    const storagePath = `users/${userId}/resumeDocuments/${docId}/${timestamp}_generated.pdf`;
    const storageRef = ref(storage, storagePath);

    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('PDF upload progress:', progress);
        },
        (error) => {
          console.error('PDF upload failed:', error);
          reject(error);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            
            // Update document with new PDF location
            await updateResumeDocument(userId, docId, {
              storagePath,
              previewUrl: downloadUrl,
              status: 'completed',
            });

            resolve({ downloadUrl, storagePath });
          } catch (err) {
            console.error('Error getting download URL:', err);
            reject(err);
          }
        }
      );
    });
  } catch (error) {
    console.error('Error generating document PDF:', error);
    throw error;
  }
};

// Get document templates (mock data for now)
export const getDocumentTemplates = async (category?: ResumeDocument['category']): Promise<DocumentTemplate[]> => {
  // In a real implementation, this would fetch from Firestore
  // For now, return mock templates
  const allTemplates: DocumentTemplate[] = [
    {
      id: 'resume-modern',
      name: 'Modern Resume',
      category: 'resume',
      description: 'Clean, modern resume template perfect for tech and creative roles',
      icon: 'FileTextIcon',
      content: '<!-- Modern Resume Template Content -->',
      fields: [
        { id: 'name', name: 'name', type: 'text', label: 'Full Name', required: true },
        { id: 'email', name: 'email', type: 'text', label: 'Email', required: true },
        { id: 'phone', name: 'phone', type: 'text', label: 'Phone', required: false },
        { id: 'summary', name: 'summary', type: 'textarea', label: 'Professional Summary', required: true },
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'cover-letter-professional',
      name: 'Professional Cover Letter',
      category: 'coverLetter',
      description: 'Professional cover letter template for formal applications',
      icon: 'MailIcon',
      content: '<!-- Professional Cover Letter Template Content -->',
      fields: [
        { id: 'company', name: 'company', type: 'text', label: 'Company Name', required: true },
        { id: 'position', name: 'position', type: 'text', label: 'Position Title', required: true },
        { id: 'hiring_manager', name: 'hiring_manager', type: 'text', label: 'Hiring Manager Name', required: false },
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    // Add more templates as needed
  ];

  if (category) {
    return allTemplates.filter(template => template.category === category);
  }

  return allTemplates;
};

// Get a specific template
export const getDocumentTemplate = async (templateId: string): Promise<DocumentTemplate | null> => {
  const templates = await getDocumentTemplates();
  return templates.find(template => template.id === templateId) || null;
};

// Search documents
export const searchResumeDocuments = async (
  userId: string,
  searchTerm: string,
  category?: ResumeDocument['category']
): Promise<ResumeDocument[]> => {
  const allDocuments = await fetchUserResumeDocuments(userId);
  
  let filteredDocuments = allDocuments;

  // Filter by category if specified
  if (category) {
    filteredDocuments = filteredDocuments.filter(doc => doc.category === category);
  }

  // Filter by search term
  if (searchTerm.trim()) {
    const lowerSearchTerm = searchTerm.toLowerCase();
    filteredDocuments = filteredDocuments.filter(doc =>
      doc.name.toLowerCase().includes(lowerSearchTerm) ||
      doc.targetCompany?.toLowerCase().includes(lowerSearchTerm) ||
      doc.targetRole?.toLowerCase().includes(lowerSearchTerm) ||
      doc.tags?.some(tag => tag.toLowerCase().includes(lowerSearchTerm))
    );
  }

  return filteredDocuments;
};

// Duplicate a document
export const duplicateResumeDocument = async (
  userId: string,
  docId: string,
  newName?: string
): Promise<ResumeDocument> => {
  validateUserAuthorization(userId);
  await ensureFreshToken();

  console.log('Duplicating resume document:', docId);

  try {
    // Get original document
    const documents = await fetchUserResumeDocuments(userId);
    const originalDoc = documents.find(doc => doc.id === docId);
    
    if (!originalDoc) {
      throw new Error('Document not found');
    }

    // Create duplicate with new data
    const duplicateData: Partial<ResumeDocument> = {
      ...originalDoc,
      name: newName || `${originalDoc.name} (Copy)`,
      status: 'draft',
      storagePath: '', // Will be generated when saved
      previewUrl: '', // Will be generated when saved
      versions: [], // Start fresh with versions
    };

    // Remove id and timestamps
    delete duplicateData.id;
    delete duplicateData.createdAt;
    delete duplicateData.updatedAt;

    return await createDocumentFromTemplate(
      userId,
      originalDoc.templateId || 'resume-modern',
      duplicateData,
      originalDoc.content
    );
  } catch (error) {
    console.error('Error duplicating resume document:', error);
    throw error;
  }
};

export default {
  createDocumentFromTemplate,
  fetchUserResumeDocuments,
  updateResumeDocument,
  deleteResumeDocument,
  generateDocumentPDF,
  getDocumentTemplates,
  getDocumentTemplate,
  searchResumeDocuments,
  duplicateResumeDocument,
};
