import React from 'react';
import { useTranslation } from 'react-i18next';
import { GlassCard, GlassButton } from '../design-system';

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

interface ResumeBuilderFormProps {
  data: ResumeData;
  onChange: (data: ResumeData) => void;
  onSave: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const ResumeBuilderForm: React.FC<ResumeBuilderFormProps> = ({
  data,
  onChange,
  onSave,
  onCancel,
  isLoading = false
}) => {
  const { t } = useTranslation();

  const updatePersonalInfo = (field: keyof PersonalInfo, value: string) => {
    onChange({
      ...data,
      personalInfo: {
        ...data.personalInfo,
        [field]: value
      }
    });
  };

  const addExperience = () => {
    const newExperience: Experience = {
      id: Date.now().toString(),
      jobTitle: '',
      company: '',
      startDate: '',
      endDate: '',
      currentPosition: false,
      description: ''
    };
    onChange({
      ...data,
      experience: [...data.experience, newExperience]
    });
  };

  const updateExperience = (id: string, field: keyof Experience, value: string | boolean) => {
    onChange({
      ...data,
      experience: data.experience.map(exp => 
        exp.id === id ? { ...exp, [field]: value } : exp
      )
    });
  };

  const removeExperience = (id: string) => {
    onChange({
      ...data,
      experience: data.experience.filter(exp => exp.id !== id)
    });
  };

  const addEducation = () => {
    const newEducation: Education = {
      id: Date.now().toString(),
      degree: '',
      institution: '',
      graduationDate: '',
      gpa: ''
    };
    onChange({
      ...data,
      education: [...data.education, newEducation]
    });
  };

  const updateEducation = (id: string, field: keyof Education, value: string) => {
    onChange({
      ...data,
      education: data.education.map(edu => 
        edu.id === id ? { ...edu, [field]: value } : edu
      )
    });
  };

  const removeEducation = (id: string) => {
    onChange({
      ...data,
      education: data.education.filter(edu => edu.id !== id)
    });
  };

  const addSkill = () => {
    const newSkill: Skill = {
      id: Date.now().toString(),
      name: '',
      level: 'intermediate'
    };
    onChange({
      ...data,
      skills: [...data.skills, newSkill]
    });
  };

  const updateSkill = (id: string, field: keyof Skill, value: string) => {
    onChange({
      ...data,
      skills: data.skills.map(skill => 
        skill.id === id ? { ...skill, [field]: value } : skill
      )
    });
  };

  const removeSkill = (id: string) => {
    onChange({
      ...data,
      skills: data.skills.filter(skill => skill.id !== id)
    });
  };

  const addCertification = () => {
    const newCertification: Certification = {
      id: Date.now().toString(),
      name: '',
      issuingOrganization: '',
      issueDate: '',
      expirationDate: ''
    };
    onChange({
      ...data,
      certifications: [...data.certifications, newCertification]
    });
  };

  const updateCertification = (id: string, field: keyof Certification, value: string) => {
    onChange({
      ...data,
      certifications: data.certifications.map(cert => 
        cert.id === id ? { ...cert, [field]: value } : cert
      )
    });
  };

  const removeCertification = (id: string) => {
    onChange({
      ...data,
      certifications: data.certifications.filter(cert => cert.id !== id)
    });
  };

  return (
    <GlassCard variant="default" className="p-6">
      <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">
        {t('resumeBuilder.form.title')}
      </h2>

      {/* Personal Information */}
      <div className="mb-8">
        <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">
          {t('resumeBuilder.form.personalInfo')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('resumeBuilder.form.firstName')}
            </label>
            <input
              type="text"
              value={data.personalInfo.firstName}
              onChange={(e) => updatePersonalInfo('firstName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('resumeBuilder.form.firstName')}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('resumeBuilder.form.lastName')}
            </label>
            <input
              type="text"
              value={data.personalInfo.lastName}
              onChange={(e) => updatePersonalInfo('lastName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('resumeBuilder.form.lastName')}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('resumeBuilder.form.email')}
            </label>
            <input
              type="email"
              value={data.personalInfo.email}
              onChange={(e) => updatePersonalInfo('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('resumeBuilder.form.email')}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('resumeBuilder.form.phone')}
            </label>
            <input
              type="tel"
              value={data.personalInfo.phone}
              onChange={(e) => updatePersonalInfo('phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('resumeBuilder.form.phone')}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('resumeBuilder.form.address')}
            </label>
            <input
              type="text"
              value={data.personalInfo.address}
              onChange={(e) => updatePersonalInfo('address', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('resumeBuilder.form.address')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('resumeBuilder.form.linkedinUrl')}
            </label>
            <input
              type="url"
              value={data.personalInfo.linkedinUrl}
              onChange={(e) => updatePersonalInfo('linkedinUrl', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('resumeBuilder.form.linkedinUrl')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('resumeBuilder.form.portfolioUrl')}
            </label>
            <input
              type="url"
              value={data.personalInfo.portfolioUrl}
              onChange={(e) => updatePersonalInfo('portfolioUrl', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('resumeBuilder.form.portfolioUrl')}
            />
          </div>
        </div>
      </div>

      {/* Professional Summary */}
      <div className="mb-8">
        <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">
          {t('resumeBuilder.form.summary')}
        </h3>
        <textarea
          rows={4}
          value={data.personalInfo.summary}
          onChange={(e) => updatePersonalInfo('summary', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={t('resumeBuilder.form.summaryPlaceholder')}
        />
      </div>

      {/* Work Experience */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
            {t('resumeBuilder.form.experience')}
          </h3>
          <GlassButton variant="primary" size="sm" onClick={addExperience}>
            {t('resumeBuilder.form.addExperience')}
          </GlassButton>
        </div>
        <div className="space-y-4">
          {data.experience.map((exp) => (
            <div key={exp.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('resumeBuilder.form.jobTitle')}
                  </label>
                  <input
                    type="text"
                    value={exp.jobTitle}
                    onChange={(e) => updateExperience(exp.id, 'jobTitle', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('resumeBuilder.form.jobTitle')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('resumeBuilder.form.company')}
                  </label>
                  <input
                    type="text"
                    value={exp.company}
                    onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('resumeBuilder.form.company')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('resumeBuilder.form.startDate')}
                  </label>
                  <input
                    type="date"
                    value={exp.startDate}
                    onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('resumeBuilder.form.endDate')}
                  </label>
                  <input
                    type="date"
                    value={exp.endDate}
                    onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)}
                    disabled={exp.currentPosition}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  />
                  <label className="flex items-center mt-2">
                    <input
                      type="checkbox"
                      checked={exp.currentPosition}
                      onChange={(e) => updateExperience(exp.id, 'currentPosition', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {t('resumeBuilder.form.currentPosition')}
                    </span>
                  </label>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('resumeBuilder.form.description')}
                </label>
                <textarea
                  rows={3}
                  value={exp.description}
                  onChange={(e) => updateExperience(exp.id, 'description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('resumeBuilder.form.description')}
                />
              </div>
              <button
                onClick={() => removeExperience(exp.id)}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                {t('delete')}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Education */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
            {t('resumeBuilder.form.education')}
          </h3>
          <GlassButton variant="primary" size="sm" onClick={addEducation}>
            {t('resumeBuilder.form.addEducation')}
          </GlassButton>
        </div>
        <div className="space-y-4">
          {data.education.map((edu) => (
            <div key={edu.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('resumeBuilder.form.degree')}
                  </label>
                  <input
                    type="text"
                    value={edu.degree}
                    onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('resumeBuilder.form.degree')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('resumeBuilder.form.institution')}
                  </label>
                  <input
                    type="text"
                    value={edu.institution}
                    onChange={(e) => updateEducation(edu.id, 'institution', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('resumeBuilder.form.institution')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('resumeBuilder.form.graduationDate')}
                  </label>
                  <input
                    type="date"
                    value={edu.graduationDate}
                    onChange={(e) => updateEducation(edu.id, 'graduationDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('resumeBuilder.form.gpa')}
                  </label>
                  <input
                    type="text"
                    value={edu.gpa}
                    onChange={(e) => updateEducation(edu.id, 'gpa', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('resumeBuilder.form.gpa')}
                  />
                </div>
              </div>
              <button
                onClick={() => removeEducation(edu.id)}
                className="text-red-600 hover:text-red-800 text-sm mt-2"
              >
                {t('delete')}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Skills */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
            {t('resumeBuilder.form.skills')}
          </h3>
          <GlassButton variant="primary" size="sm" onClick={addSkill}>
            {t('resumeBuilder.form.addSkill')}
          </GlassButton>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.skills.map((skill) => (
            <div key={skill.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('resumeBuilder.form.skillName')}
                  </label>
                  <input
                    type="text"
                    value={skill.name}
                    onChange={(e) => updateSkill(skill.id, 'name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('resumeBuilder.form.skillName')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('resumeBuilder.form.skillLevel')}
                  </label>
                  <select
                    value={skill.level}
                    onChange={(e) => updateSkill(skill.id, 'level', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="beginner">{t('resumeBuilder.form.skillLevels.beginner')}</option>
                    <option value="intermediate">{t('resumeBuilder.form.skillLevels.intermediate')}</option>
                    <option value="advanced">{t('resumeBuilder.form.skillLevels.advanced')}</option>
                    <option value="expert">{t('resumeBuilder.form.skillLevels.expert')}</option>
                  </select>
                </div>
              </div>
              <button
                onClick={() => removeSkill(skill.id)}
                className="text-red-600 hover:text-red-800 text-sm mt-2"
              >
                {t('delete')}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Certifications */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
            {t('resumeBuilder.form.certifications')}
          </h3>
          <GlassButton variant="primary" size="sm" onClick={addCertification}>
            {t('resumeBuilder.form.addCertification')}
          </GlassButton>
        </div>
        <div className="space-y-4">
          {data.certifications.map((cert) => (
            <div key={cert.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('resumeBuilder.form.certificationName')}
                  </label>
                  <input
                    type="text"
                    value={cert.name}
                    onChange={(e) => updateCertification(cert.id, 'name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('resumeBuilder.form.certificationName')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('resumeBuilder.form.issuingOrganization')}
                  </label>
                  <input
                    type="text"
                    value={cert.issuingOrganization}
                    onChange={(e) => updateCertification(cert.id, 'issuingOrganization', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('resumeBuilder.form.issuingOrganization')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('resumeBuilder.form.issueDate')}
                  </label>
                  <input
                    type="date"
                    value={cert.issueDate}
                    onChange={(e) => updateCertification(cert.id, 'issueDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('resumeBuilder.form.expirationDate')}
                  </label>
                  <input
                    type="date"
                    value={cert.expirationDate}
                    onChange={(e) => updateCertification(cert.id, 'expirationDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <button
                onClick={() => removeCertification(cert.id)}
                className="text-red-600 hover:text-red-800 text-sm mt-2"
              >
                {t('delete')}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <GlassButton variant="secondary" onClick={onCancel} disabled={isLoading}>
          {t('resumeBuilder.actions.cancel')}
        </GlassButton>
        <div className="space-x-4">
          <GlassButton variant="primary" onClick={onSave} disabled={isLoading}>
            {isLoading ? t('processing') : t('resumeBuilder.actions.save')}
          </GlassButton>
        </div>
      </div>
    </GlassCard>
  );
};

export default ResumeBuilderForm;
