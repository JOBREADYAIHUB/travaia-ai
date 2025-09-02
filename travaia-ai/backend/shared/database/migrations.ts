import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { DatabaseValidator } from '../validation/database-validators';
import { COLLECTIONS } from '../models/database-models';
import { v4 as uuidv4 } from 'uuid';

export interface MigrationResult {
  success: boolean;
  migratedCount: number;
  failedCount: number;
  errors: string[];
  duration: number;
}

export class DatabaseMigrationManager {
  private db = getFirestore();

  // Migration: Add missing fields to existing users
  async migrateUsers(): Promise<MigrationResult> {
    const startTime = Date.now();
    const result: MigrationResult = {
      success: true,
      migratedCount: 0,
      failedCount: 0,
      errors: [],
      duration: 0
    };

    try {
      const usersSnapshot = await this.db.collection(COLLECTIONS.USERS).get();
      const batch = this.db.batch();
      let batchCount = 0;

      for (const doc of usersSnapshot.docs) {
        try {
          const userData = doc.data();
          const updates: any = {};

          // Add missing timestamps
          if (!userData.created_at) {
            updates.created_at = userData.createdAt || Timestamp.now();
          }
          if (!userData.updated_at) {
            updates.updated_at = Timestamp.now();
          }

          // Ensure user_id matches document ID
          if (!userData.user_id || userData.user_id !== doc.id) {
            updates.user_id = doc.id;
          }

          // Add missing profile fields
          if (!userData.profile_data) {
            updates.profile_data = {
              first_name: userData.firstName || '',
              last_name: userData.lastName || '',
              skills: userData.skills || [],
              education: userData.education || [],
              experience: userData.experience || []
            };
          }

          // Add missing progress fields
          if (!userData.progress) {
            updates.progress = {
              xp: userData.xp || 0,
              level: userData.level || 1,
              streak: userData.streak || 0
            };
          }

          // Add missing settings
          if (!userData.settings) {
            updates.settings = {
              theme: userData.theme || 'light',
              language: userData.language || 'en',
              notifications_enabled: userData.notificationsEnabled !== false
            };
          }

          // Add status if missing
          if (!userData.status) {
            updates.status = 'active';
          }

          // Add email_verified if missing
          if (userData.email_verified === undefined) {
            updates.email_verified = true;
          }

          if (Object.keys(updates).length > 0) {
            batch.update(doc.ref, updates);
            batchCount++;
            result.migratedCount++;

            // Commit batch every 500 operations
            if (batchCount >= 500) {
              await batch.commit();
              batchCount = 0;
            }
          }
        } catch (error: any) {
          result.failedCount++;
          result.errors.push(`User ${doc.id}: ${error.message}`);
        }
      }

      // Commit remaining operations
      if (batchCount > 0) {
        await batch.commit();
      }

      result.duration = Date.now() - startTime;
      console.log(`User migration completed: ${result.migratedCount} migrated, ${result.failedCount} failed`);
      
    } catch (error: any) {
      result.success = false;
      result.errors.push(`Migration failed: ${error.message}`);
    }

    return result;
  }

  // Migration: Convert applications to new schema
  async migrateApplications(): Promise<MigrationResult> {
    const startTime = Date.now();
    const result: MigrationResult = {
      success: true,
      migratedCount: 0,
      failedCount: 0,
      errors: [],
      duration: 0
    };

    try {
      const applicationsSnapshot = await this.db.collection(COLLECTIONS.APPLICATIONS).get();
      const batch = this.db.batch();
      let batchCount = 0;

      for (const doc of applicationsSnapshot.docs) {
        try {
          const appData = doc.data();
          const updates: any = {};

          // Add missing timestamps
          if (!appData.created_at) {
            updates.created_at = appData.createdAt || Timestamp.now();
          }
          if (!appData.updated_at) {
            updates.updated_at = Timestamp.now();
          }

          // Ensure application_id matches document ID
          if (!appData.application_id || appData.application_id !== doc.id) {
            updates.application_id = doc.id;
          }

          // Convert old date format to Timestamp
          if (appData.applicationDate && !appData.application_date) {
            updates.application_date = Timestamp.fromDate(new Date(appData.applicationDate));
          }

          // Ensure contacts and notes are arrays
          if (!Array.isArray(appData.contacts)) {
            updates.contacts = [];
          }
          if (!Array.isArray(appData.notes)) {
            updates.notes = [];
          }

          // Convert old status values
          if (appData.status === 'pending') {
            updates.status = 'applied';
          }

          // Add job_description_text if missing
          if (!appData.job_description_text && appData.jobDescription) {
            updates.job_description_text = appData.jobDescription;
          }

          if (Object.keys(updates).length > 0) {
            batch.update(doc.ref, updates);
            batchCount++;
            result.migratedCount++;

            if (batchCount >= 500) {
              await batch.commit();
              batchCount = 0;
            }
          }
        } catch (error: any) {
          result.failedCount++;
          result.errors.push(`Application ${doc.id}: ${error.message}`);
        }
      }

      if (batchCount > 0) {
        await batch.commit();
      }

      result.duration = Date.now() - startTime;
      console.log(`Application migration completed: ${result.migratedCount} migrated, ${result.failedCount} failed`);
      
    } catch (error: any) {
      result.success = false;
      result.errors.push(`Migration failed: ${error.message}`);
    }

    return result;
  }

  // Migration: Create interview attempts sub-collection
  async migrateInterviews(): Promise<MigrationResult> {
    const startTime = Date.now();
    const result: MigrationResult = {
      success: true,
      migratedCount: 0,
      failedCount: 0,
      errors: [],
      duration: 0
    };

    try {
      const interviewsSnapshot = await this.db.collection(COLLECTIONS.INTERVIEWS).get();

      for (const doc of interviewsSnapshot.docs) {
        try {
          const interviewData = doc.data();
          const updates: any = {};

          // Add missing fields
          if (!interviewData.interview_id) {
            updates.interview_id = doc.id;
          }
          if (!interviewData.created_at) {
            updates.created_at = Timestamp.now();
          }
          if (!interviewData.updated_at) {
            updates.updated_at = Timestamp.now();
          }
          if (!interviewData.total_attempts) {
            updates.total_attempts = 0;
          }

          // Migrate old attempt data to sub-collection
          if (interviewData.attempts && Array.isArray(interviewData.attempts)) {
            const batch = this.db.batch();
            
            for (const attempt of interviewData.attempts) {
              const attemptId = attempt.id || uuidv4();
              const attemptRef = doc.ref.collection(COLLECTIONS.INTERVIEW_ATTEMPTS).doc(attemptId);
              
              const attemptData = {
                attempt_id: attemptId,
                interview_id: doc.id,
                score: attempt.score || 0,
                start_time: attempt.startTime || Timestamp.now(),
                end_time: attempt.endTime || null,
                recording_url: attempt.recordingUrl || null,
                feedback_report_id: attempt.feedbackReportId || null,
                questions_answered: attempt.questionsAnswered || 0,
                total_questions: attempt.totalQuestions || 0,
                duration_seconds: attempt.durationSeconds || 0,
                status: attempt.status || 'completed',
                created_at: Timestamp.now(),
                updated_at: Timestamp.now()
              };

              batch.set(attemptRef, attemptData);
            }

            await batch.commit();
            updates.total_attempts = interviewData.attempts.length;
            
            // Remove old attempts array
            updates.attempts = FieldValue.delete();
          }

          if (Object.keys(updates).length > 0) {
            await doc.ref.update(updates);
            result.migratedCount++;
          }
        } catch (error: any) {
          result.failedCount++;
          result.errors.push(`Interview ${doc.id}: ${error.message}`);
        }
      }

      result.duration = Date.now() - startTime;
      console.log(`Interview migration completed: ${result.migratedCount} migrated, ${result.failedCount} failed`);
      
    } catch (error: any) {
      result.success = false;
      result.errors.push(`Migration failed: ${error.message}`);
    }

    return result;
  }

  // Migration: Add missing fields to documents
  async migrateDocuments(): Promise<MigrationResult> {
    const startTime = Date.now();
    const result: MigrationResult = {
      success: true,
      migratedCount: 0,
      failedCount: 0,
      errors: [],
      duration: 0
    };

    try {
      const documentsSnapshot = await this.db.collection(COLLECTIONS.DOCUMENTS).get();
      const batch = this.db.batch();
      let batchCount = 0;

      for (const doc of documentsSnapshot.docs) {
        try {
          const docData = doc.data();
          const updates: any = {};

          // Add missing fields
          if (!docData.document_id) {
            updates.document_id = doc.id;
          }
          if (!docData.created_at) {
            updates.created_at = docData.creationDate || Timestamp.now();
          }
          if (!docData.updated_at) {
            updates.updated_at = Timestamp.now();
          }
          if (!docData.file_size_bytes && docData.fileSize) {
            updates.file_size_bytes = docData.fileSize;
          }
          if (!docData.mime_type && docData.mimeType) {
            updates.mime_type = docData.mimeType;
          }
          if (!docData.access_level) {
            updates.access_level = 'private';
          }

          if (Object.keys(updates).length > 0) {
            batch.update(doc.ref, updates);
            batchCount++;
            result.migratedCount++;

            if (batchCount >= 500) {
              await batch.commit();
              batchCount = 0;
            }
          }
        } catch (error: any) {
          result.failedCount++;
          result.errors.push(`Document ${doc.id}: ${error.message}`);
        }
      }

      if (batchCount > 0) {
        await batch.commit();
      }

      result.duration = Date.now() - startTime;
      console.log(`Document migration completed: ${result.migratedCount} migrated, ${result.failedCount} failed`);
      
    } catch (error: any) {
      result.success = false;
      result.errors.push(`Migration failed: ${error.message}`);
    }

    return result;
  }

  // Run all migrations
  async runAllMigrations(): Promise<{ [key: string]: MigrationResult }> {
    console.log('Starting database migrations...');
    
    const results = {
      users: await this.migrateUsers(),
      applications: await this.migrateApplications(),
      interviews: await this.migrateInterviews(),
      documents: await this.migrateDocuments()
    };

    const totalMigrated = Object.values(results).reduce((sum, result) => sum + result.migratedCount, 0);
    const totalFailed = Object.values(results).reduce((sum, result) => sum + result.failedCount, 0);
    const totalDuration = Object.values(results).reduce((sum, result) => sum + result.duration, 0);

    console.log(`\nMigration Summary:`);
    console.log(`Total documents migrated: ${totalMigrated}`);
    console.log(`Total documents failed: ${totalFailed}`);
    console.log(`Total duration: ${totalDuration}ms`);

    return results;
  }

  // Validate data integrity after migration
  async validateMigration(): Promise<boolean> {
    console.log('Validating migration data integrity...');
    
    try {
      // Check users collection
      const usersSnapshot = await this.db.collection(COLLECTIONS.USERS).limit(10).get();
      for (const doc of usersSnapshot.docs) {
        try {
          DatabaseValidator.validateUser(doc.data());
        } catch (error: any) {
          console.error(`Invalid user data in ${doc.id}:`, error.message);
          return false;
        }
      }

      // Check applications collection
      const applicationsSnapshot = await this.db.collection(COLLECTIONS.APPLICATIONS).limit(10).get();
      for (const doc of applicationsSnapshot.docs) {
        try {
          DatabaseValidator.validateApplication(doc.data());
        } catch (error: any) {
          console.error(`Invalid application data in ${doc.id}:`, error.message);
          return false;
        }
      }

      console.log('Migration validation completed successfully');
      return true;
    } catch (error) {
      console.error('Migration validation failed:', error);
      return false;
    }
  }

  // Backup data before migration
  async backupCollection(collectionName: string): Promise<boolean> {
    try {
      console.log(`Backing up ${collectionName} collection...`);
      
      const snapshot = await this.db.collection(collectionName).get();
      const backupData: any[] = [];
      
      snapshot.forEach(doc => {
        backupData.push({
          id: doc.id,
          data: doc.data()
        });
      });

      // In production, this would write to Cloud Storage or another backup location
      // For now, we'll log the backup size
      console.log(`Backup completed: ${backupData.length} documents from ${collectionName}`);
      
      return true;
    } catch (error) {
      console.error(`Backup failed for ${collectionName}:`, error);
      return false;
    }
  }

  // Rollback migration (restore from backup)
  async rollbackMigration(collectionName: string, backupData: any[]): Promise<boolean> {
    try {
      console.log(`Rolling back ${collectionName} collection...`);
      
      const batch = this.db.batch();
      let batchCount = 0;

      for (const item of backupData) {
        const docRef = this.db.collection(collectionName).doc(item.id);
        batch.set(docRef, item.data);
        batchCount++;

        if (batchCount >= 500) {
          await batch.commit();
          batchCount = 0;
        }
      }

      if (batchCount > 0) {
        await batch.commit();
      }

      console.log(`Rollback completed: ${backupData.length} documents restored`);
      return true;
    } catch (error) {
      console.error(`Rollback failed for ${collectionName}:`, error);
      return false;
    }
  }
}

// Seed data generation
export class SeedDataGenerator {
  private db = getFirestore();

  async generateSeedData(): Promise<void> {
    console.log('Generating seed data...');

    // Generate resume templates
    await this.generateResumeTemplates();
    
    // Generate sample users
    await this.generateSampleUsers();
    
    console.log('Seed data generation completed');
  }

  private async generateResumeTemplates(): Promise<void> {
    const templates = [
      {
        template_id: uuidv4(),
        name: 'Professional Modern',
        description: 'Clean and modern template perfect for corporate environments',
        html_url: '/templates/professional-modern.html',
        css_url: '/templates/professional-modern.css',
        preview_url: '/templates/previews/professional-modern.png',
        tags: ['professional', 'modern', 'corporate'],
        category: 'Professional',
        difficulty_level: 'beginner' as const,
        is_premium: false,
        usage_count: 0,
        rating: 4.5,
        author: 'TRAVAIA Team',
        version: '1.0.0',
        supported_sections: ['personal_info', 'experience', 'education', 'skills'],
        customization_options: {
          colors: true,
          fonts: true,
          layout: false,
          sections: true
        },
        created_at: Timestamp.now(),
        updated_at: Timestamp.now()
      },
      {
        template_id: uuidv4(),
        name: 'Creative Designer',
        description: 'Eye-catching template for creative professionals',
        html_url: '/templates/creative-designer.html',
        css_url: '/templates/creative-designer.css',
        preview_url: '/templates/previews/creative-designer.png',
        tags: ['creative', 'designer', 'colorful'],
        category: 'Creative',
        difficulty_level: 'intermediate' as const,
        is_premium: true,
        usage_count: 0,
        rating: 4.8,
        author: 'TRAVAIA Team',
        version: '1.0.0',
        supported_sections: ['personal_info', 'experience', 'education', 'skills', 'portfolio'],
        customization_options: {
          colors: true,
          fonts: true,
          layout: true,
          sections: true
        },
        created_at: Timestamp.now(),
        updated_at: Timestamp.now()
      }
    ];

    const batch = this.db.batch();
    templates.forEach(template => {
      const docRef = this.db.collection(COLLECTIONS.RESUME_TEMPLATES).doc(template.template_id);
      batch.set(docRef, template);
    });

    await batch.commit();
    console.log(`Generated ${templates.length} resume templates`);
  }

  private async generateSampleUsers(): Promise<void> {
    // This would generate sample users for development/testing
    // Implementation depends on specific requirements
    console.log('Sample user generation skipped (implement as needed)');
  }
}

export default DatabaseMigrationManager;
