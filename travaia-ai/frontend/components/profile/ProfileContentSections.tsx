import React from 'react';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '../design-system';
import styles from './GamifiedProfile.module.css';
import { 
  PencilIcon, 
  BriefcaseIcon,
  ChartBarIcon,
  StarIcon,
  UserGroupIcon,
  ClipboardListIcon,
  BadgeCheckIcon
} from '../icons/Icons';

// Import interfaces
interface ProfileData {
  fullName: string;
  email: string;
  bio: string;
  location: string;
  professionalTitle: string;
  company: string;
  industry: string;
  careerGoals: string;
  workLocationPreferences: string[];
  companySize: string[];
  companyValues: string[];
  workCulturePreferences: string[];
  dealBreakers: string[];
  salary: {
    range: [number, number];
    negotiable: boolean;
  };
  skills: {
    technical: string[];
    soft: string[];
    certifications: string[];
  };
  careerAspirations: {
    shortTerm: string;
    longTerm: string;
    industries: string[];
  };
}

interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  progress: number;
  unlocked: boolean;
}

interface Badge {
  id: string;
  icon: string;
  name: string;
  description: string;
  unlocked: boolean;
}

interface ProfileSectionsProps {
  profileData: ProfileData;
  badges: Badge[];
  achievements: Achievement[];
  onEditSection: (section: string) => void;
}

const ProfileContentSections: React.FC<ProfileSectionsProps> = ({ 
  profileData, 
  badges, 
  achievements, 
  onEditSection 
}) => {
  const { t } = useTranslation();
  
  // Format salary for display (e.g. $50,000 - $100,000)
  const formatSalary = (range: [number, number]) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    
    return `${formatter.format(range[0] * 1000)} - ${formatter.format(range[1] * 1000)}`;
  };
  
  return (
    <>
      {/* Professional Profile Section */}
      <div className={styles.sectionContainer}>
        <GlassCard className={styles.section}>
          <div className={styles.sectionTitle}>
            <BriefcaseIcon className={`w-5 h-5 ${styles.sectionIcon}`} />
            {t('profile.sections.professional')}
          </div>
          
          <button
            type="button"
            onClick={() => onEditSection('professional')}
            className={styles.editButton}
            aria-label={t('common.edit')}
          >
            <PencilIcon className="w-5 h-5" />
          </button>
          
          <div className={styles.sectionContent}>
            {profileData.company && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold mb-1">{t('profile.company')}</h4>
                <p>{profileData.company}</p>
              </div>
            )}
            
            {profileData.industry && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold mb-1">{t('profile.industry')}</h4>
                <p>{profileData.industry}</p>
              </div>
            )}
            
            {profileData.bio && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold mb-1">{t('profile.bio')}</h4>
                <p className="whitespace-pre-wrap">{profileData.bio}</p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Career Aspirations Section */}
        <GlassCard className={styles.section}>
          <div className={styles.sectionTitle}>
            <ChartBarIcon className={`w-5 h-5 ${styles.sectionIcon}`} />
            {t('profile.sections.aspirations')}
          </div>
          
          <button
            type="button"
            onClick={() => onEditSection('aspirations')}
            className={styles.editButton}
            aria-label={t('common.edit')}
          >
            <PencilIcon className="w-5 h-5" />
          </button>
          
          <div className={styles.sectionContent}>
            {profileData.careerAspirations.shortTerm && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold mb-1">{t('profile.shortTermGoals')}</h4>
                <p>{profileData.careerAspirations.shortTerm}</p>
              </div>
            )}
            
            {profileData.careerAspirations.longTerm && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold mb-1">{t('profile.longTermGoals')}</h4>
                <p>{profileData.careerAspirations.longTerm}</p>
              </div>
            )}
            
            {profileData.careerAspirations.industries.length > 0 && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold mb-1">{t('profile.targetIndustries')}</h4>
                <div className={styles.tagContainer}>
                  {profileData.careerAspirations.industries.map((industry, index) => (
                    <span key={`industry-${index}`} className={`${styles.tag} ${styles.green}`}>
                      {industry}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {profileData.careerGoals && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold mb-1">{t('profile.careerGoals')}</h4>
                <p className="whitespace-pre-wrap">{profileData.careerGoals}</p>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Skills Section */}
      <GlassCard className={styles.section}>
        <div className={styles.sectionTitle}>
          <StarIcon className={`w-5 h-5 ${styles.sectionIcon}`} />
          {t('profile.sections.skills')}
        </div>
        
        <button
          type="button"
          onClick={() => onEditSection('skills')}
          className={styles.editButton}
          aria-label={t('common.edit')}
        >
          <PencilIcon className="w-5 h-5" />
        </button>
        
        <div className={styles.sectionContent}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Technical Skills */}
            {profileData.skills.technical.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">{t('profile.technicalSkills')}</h4>
                <div className={styles.tagContainer}>
                  {profileData.skills.technical.map((skill, index) => (
                    <span key={`tech-${index}`} className={styles.tag}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Soft Skills */}
            {profileData.skills.soft.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">{t('profile.softSkills')}</h4>
                <div className={styles.tagContainer}>
                  {profileData.skills.soft.map((skill, index) => (
                    <span key={`soft-${index}`} className={`${styles.tag} ${styles.yellow}`}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Certifications */}
          {profileData.skills.certifications.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold mb-2">{t('profile.certifications')}</h4>
              <div className={styles.tagContainer}>
                {profileData.skills.certifications.map((cert, index) => (
                  <span key={`cert-${index}`} className={`${styles.tag} ${styles.orange}`}>
                    <BadgeCheckIcon className="w-4 h-4 mr-1" />
                    {cert}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Job Preferences Section */}
      <div className={styles.sectionContainer}>
        <GlassCard className={styles.section}>
          <div className={styles.sectionTitle}>
            <StarIcon className={`w-5 h-5 ${styles.sectionIcon}`} />
            {t('profile.sections.preferences')}
          </div>
          
          <button
            type="button"
            onClick={() => onEditSection('preferences')}
            className={styles.editButton}
            aria-label={t('common.edit')}
          >
            <PencilIcon className="w-5 h-5" />
          </button>
          
          <div className={styles.sectionContent}>
            {/* Work Location Preferences */}
            {profileData.workLocationPreferences.length > 0 && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold mb-1">{t('profile.workLocation')}</h4>
                <div className={styles.tagContainer}>
                  {profileData.workLocationPreferences.map((pref, index) => (
                    <span key={`loc-${index}`} className={styles.tag}>
                      <ClipboardListIcon className="w-4 h-4 mr-1" />
                      {t(`onboarding.steps.jobMatch.locations.${pref}`)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Company Size */}
            {profileData.companySize.length > 0 && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold mb-1">{t('profile.companySize')}</h4>
                <div className={styles.tagContainer}>
                  {profileData.companySize.map((size, index) => (
                    <span key={`size-${index}`} className={`${styles.tag} ${styles.green}`}>
                      <UserGroupIcon className="w-4 h-4 mr-1" />
                      {t(`onboarding.steps.jobMatch.companySize.${size}`)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Company Values */}
            {profileData.companyValues.length > 0 && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold mb-1">{t('profile.companyValues')}</h4>
                <div className={styles.tagContainer}>
                  {profileData.companyValues.map((value, index) => (
                    <span key={`value-${index}`} className={`${styles.tag} ${styles.orange}`}>
                      {t(`onboarding.steps.jobMatch.companyValues.${value}`)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Salary Range */}
            {profileData.salary && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold mb-1">{t('profile.salaryRange')}</h4>
                <p>
                  {formatSalary(profileData.salary.range)}
                  {profileData.salary.negotiable && (
                    <span className="ml-2 text-sm text-green-600 dark:text-green-400">
                      ({t('profile.negotiable')})
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </GlassCard>

        <GlassCard className={styles.section}>
          <div className={styles.sectionTitle}>
            <ClipboardListIcon className={`w-5 h-5 ${styles.sectionIcon}`} />
            {t('profile.sections.workCulture')}
          </div>
          
          <button
            type="button"
            onClick={() => onEditSection('workCulture')}
            className={styles.editButton}
            aria-label={t('common.edit')}
          >
            <PencilIcon className="w-5 h-5" />
          </button>
          
          <div className={styles.sectionContent}>
            {/* Work Culture Preferences */}
            {profileData.workCulturePreferences.length > 0 && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold mb-1">{t('profile.workCulture')}</h4>
                <div className={styles.tagContainer}>
                  {profileData.workCulturePreferences.map((pref, index) => (
                    <span key={`culture-${index}`} className={styles.tag}>
                      {t(`onboarding.steps.jobMatch.workCulture.${pref}`)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Deal Breakers */}
            {profileData.dealBreakers.length > 0 && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold mb-1">{t('profile.dealBreakers')}</h4>
                <div className={styles.tagContainer}>
                  {profileData.dealBreakers.map((item, index) => (
                    <span key={`deal-${index}`} className={`${styles.tag} ${styles.orange}`}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Achievements Section */}
      <GlassCard className={styles.section}>
        <div className={styles.sectionTitle}>
          <StarIcon className={`w-5 h-5 ${styles.sectionIcon}`} />
          {t('profile.sections.achievements')}
        </div>
        
        <div className={styles.sectionContent}>
          {/* Unlocked Badges */}
          <h4 className="text-sm font-semibold mb-3">{t('profile.badges')}</h4>
          <div className={styles.profileBadges}>
            {badges.map(badge => (
              <div 
                key={badge.id} 
                className={`${styles.badge} ${!badge.unlocked ? 'opacity-30' : ''}`}
                title={`${badge.name}: ${badge.description}`}
              >
                <span className={styles.badgeIcon}>{badge.icon}</span>
              </div>
            ))}
          </div>
          
          {/* Achievements */}
          <h4 className="text-sm font-semibold mt-4 mb-3">{t('profile.achievements')}</h4>
          <div className={styles.achievementGrid}>
            {achievements.map(achievement => (
              <div key={achievement.id} className={styles.achievement}>
                <div className={styles.achievementIcon}>{achievement.icon}</div>
                <h5 className={styles.achievementTitle}>{achievement.title}</h5>
                <p className={styles.achievementDesc}>{achievement.description}</p>
                <div className={`${styles.progressBar} mt-2`} title={`${achievement.progress}%`}>
                  <div 
                    className={styles.progressFill} 
                    style={{ width: `${achievement.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>
    </>
  );
};

export default ProfileContentSections;
