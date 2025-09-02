import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import resumeDocumentService, { ResumeDocument, DocumentTemplate } from './resumeDocumentService';

export interface UseResumeDocumentsReturn {
  documents: ResumeDocument[];
  templates: DocumentTemplate[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  selectedCategory: ResumeDocument['category'] | 'all';
  filteredDocuments: ResumeDocument[];
  
  // Actions
  setSearchTerm: (term: string) => void;
  setSelectedCategory: (category: ResumeDocument['category'] | 'all') => void;
  createDocument: (templateId: string, documentData: Partial<ResumeDocument>, content?: string) => Promise<ResumeDocument>;
  updateDocument: (docId: string, updates: Partial<ResumeDocument>) => Promise<void>;
  deleteDocument: (docId: string) => Promise<void>;
  duplicateDocument: (docId: string, newName?: string) => Promise<ResumeDocument>;
  generatePDF: (docId: string, content: string, templateId?: string) => Promise<{ downloadUrl: string; storagePath: string }>;
  refreshDocuments: () => Promise<void>;
  clearError: () => void;
}

export const useResumeDocuments = (): UseResumeDocumentsReturn => {
  const { currentUser } = useAuth();
  const [documents, setDocuments] = useState<ResumeDocument[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ResumeDocument['category'] | 'all'>('all');

  // Filter documents based on search term and category
  const filteredDocuments = useMemo(() => {
    let filtered = documents;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(doc => doc.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.name.toLowerCase().includes(lowerSearchTerm) ||
        doc.targetCompany?.toLowerCase().includes(lowerSearchTerm) ||
        doc.targetRole?.toLowerCase().includes(lowerSearchTerm) ||
        doc.tags?.some(tag => tag.toLowerCase().includes(lowerSearchTerm))
      );
    }

    return filtered;
  }, [documents, selectedCategory, searchTerm]);

  // Load documents and templates
  const loadData = useCallback(async () => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Load documents and templates in parallel
      const [documentsData, templatesData] = await Promise.all([
        resumeDocumentService.fetchUserResumeDocuments(currentUser.uid),
        resumeDocumentService.getDocumentTemplates(),
      ]);

      setDocuments(documentsData);
      setTemplates(templatesData);
    } catch (err) {
      console.error('Error loading resume documents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.uid]);

  // Load data on mount and when user changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Create a new document
  const createDocument = useCallback(async (
    templateId: string,
    documentData: Partial<ResumeDocument>,
    content?: string
  ): Promise<ResumeDocument> => {
    if (!currentUser?.uid) {
      throw new Error('User not authenticated');
    }

    try {
      setError(null);
      const newDocument = await resumeDocumentService.createDocumentFromTemplate(
        currentUser.uid,
        templateId,
        documentData,
        content
      );

      // Add to local state
      setDocuments(prev => [newDocument, ...prev]);
      return newDocument;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create document';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentUser?.uid]);

  // Update a document
  const updateDocument = useCallback(async (
    docId: string,
    updates: Partial<ResumeDocument>
  ): Promise<void> => {
    if (!currentUser?.uid) {
      throw new Error('User not authenticated');
    }

    try {
      setError(null);
      await resumeDocumentService.updateResumeDocument(currentUser.uid, docId, updates);

      // Update local state
      setDocuments(prev => prev.map(doc => 
        doc.id === docId ? { ...doc, ...updates, updatedAt: new Date() } : doc
      ));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update document';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentUser?.uid]);

  // Delete a document
  const deleteDocument = useCallback(async (docId: string): Promise<void> => {
    if (!currentUser?.uid) {
      throw new Error('User not authenticated');
    }

    try {
      setError(null);
      await resumeDocumentService.deleteResumeDocument(currentUser.uid, docId);

      // Remove from local state
      setDocuments(prev => prev.filter(doc => doc.id !== docId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete document';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentUser?.uid]);

  // Duplicate a document
  const duplicateDocument = useCallback(async (
    docId: string,
    newName?: string
  ): Promise<ResumeDocument> => {
    if (!currentUser?.uid) {
      throw new Error('User not authenticated');
    }

    try {
      setError(null);
      const duplicatedDocument = await resumeDocumentService.duplicateResumeDocument(
        currentUser.uid,
        docId,
        newName
      );

      // Add to local state
      setDocuments(prev => [duplicatedDocument, ...prev]);
      return duplicatedDocument;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to duplicate document';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentUser?.uid]);

  // Generate PDF for a document
  const generatePDF = useCallback(async (
    docId: string,
    content: string,
    templateId?: string
  ): Promise<{ downloadUrl: string; storagePath: string }> => {
    if (!currentUser?.uid) {
      throw new Error('User not authenticated');
    }

    try {
      setError(null);
      const result = await resumeDocumentService.generateDocumentPDF(
        currentUser.uid,
        docId,
        content,
        templateId
      );

      // Update document in local state with new PDF info
      setDocuments(prev => prev.map(doc => 
        doc.id === docId 
          ? { 
              ...doc, 
              storagePath: result.storagePath, 
              previewUrl: result.downloadUrl,
              status: 'completed',
              updatedAt: new Date()
            } 
          : doc
      ));

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate PDF';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentUser?.uid]);

  // Refresh documents from server
  const refreshDocuments = useCallback(async (): Promise<void> => {
    await loadData();
  }, [loadData]);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    documents,
    templates,
    loading,
    error,
    searchTerm,
    selectedCategory,
    filteredDocuments,
    setSearchTerm,
    setSelectedCategory,
    createDocument,
    updateDocument,
    deleteDocument,
    duplicateDocument,
    generatePDF,
    refreshDocuments,
    clearError,
  };
};

export default useResumeDocuments;
