import React from 'react';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '../design-system';
import { useFormState, useArrayManager } from '../../hooks';
import { FormField } from './FormField';
import { FormSection } from './FormSection';

// Types
interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  linkedinUrl: string;
  portfolioUrl: string;
  summary: string;
}

interface Experience {
  id: string;
  jobTitle: string;
  company: string;
  startDate: string;
  endDate: string;
  currentPosition: boolean;
  description: string;
}

interface Education {
  id: string;
  degree: string;
  institution: string;
  graduationDate: string;
  gpa: string;
}

interface Skill {
  id: string;
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

interface Certification {
  id: string;
  name: string;
  issuingOrganization: string;
  issueDate: string;
  expirationDate: string;
}

interface ResumeData {
  personalInfo: PersonalInfo;
  experience: Experience[];
  education: Education[];
  skills: Skill[];
  certifications: Certification[];
}

interface RefactoredResumeBuilderFormProps {
  data: ResumeData;
  onChange: (data: ResumeData) => void;
}

export const RefactoredResumeBuilderForm: React.FC<RefactoredResumeBuilderFormProps> = ({
  data,
  onChange
}) => {
  const { t } = useTranslation();
  
  // Use our custom form state hook for better state management
  const { formData, updateField, updateNestedField, isDirty } = useFormState(data);

  // Sync form data changes back to parent
  React.useEffect(() => {
    if (isDirty) {
      onChange(formData);
    }
  }, [formData, isDirty, onChange]);

  // Use array managers for cleaner array operations
  const experienceManager = useArrayManager(formData.experience, (items) => updateField('experience', items));
  const educationManager = useArrayManager(formData.education, (items) => updateField('education', items));
  const skillsManager = useArrayManager(formData.skills, (items) => updateField('skills', items));
  const certificationsManager = useArrayManager(formData.certifications, (items) => updateField('certifications', items));

  // Skill level options
  const skillLevelOptions = [
    { value: 'beginner', label: t('resumeBuilder.form.skillLevels.beginner') },
    { value: 'intermediate', label: t('resumeBuilder.form.skillLevels.intermediate') },
    { value: 'advanced', label: t('resumeBuilder.form.skillLevels.advanced') },
    { value: 'expert', label: t('resumeBuilder.form.skillLevels.expert') }
  ];

  return (
    <GlassCard variant="default" className="p-6">
      <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">
        {t('resumeBuilder.form.title')}
      </h2>

      {/* Personal Information Section */}
      <div className="mb-8">
        <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">
          {t('resumeBuilder.form.personalInfo')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label={t('resumeBuilder.form.firstName')}
            value={formData.personalInfo.firstName}
            onChange={(value) => updateNestedField('personalInfo', 'firstName', value)}
            required
          />
          <FormField
            label={t('resumeBuilder.form.lastName')}
            value={formData.personalInfo.lastName}
            onChange={(value) => updateNestedField('personalInfo', 'lastName', value)}
            required
          />
          <FormField
            label={t('resumeBuilder.form.email')}
            type="email"
            value={formData.personalInfo.email}
            onChange={(value) => updateNestedField('personalInfo', 'email', value)}
            required
          />
          <FormField
            label={t('resumeBuilder.form.phone')}
            type="tel"
            value={formData.personalInfo.phone}
            onChange={(value) => updateNestedField('personalInfo', 'phone', value)}
          />
          <FormField
            label={t('resumeBuilder.form.address')}
            value={formData.personalInfo.address}
            onChange={(value) => updateNestedField('personalInfo', 'address', value)}
            className="md:col-span-2"
          />
          <FormField
            label={t('resumeBuilder.form.city')}
            value={formData.personalInfo.city}
            onChange={(value) => updateNestedField('personalInfo', 'city', value)}
          />
          <FormField
            label={t('resumeBuilder.form.state')}
            value={formData.personalInfo.state}
            onChange={(value) => updateNestedField('personalInfo', 'state', value)}
          />
          <FormField
            label={t('resumeBuilder.form.zipCode')}
            value={formData.personalInfo.zipCode}
            onChange={(value) => updateNestedField('personalInfo', 'zipCode', value)}
          />
          <FormField
            label={t('resumeBuilder.form.linkedinUrl')}
            type="url"
            value={formData.personalInfo.linkedinUrl}
            onChange={(value) => updateNestedField('personalInfo', 'linkedinUrl', value)}
          />
          <FormField
            label={t('resumeBuilder.form.portfolioUrl')}
            type="url"
            value={formData.personalInfo.portfolioUrl}
            onChange={(value) => updateNestedField('personalInfo', 'portfolioUrl', value)}
          />
          <FormField
            label={t('resumeBuilder.form.summary')}
            type="textarea"
            value={formData.personalInfo.summary}
            onChange={(value) => updateNestedField('personalInfo', 'summary', value)}
            className="md:col-span-2"
            rows={4}
          />
        </div>
      </div>

      {/* Experience Section */}
      <FormSection
        title={t('resumeBuilder.form.experience')}
        items={formData.experience}
        onAdd={() => experienceManager.add({
          id: Date.now().toString(),
          jobTitle: '',
          company: '',
          startDate: '',
          endDate: '',
          currentPosition: false,
          description: ''
        })}
        onUpdate={experienceManager.update}
        onRemove={experienceManager.remove}
        addButtonText={t('resumeBuilder.form.addExperience')}
        emptyMessage={t('resumeBuilder.form.noExperience')}
        renderFields={(experience, onUpdate) => (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label={t('resumeBuilder.form.jobTitle')}
              value={experience.jobTitle}
              onChange={(value) => onUpdate('jobTitle', value)}
              required
            />
            <FormField
              label={t('resumeBuilder.form.company')}
              value={experience.company}
              onChange={(value) => onUpdate('company', value)}
              required
            />
            <FormField
              label={t('resumeBuilder.form.startDate')}
              type="date"
              value={experience.startDate}
              onChange={(value) => onUpdate('startDate', value)}
              required
            />
            <FormField
              label={t('resumeBuilder.form.endDate')}
              type="date"
              value={experience.endDate}
              onChange={(value) => onUpdate('endDate', value)}
              required={!experience.currentPosition}
            />
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={experience.currentPosition}
                  onChange={(e) => onUpdate('currentPosition', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                {t('resumeBuilder.form.currentPosition')}
              </label>
            </div>
            <FormField
              label={t('resumeBuilder.form.description')}
              type="textarea"
              value={experience.description}
              onChange={(value) => onUpdate('description', value)}
              className="md:col-span-2"
              rows={4}
            />
          </div>
        )}
      />

      {/* Education Section */}
      <FormSection
        title={t('resumeBuilder.form.education')}
        items={formData.education}
        onAdd={() => educationManager.add({
          id: Date.now().toString(),
          degree: '',
          institution: '',
          graduationDate: '',
          gpa: ''
        })}
        onUpdate={educationManager.update}
        onRemove={educationManager.remove}
        addButtonText={t('resumeBuilder.form.addEducation')}
        emptyMessage={t('resumeBuilder.form.noEducation')}
        renderFields={(education, onUpdate) => (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label={t('resumeBuilder.form.degree')}
              value={education.degree}
              onChange={(value) => onUpdate('degree', value)}
              required
            />
            <FormField
              label={t('resumeBuilder.form.institution')}
              value={education.institution}
              onChange={(value) => onUpdate('institution', value)}
              required
            />
            <FormField
              label={t('resumeBuilder.form.graduationDate')}
              type="date"
              value={education.graduationDate}
              onChange={(value) => onUpdate('graduationDate', value)}
            />
            <FormField
              label={t('resumeBuilder.form.gpa')}
              value={education.gpa}
              onChange={(value) => onUpdate('gpa', value)}
              placeholder="3.8"
            />
          </div>
        )}
      />

      {/* Skills Section */}
      <FormSection
        title={t('resumeBuilder.form.skills')}
        items={formData.skills}
        onAdd={() => skillsManager.add({
          id: Date.now().toString(),
          name: '',
          level: 'intermediate'
        })}
        onUpdate={skillsManager.update}
        onRemove={skillsManager.remove}
        addButtonText={t('resumeBuilder.form.addSkill')}
        emptyMessage={t('resumeBuilder.form.noSkills')}
        renderFields={(skill, onUpdate) => (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label={t('resumeBuilder.form.skillName')}
              value={skill.name}
              onChange={(value) => onUpdate('name', value)}
              required
            />
            <FormField
              label={t('resumeBuilder.form.skillLevel')}
              type="select"
              value={skill.level}
              onChange={(value) => onUpdate('level', value as any)}
              options={skillLevelOptions}
              required
            />
          </div>
        )}
      />

      {/* Certifications Section */}
      <FormSection
        title={t('resumeBuilder.form.certifications')}
        items={formData.certifications}
        onAdd={() => certificationsManager.add({
          id: Date.now().toString(),
          name: '',
          issuingOrganization: '',
          issueDate: '',
          expirationDate: ''
        })}
        onUpdate={certificationsManager.update}
        onRemove={certificationsManager.remove}
        addButtonText={t('resumeBuilder.form.addCertification')}
        emptyMessage={t('resumeBuilder.form.noCertifications')}
        renderFields={(certification, onUpdate) => (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label={t('resumeBuilder.form.certificationName')}
              value={certification.name}
              onChange={(value) => onUpdate('name', value)}
              required
            />
            <FormField
              label={t('resumeBuilder.form.issuingOrganization')}
              value={certification.issuingOrganization}
              onChange={(value) => onUpdate('issuingOrganization', value)}
              required
            />
            <FormField
              label={t('resumeBuilder.form.issueDate')}
              type="date"
              value={certification.issueDate}
              onChange={(value) => onUpdate('issueDate', value)}
            />
            <FormField
              label={t('resumeBuilder.form.expirationDate')}
              type="date"
              value={certification.expirationDate}
              onChange={(value) => onUpdate('expirationDate', value)}
            />
          </div>
        )}
      />
    </GlassCard>
  );
};
