import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { fetchUserSectionData, updateUserProfile } from '../../services/firestoreService';
import { JobApplication, ApplicationStatus, UserProfile } from '../../types';
import { StandardPageLayout, GlassCard, GlassButton, GlassModal, ProgressBar } from '../design-system';
import {
  uploadProfilePicture,
} from '../../services/profilePictureService';

interface UserProfilePageProps {
  navigate: (path: string) => void;
}

const UserProfilePage: React.FC<UserProfilePageProps> = ({ navigate }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();

  // UI state following Job Tracker patterns
  const [dataError, setDataError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [jobApplications, setJobApplications] = useState<JobApplication[]>([]);

  // State for profile picture upload
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for inline editing
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({
    displayName: '',
    professionalTitle: '',
    company: '',
    industry: '',
    location: ''
  });

  // Initialize edit values when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setEditValues({
        displayName: currentUser.displayName || '',
        professionalTitle: currentUser.professionalTitle || '',
        company: currentUser.company || '',
        industry: currentUser.industry || '',
        location: currentUser.location || ''
      });
    }
  }, [currentUser]);

  // Handle starting inline edit
  const handleStartEdit = useCallback((field: string) => {
    console.log('Starting edit for field:', field);
    console.log('Current edit values:', editValues);
    setEditingField(field);
  }, [editValues]);

  // Handle canceling edit
  const handleCancelEdit = useCallback(() => {
    setEditingField(null);
    // Reset edit values to current user data
    if (currentUser) {
      setEditValues({
        displayName: currentUser.displayName || '',
        professionalTitle: currentUser.professionalTitle || '',
        company: currentUser.company || '',
        industry: currentUser.industry || '',
        location: currentUser.location || ''
      });
    }
  }, [currentUser]);

  // Handle saving profile field(s)
  const handleSaveField = useCallback(async (fields: string | string[]) => {
    if (!currentUser?.uid) return;

    try {
      const fieldsArray = Array.isArray(fields) ? fields : [fields];
      const updateData: Partial<UserProfile> = {};
      
      fieldsArray.forEach(field => {
        const value = editValues[field as keyof typeof editValues];
        if (value !== undefined && value !== null) {
          (updateData as any)[field] = value;
        }
      });

      console.log('Updating profile with data:', updateData);
      await updateUserProfile(currentUser.uid, updateData);
      
      setEditingField(null);
      setSuccessMessage(t('userProfile.editModal.updateSuccess'));
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error updating profile field:', error);
      setDataError(t('userProfile.editModal.updateError'));
      setTimeout(() => setDataError(null), 3000);
    }
  }, [currentUser, editValues, t]);

  // Handle input change - memoized to prevent re-renders
  const handleInputChange = useCallback((field: string, value: string) => {
    console.log('Input change:', field, value);
    setEditValues(prev => {
      const newValues = {
        ...prev,
        [field]: value
      };
      console.log('New edit values:', newValues);
      return newValues;
    });
  }, []);

  useEffect(() => {
    const loadJobApplications = async () => {
      if (!currentUser?.uid) {
        setJobApplications([]);
        setIsLoadingData(false);
        setDataError(null);
        return;
      }
      
      setIsLoadingData(true);
      setDataError(null);
      
      try {
        const applications = await fetchUserSectionData(currentUser.uid, 'jobApplications') as JobApplication[];
        setJobApplications(applications || []);
      } catch (error: any) {
        console.error('Error loading job applications:', error);
        setDataError('Failed to load profile data');
        setJobApplications([]);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadJobApplications();
  }, [currentUser, t]);

  // Profile picture upload handlers - ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS

  const handleFileSelect = useCallback((file: File) => {
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
        setShowUploadModal(true);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleUploadPicture = useCallback(async () => {
    if (!selectedFile || !currentUser?.uid) return;

    setIsUploadingPicture(true);
    setUploadProgress(0);
    setDataError(null);
    setSuccessMessage(null);

    try {
      const result = await uploadProfilePicture(
        currentUser.uid,
        selectedFile,
        (progress) => setUploadProgress(progress)
      );

      // Avatar URL will be updated through auth context
      
      setSuccessMessage(t('userProfile.profilePicture.success.uploaded'));
      setSelectedFile(null);
      setPreviewUrl(null);
      setShowUploadModal(false);
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      console.log('Profile picture uploaded successfully:', result.avatarUrl);
    } catch (error: any) {
      console.error('Profile picture upload failed:', error);
      setDataError(error.message || t('userProfile.profilePicture.error.uploadFailed'));
    } finally {
      setIsUploadingPicture(false);
      setUploadProgress(0);
    }
  }, [selectedFile, currentUser?.uid, t]);

  const handleCancelUpload = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setDataError(null);
    setShowUploadModal(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Computed values
  const totalApplications = jobApplications.length;
  const interviewCount = jobApplications.filter(app => 
    app.status === ApplicationStatus.Interviewing || 
    app.status === ApplicationStatus.InterviewScheduled
  ).length;
  const offerCount = jobApplications.filter(app => 
    app.status === ApplicationStatus.OfferReceived
  ).length;
  const effectiveAvatarUrl = currentUser?.avatarUrl || null;

  // Loading state
  if (!currentUser) {
    return (
      <StandardPageLayout
        title={t('profile.title')}
        subtitle={t('profile.subtitle')}
        loading={true}
      >
        <div />
      </StandardPageLayout>
    );
  }

  return (
    <StandardPageLayout
      title={t('profile.title')}
      subtitle={t('profile.subtitle')}
    >
      <div className="space-y-6">
        <div className="container mx-auto px-4 py-6">

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg">
            {successMessage}
          </div>
        )}
        {dataError && (
          <div className="fixed top-4 right-4 z-50 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg">
            {dataError}
          </div>
        )}

        {/* Profile Header */}
      <div className="relative pt-12 pb-24">
        <div className="relative z-10 text-center">
          {/* Avatar - Clickable with Edit Icon */}
          <div className="relative inline-block mb-6">
            <div 
              className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/30 overflow-hidden mx-auto shadow-2xl cursor-pointer hover:border-white/50 transition-all duration-200 group"
              onClick={() => fileInputRef.current?.click()}
              title={t('userProfile.profilePicture.clickToUpdate')}
            >
              {effectiveAvatarUrl ? (
                <img
                  src={effectiveAvatarUrl}
                  alt="Profile"
                  className="w-full h-full object-cover group-hover:opacity-80 transition-opacity duration-200"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-4xl font-bold group-hover:opacity-80 transition-opacity duration-200">
                  {(currentUser.displayName || 'SC').charAt(0).toUpperCase()}
                </div>
              )}
              
              {/* Edit Icon Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full">
                <div className="bg-white/90 rounded-full p-2 shadow-lg">
                  <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileInputChange}
              className="hidden"
              disabled={isUploadingPicture}
              title={t('userProfile.profilePicture.selectFile')}
              aria-label={t('userProfile.profilePicture.selectFile')}
            />
          </div>

          {/* Name and Title */}
          <div className="mb-8">
            {/* Display Name */}
            <div className="mb-2">
              {editingField === 'displayName' ? (
                <div className="flex items-center justify-center gap-2">
                  <input
                    type="text"
                    value={editValues.displayName}
                    onChange={(e) => handleInputChange('displayName', e.target.value)}
                    className="text-4xl font-bold text-center bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg px-4 py-2 text-white placeholder-white/70 focus:outline-none focus:border-white/50"
                    placeholder={t('userProfile.header.name')}
                    autoFocus
                  />
                  <GlassButton
                    onClick={() => handleSaveField('displayName')}
                    disabled={isUploadingPicture}
                    className="px-3 py-2 text-sm"
                  >
                    ✓
                  </GlassButton>
                  <GlassButton
                    onClick={handleCancelEdit}
                    variant="button"
                    className="px-3 py-2 text-sm"
                  >
                    ✕
                  </GlassButton>
                </div>
              ) : (
                <h1 
                  className="text-4xl font-bold text-white drop-shadow-lg cursor-pointer hover:text-white/80 transition-colors duration-200 inline-flex items-center gap-2"
                  onClick={() => handleStartEdit('displayName')}
                  title={t('userProfile.editModal.displayName')}
                >
                  {currentUser?.displayName || 'Sophia Carter'}
                  <svg className="w-5 h-5 opacity-0 hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </h1>
              )}
            </div>

            {/* Professional Title */}
            <div className="mb-2">
              {editingField === 'professionalTitle' ? (
                <div className="flex items-center justify-center gap-2">
                  <input
                    type="text"
                    value={editValues.professionalTitle}
                    onChange={(e) => handleInputChange('professionalTitle', e.target.value)}
                    className="text-xl font-medium text-center bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg px-4 py-2 text-white placeholder-white/70 focus:outline-none focus:border-white/50"
                    placeholder={t('userProfile.header.title')}
                    autoFocus
                  />
                  <GlassButton
                    onClick={() => handleSaveField('professionalTitle')}
                    disabled={isUploadingPicture}
                    className="px-3 py-2 text-sm"
                  >
                    ✓
                  </GlassButton>
                  <GlassButton
                    onClick={handleCancelEdit}
                    variant="button"
                    className="px-3 py-2 text-sm"
                  >
                    ✕
                  </GlassButton>
                </div>
              ) : (
                <p 
                  className="text-xl text-white/90 font-medium cursor-pointer hover:text-white/70 transition-colors duration-200 inline-flex items-center gap-2"
                  onClick={() => handleStartEdit('professionalTitle')}
                  title={t('userProfile.editModal.professionalTitle')}
                >
                  {currentUser?.professionalTitle || 'Product Manager at Tech Innovators'}
                  <svg className="w-4 h-4 opacity-0 hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </p>
              )}
            </div>

            {/* Industry and Location */}
            <div>
              {editingField === 'industry' || editingField === 'location' ? (
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={editValues.industry}
                    onChange={(e) => handleInputChange('industry', e.target.value)}
                    className="text-white/80 text-center bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg px-3 py-1 placeholder-white/70 focus:outline-none focus:border-white/50"
                    placeholder="Industry"
                    aria-label="Industry"
                  />
                  <span className="text-white/80">|</span>
                  <input
                    type="text"
                    value={editValues.location}
                    placeholder="Location"
                    aria-label="Location"
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className="text-white/80 text-center bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg px-3 py-1 placeholder-white/70 focus:outline-none focus:border-white/50"
                  />
                  <GlassButton
                    onClick={() => handleSaveField(['industry', 'location'])}
                    disabled={isUploadingPicture}
                    className="px-3 py-1 text-sm"
                  >
                    ✓
                  </GlassButton>
                  <GlassButton
                    onClick={handleCancelEdit}
                    variant="button"
                    className="px-3 py-1 text-sm"
                  >
                    ✕
                  </GlassButton>
                </div>
              ) : (
                <p 
                  className="text-white/80 cursor-pointer hover:text-white/60 transition-colors duration-200 inline-flex items-center gap-2"
                  onClick={() => handleStartEdit('industry')}
                  title={`${t('userProfile.header.industry')} | ${t('userProfile.header.location')}`}
                >
                  {currentUser?.industry && currentUser?.location
                    ? `${currentUser.industry} | ${currentUser.location}`
                    : 'Technology | San Francisco'}
                  <svg className="w-4 h-4 opacity-0 hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </p>
              )}
            </div>
          </div>


        </div>
      </div>

      {/* Main Content */}
      <div className="lg:w-[90%] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Two Column Layout on Large Screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Profile Information */}
          <div className="space-y-6">
            {/* Career Goals Section */}
            <GlassCard className="p-8 bg-base_100 dark:bg-dark_card_bg backdrop-blur-sm shadow-xl border border-base_300 dark:border-neutral-700">
              <h2 className="text-2xl font-bold text-primary dark:text-blue-400 mb-4">
                🎯 {t('userProfile.sections.careerGoals')}
              </h2>
              <p className="text-neutral dark:text-gray-300 leading-relaxed">
                {currentUser?.careerGoals || t('userProfile.sections.defaultCareerGoals')}
              </p>
            </GlassCard>

            {/* Documents Section */}
            <GlassCard className="p-8 bg-base_100 dark:bg-dark_card_bg backdrop-blur-sm shadow-xl border border-base_300 dark:border-neutral-700">
              <h2 className="text-2xl font-bold text-primary dark:text-blue-400 mb-6">
                📄 {t('userProfile.sections.documents')}
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-base_200 dark:bg-neutral-800 rounded-lg border border-base_300 dark:border-neutral-600">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">📄</span>
                    <div>
                      <div className="font-semibold text-neutral dark:text-gray-200">
                        {t('userProfile.documents.resume')}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {t('userProfile.documents.noResume')}
                      </div>
                    </div>
                  </div>
                  <GlassButton variant="button" size="sm">
                    {t('userProfile.documents.upload')}
                  </GlassButton>
                </div>
                <div className="flex items-center justify-between p-4 bg-base_200 dark:bg-neutral-800 rounded-lg border border-base_300 dark:border-neutral-600">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">✉️</span>
                    <div>
                      <div className="font-semibold text-neutral dark:text-gray-200">
                        {t('userProfile.documents.coverLetter')}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {t('userProfile.documents.noCoverLetter')}
                      </div>
                    </div>
                  </div>
                  <GlassButton variant="button" size="sm">
                    {t('userProfile.documents.upload')}
                  </GlassButton>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Right Column - Stats and Actions */}
          <div className="space-y-6">
            {/* Profile Information */}
            <GlassCard className="p-8 bg-base_100 dark:bg-dark_card_bg backdrop-blur-sm shadow-xl border border-base_300 dark:border-neutral-700">
              <div className="flex items-start mb-6">
                <div className="relative mr-6">
                  {/* Current Avatar Display */}
                  {effectiveAvatarUrl ? (
                    <img
                      src={effectiveAvatarUrl}
                      alt={t('userProfile.avatar.alt')}
                      className="w-24 h-24 rounded-full object-cover border-4 border-primary dark:border-blue-400"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary dark:from-blue-400 dark:to-pink-400 flex items-center justify-center border-4 border-primary dark:border-blue-400">
                      <span className="text-2xl font-bold text-white">
                        {currentUser.displayName?.charAt(0)?.toUpperCase() || currentUser.email?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                  
                  {/* Upload Progress Overlay */}
                  {isUploadingPicture && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                      <div className="text-white text-sm font-semibold">
                        {uploadProgress > 0 ? `${Math.round(uploadProgress)}%` : '...'}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-primary dark:text-blue-400 mb-2">
                    {currentUser.displayName || t('userProfile.noDisplayName')}
                  </h1>
                  <h3 className="text-lg font-medium text-white">{currentUser.displayName || t('userProfile.noName')}</h3>
                  <p className="text-sm text-white/70">{currentUser.email}</p>
                  <p className="text-sm text-white/70">{t('userProfile.memberSince')}: {t('userProfile.unknown')}</p>
                </div>
              </div>
            </GlassCard>

            {/* Job Application Stats */}
            <GlassCard className="p-8 bg-base_100 dark:bg-dark_card_bg backdrop-blur-sm shadow-xl border border-base_300 dark:border-neutral-700">
              <h2 className="text-2xl font-bold text-primary dark:text-blue-400 mb-6">
                📊 {t('userProfile.sections.jobStats')}
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-secondary dark:text-pink-400">
                    {totalApplications}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {t('userProfile.stats.applications')}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-accent dark:text-green-400">
                    {interviewCount}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {t('userProfile.stats.interviews')}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary dark:text-blue-400">
                    {offerCount}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {t('userProfile.stats.offers')}
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Mock Interviews Section */}
            <GlassCard className="p-8 bg-base_100 dark:bg-dark_card_bg backdrop-blur-sm shadow-xl border border-base_300 dark:border-neutral-700">
              <h2 className="text-2xl font-bold text-primary dark:text-blue-400 mb-6">
                🎤 {t('userProfile.sections.mockInterviews')}
              </h2>
              <p className="text-neutral dark:text-gray-300 mb-6">
                {t('userProfile.sections.mockInterviewsDescription')}
              </p>
              <GlassButton
                onClick={() => navigate('/mock-interview')}
                variant="button"
                className="w-full"
              >
                {t('userProfile.sections.startMockInterview')}
              </GlassButton>
            </GlassCard>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && selectedFile && previewUrl && (
        <GlassModal
          isOpen={showUploadModal}
          onClose={handleCancelUpload}
          title={t('userProfile.profilePicture.upload')}
        >
          <div className="space-y-4">
            {/* File Preview */}
            <div className="text-center">
              <img
                src={previewUrl}
                alt={t('userProfile.profilePicture.preview.alt')}
                className="w-32 h-32 rounded-full object-cover mx-auto border-4 border-primary dark:border-blue-400"
              />
              <div className="mt-4">
                <div className="font-semibold text-neutral dark:text-gray-200">
                  {selectedFile.name}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
            </div>

            {/* Error Message */}
            {dataError && (
              <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
                {dataError}
              </div>
            )}

            {/* Upload Progress */}
            {isUploadingPicture && uploadProgress > 0 && (
              <ProgressBar
                value={uploadProgress}
                variant="upload"
                showLabel={true}
                label={t('userProfile.profilePicture.uploading')}
                animated={true}
              />
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <GlassButton
                onClick={handleUploadPicture}
                disabled={isUploadingPicture}
                variant="button"
                className="flex-1"
              >
                {isUploadingPicture ? t('userProfile.profilePicture.uploading') : t('userProfile.profilePicture.upload')}
              </GlassButton>
              <GlassButton
                onClick={handleCancelUpload}
                disabled={isUploadingPicture}
                variant="button"
                className="flex-1"
              >
                {t('common.cancel')}
              </GlassButton>
            </div>
          </div>
        </GlassModal>
      )}
        </div>
      </div>
    </StandardPageLayout>
  );
};

export default UserProfilePage;
