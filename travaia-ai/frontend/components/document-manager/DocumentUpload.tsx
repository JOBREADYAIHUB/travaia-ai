import React, { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { useAuth } from '../../contexts/AuthContext';
import { GlassCard, GlassButton } from '../design-system';
import { PlusIcon, FileTextIcon } from '../icons/Icons';
import { uploadDocumentWithMetadata } from './documentService.ts';
import { Document } from '../../types';

interface DocumentUploadProps {
  onUploadComplete: (document: Document) => void;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ onUploadComplete }) => {
  const { t } = useTranslation('documentManager');
  const isRtl = i18n.dir() === 'rtl';
  const { currentUser } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  // We set isUploading but use uploadingFiles.length > 0 to determine if uploads are in progress
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };
  
  const processFiles = useCallback(async (files: File[]) => {
    if (!currentUser?.uid || files.length === 0) return;
    
    // Set uploading files to indicate upload is in progress
    setUploadingFiles([...files]);
    
    // Initialize progress for each file
    const initialProgress: {[key: string]: number} = {};
    files.forEach(file => {
      initialProgress[file.name] = 0;
    });
    setUploadProgress(initialProgress);
    
    for (const file of files) {
      try {
        // Upload the file with metadata and track progress
        const newDoc = await uploadDocumentWithMetadata(
          currentUser.uid,
          file,
          {
            name: file.name,
            fileType: file.name.split('.').pop() || 'unknown',
            mimeType: file.type,
            originalFileName: file.name,
            status: 'Draft',
          },
          (progress) => {
            setUploadProgress(prev => ({
              ...prev,
              [file.name]: progress
            }));
          }
        );
        
        // Notify parent component of successful upload
        if (newDoc) {
          onUploadComplete(newDoc);
        }
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        // Update progress to indicate error
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: -1 // Use negative value to indicate error
        }));
      }
    }
    
    // Clean up
    setTimeout(() => {
      setUploadingFiles([]);
      setUploadProgress({});
    }, 2000);
  }, [currentUser, onUploadComplete]);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (!e.dataTransfer.files || !currentUser?.uid) return;
    
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  }, [currentUser, processFiles]);
  
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !currentUser?.uid) return;
    
    const files = Array.from(e.target.files);
    processFiles(files);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [currentUser, processFiles]);
  
  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };
  
  return (
    <div className="mb-8">
      <GlassCard 
        className={`p-8 w-full transition-all duration-300 ${isDragging ? 'ring-4 ring-primary ring-opacity-50 scale-[1.02]' : ''}`}
      >
        <div
          className={`w-full h-40 border-2 border-dashed rounded-lg flex flex-col items-center justify-center ${isDragging ? 'border-primary bg-primary bg-opacity-10' : 'border-gray-300 dark:border-gray-600'}`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          aria-label={t('dropzone')}
        >
          <FileTextIcon className="w-12 h-12 text-gray-400 mb-4" aria-hidden="true" />
          <p className="text-center">
            {t('dragDropHere')}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {t('orText')}
          </p>
          <div className="mt-4">
            <GlassButton 
              variant="button" 
              onClick={handleBrowseClick}
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              {t('browseFiles')}
            </GlassButton>
            <input 
              ref={fileInputRef}
              type="file" 
              multiple 
              onChange={handleFileSelect} 
              className="hidden" 
              aria-label={t('fileInput')}
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif"
            />
          </div>
        </div>
        
        {uploadingFiles.length > 0 && (
          <div className="mt-6">
            <h4 className="font-medium mb-3">{t('uploadingFiles')}</h4>
            <div className="space-y-4">
              {uploadingFiles.map((file, index) => (
                <div key={`${file.name}-${index}`} className="flex flex-col">
                  <div className="flex justify-between text-sm mb-1">
                    <span className={`truncate max-w-[200px] ${isRtl ? 'text-right' : 'text-left'}`}>
                      {file.name}
                    </span>
                    <span>
                      {uploadProgress[file.name] < 0
                        ? t('failed')
                        : uploadProgress[file.name] === 100
                        ? t('completed')
                        : `${Math.round(uploadProgress[file.name])}%`}
                    </span>
                  </div>
                  <progress 
                    value={uploadProgress[file.name] < 0 ? 0 : uploadProgress[file.name]} 
                    max={100}
                    className={`w-full h-2 rounded-full ${
                      uploadProgress[file.name] < 0 
                        ? 'progress-danger' 
                        : 'progress-success'
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default DocumentUpload;
