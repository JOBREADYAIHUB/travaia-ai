import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { GlassCard, GlassButton } from '../design-system';
// ToddlerGlassInput replaced with native input
import { PlusCircleIcon, XCircleIcon, AcademicCapIcon } from '../icons/AdditionalIcons';
import { updateUserProfile } from '../../services/firestoreService';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { UserSkill } from '../../types';

interface SkillsManagementProps {
  initialSkills?: UserSkill[];
  onSkillsUpdate?: (skills: UserSkill[]) => void;
  className?: string;
}

const SkillsManagement: React.FC<SkillsManagementProps> = ({ 
  initialSkills = [], 
  onSkillsUpdate,
  className = '' 
}) => {
  const { t } = useTranslation();
  const { currentUser, refreshUserData } = useAuth();
  
  const [skills, setSkills] = useState<UserSkill[]>(initialSkills || []);
  const [newSkill, setNewSkill] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync with initialSkills prop when it changes
  useEffect(() => {
    if (initialSkills && initialSkills.length > 0) {
      setSkills(initialSkills);
    } else if (currentUser?.skills) {
      // If no initialSkills provided but user has skills in profile
      setSkills(currentUser.skills);
    }
  }, [initialSkills, currentUser?.skills]);

  const handleAddSkill = () => {
    if (!newSkill.trim()) return;
    
    // Prevent duplicates (case insensitive)
    if (skills.some(skill => skill.name.toLowerCase() === newSkill.trim().toLowerCase())) {
      return;
    }
    
    const newUserSkill: UserSkill = {
      id: `skill-${Date.now()}`,
      name: newSkill.trim(),
      level: 3 // Default skill level (1-5 scale)
    };
    
    const updatedSkills = [...skills, newUserSkill];
    setSkills(updatedSkills);
    setNewSkill('');
    
    if (onSkillsUpdate) {
      onSkillsUpdate(updatedSkills);
    }
  };

  const handleRemoveSkill = (indexToRemove: number) => {
    const updatedSkills = skills.filter((_, index) => index !== indexToRemove);
    setSkills(updatedSkills);
    
    if (onSkillsUpdate) {
      onSkillsUpdate(updatedSkills);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkill();
    }
  };

  const handleSaveSkills = async () => {
    if (!currentUser?.uid) return;
    
    setIsSubmitting(true);
    try {
      await updateUserProfile(currentUser.uid, { skills });
      await refreshUserData();
      toast.success(t('analyticsPage.skillsManagement.skillsSaved'));
      
      if (onSkillsUpdate) {
        onSkillsUpdate(skills);
      }
    } catch (error) {
      console.error('Error saving skills:', error);
      toast.error(t('analyticsPage.skillsManagement.skillsSaveError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GlassCard className={`mb-6 ${className}`}>
      <div className="flex items-center space-x-3 mb-4">
        <AcademicCapIcon className="w-5 h-5 text-blue-500" />
        <h3 className="font-semibold text-lg">{t('analyticsPage.skillsManagement.title')}</h3>
      </div>
      
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {t('analyticsPage.skillsManagement.description')}
      </p>
      
      <div className="mb-4">
        <label htmlFor="skills" className="block text-sm font-medium mb-2">
          {t('analyticsPage.skillsManagement.currentSkills')}
        </label>
        
        <div className="flex flex-wrap gap-2 mb-3">
          {skills.length > 0 ? (
            skills.map((skill, index) => (
              <motion.div 
                key={skill.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="flex items-center bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full px-3 py-1"
              >
                <span className="text-sm">{skill.name}</span>
                <div className="ml-1 bg-blue-100 dark:bg-blue-800/30 px-1.5 rounded-full">
                  <span className="text-xs">{skill.level}/5</span>
                </div>
                <button 
                  type="button"
                  onClick={() => handleRemoveSkill(index)}
                  className="ml-2 text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 focus:outline-none"
                  aria-label={t('analyticsPage.skillsManagement.removeSkill')}
                >
                  <XCircleIcon className="w-4 h-4" />
                </button>
              </motion.div>
            ))
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              {t('analyticsPage.skillsManagement.noSkills')}
            </p>
          )}
        </div>
        
        <div className="flex">
          <input
            id="newSkill"
            name="newSkill"
            value={newSkill}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSkill(e.target.value)}
            placeholder={t('analyticsPage.skillsManagement.skillPlaceholder')}
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
          <GlassButton
            variant="button"
            onClick={handleAddSkill}
            className="ml-2 flex items-center"
            disabled={!newSkill.trim()}
          >
            <PlusCircleIcon className="w-4 h-4 mr-1" />
            {t('analyticsPage.skillsManagement.addSkill')}
          </GlassButton>
        </div>
      </div>
      
      <div className="flex justify-end">
        <GlassButton
          variant="button"
          onClick={handleSaveSkills}
          disabled={isSubmitting || skills.length === 0}
        >
          {isSubmitting ? 
            t('common.saving') : 
            t('analyticsPage.skillsManagement.saveSkills')
          }
        </GlassButton>
      </div>
    </GlassCard>
  );
};

export default SkillsManagement;
