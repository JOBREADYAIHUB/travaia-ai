import { getFirestore } from 'firebase-admin/firestore';

// Firestore index configuration for optimal query performance
export const FIRESTORE_INDEXES = {
  // Users collection indexes
  users: [
    {
      collectionGroup: 'users',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'email', order: 'ASCENDING' },
        { fieldPath: 'status', order: 'ASCENDING' }
      ]
    },
    {
      collectionGroup: 'users',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'username', order: 'ASCENDING' }
      ]
    },
    {
      collectionGroup: 'users',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'last_login', order: 'DESCENDING' }
      ]
    },
    {
      collectionGroup: 'users',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'progress.level', order: 'DESCENDING' },
        { fieldPath: 'progress.xp', order: 'DESCENDING' }
      ]
    }
  ],

  // Applications collection indexes
  applications: [
    {
      collectionGroup: 'applications',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'user_id', order: 'ASCENDING' },
        { fieldPath: 'application_date', order: 'DESCENDING' }
      ]
    },
    {
      collectionGroup: 'applications',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'user_id', order: 'ASCENDING' },
        { fieldPath: 'status', order: 'ASCENDING' },
        { fieldPath: 'application_date', order: 'DESCENDING' }
      ]
    },
    {
      collectionGroup: 'applications',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'user_id', order: 'ASCENDING' },
        { fieldPath: 'company_name', order: 'ASCENDING' }
      ]
    },
    {
      collectionGroup: 'applications',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'user_id', order: 'ASCENDING' },
        { fieldPath: 'deadline', order: 'ASCENDING' }
      ]
    },
    {
      collectionGroup: 'applications',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'status', order: 'ASCENDING' },
        { fieldPath: 'application_date', order: 'DESCENDING' }
      ]
    }
  ],

  // Favorite jobs collection indexes
  favorite_jobs: [
    {
      collectionGroup: 'favorite_jobs',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'user_id', order: 'ASCENDING' },
        { fieldPath: 'saved_date', order: 'DESCENDING' }
      ]
    },
    {
      collectionGroup: 'favorite_jobs',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'user_id', order: 'ASCENDING' },
        { fieldPath: 'company_name', order: 'ASCENDING' }
      ]
    },
    {
      collectionGroup: 'favorite_jobs',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'user_id', order: 'ASCENDING' },
        { fieldPath: 'tags', arrayConfig: 'CONTAINS' }
      ]
    }
  ],

  // Interview questions collection indexes
  interview_questions: [
    {
      collectionGroup: 'interview_questions',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'user_id', order: 'ASCENDING' },
        { fieldPath: 'created_at', order: 'DESCENDING' }
      ]
    },
    {
      collectionGroup: 'interview_questions',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'user_id', order: 'ASCENDING' },
        { fieldPath: 'language', order: 'ASCENDING' },
        { fieldPath: 'difficulty', order: 'ASCENDING' }
      ]
    },
    {
      collectionGroup: 'interview_questions',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'is_public', order: 'ASCENDING' },
        { fieldPath: 'usage_count', order: 'DESCENDING' }
      ]
    },
    {
      collectionGroup: 'interview_questions',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'difficulty', order: 'ASCENDING' },
        { fieldPath: 'language', order: 'ASCENDING' }
      ]
    }
  ],

  // Interviews collection indexes
  interviews: [
    {
      collectionGroup: 'interviews',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'user_id', order: 'ASCENDING' },
        { fieldPath: 'created_at', order: 'DESCENDING' }
      ]
    },
    {
      collectionGroup: 'interviews',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'user_id', order: 'ASCENDING' },
        { fieldPath: 'status', order: 'ASCENDING' },
        { fieldPath: 'created_at', order: 'DESCENDING' }
      ]
    },
    {
      collectionGroup: 'interviews',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'user_id', order: 'ASCENDING' },
        { fieldPath: 'interview_type', order: 'ASCENDING' },
        { fieldPath: 'created_at', order: 'DESCENDING' }
      ]
    },
    {
      collectionGroup: 'interviews',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'application_id', order: 'ASCENDING' },
        { fieldPath: 'created_at', order: 'DESCENDING' }
      ]
    },
    {
      collectionGroup: 'interviews',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'user_id', order: 'ASCENDING' },
        { fieldPath: 'best_score', order: 'DESCENDING' }
      ]
    },
    {
      collectionGroup: 'interviews',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'scheduled_date', order: 'ASCENDING' },
        { fieldPath: 'status', order: 'ASCENDING' }
      ]
    }
  ],

  // Interview attempts sub-collection indexes
  interview_attempts: [
    {
      collectionGroup: 'interview_attempts',
      queryScope: 'COLLECTION_GROUP',
      fields: [
        { fieldPath: 'interview_id', order: 'ASCENDING' },
        { fieldPath: 'start_time', order: 'DESCENDING' }
      ]
    },
    {
      collectionGroup: 'interview_attempts',
      queryScope: 'COLLECTION_GROUP',
      fields: [
        { fieldPath: 'interview_id', order: 'ASCENDING' },
        { fieldPath: 'score', order: 'DESCENDING' }
      ]
    },
    {
      collectionGroup: 'interview_attempts',
      queryScope: 'COLLECTION_GROUP',
      fields: [
        { fieldPath: 'status', order: 'ASCENDING' },
        { fieldPath: 'start_time', order: 'DESCENDING' }
      ]
    }
  ],

  // AI reports collection indexes
  ai_reports: [
    {
      collectionGroup: 'ai_reports',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'user_id', order: 'ASCENDING' },
        { fieldPath: 'generated_at', order: 'DESCENDING' }
      ]
    },
    {
      collectionGroup: 'ai_reports',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'user_id', order: 'ASCENDING' },
        { fieldPath: 'report_type', order: 'ASCENDING' },
        { fieldPath: 'generated_at', order: 'DESCENDING' }
      ]
    },
    {
      collectionGroup: 'ai_reports',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'application_id', order: 'ASCENDING' },
        { fieldPath: 'report_type', order: 'ASCENDING' }
      ]
    },
    {
      collectionGroup: 'ai_reports',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'interview_id', order: 'ASCENDING' },
        { fieldPath: 'generated_at', order: 'DESCENDING' }
      ]
    },
    {
      collectionGroup: 'ai_reports',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'user_id', order: 'ASCENDING' },
        { fieldPath: 'content.score', order: 'DESCENDING' }
      ]
    }
  ],

  // Documents collection indexes
  documents: [
    {
      collectionGroup: 'documents',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'user_id', order: 'ASCENDING' },
        { fieldPath: 'created_at', order: 'DESCENDING' }
      ]
    },
    {
      collectionGroup: 'documents',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'user_id', order: 'ASCENDING' },
        { fieldPath: 'type', order: 'ASCENDING' },
        { fieldPath: 'created_at', order: 'DESCENDING' }
      ]
    },
    {
      collectionGroup: 'documents',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'application_id', order: 'ASCENDING' },
        { fieldPath: 'type', order: 'ASCENDING' }
      ]
    },
    {
      collectionGroup: 'documents',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'user_id', order: 'ASCENDING' },
        { fieldPath: 'is_primary', order: 'ASCENDING' },
        { fieldPath: 'type', order: 'ASCENDING' }
      ]
    },
    {
      collectionGroup: 'documents',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'user_id', order: 'ASCENDING' },
        { fieldPath: 'tags', arrayConfig: 'CONTAINS' }
      ]
    }
  ],

  // Resume versions collection indexes
  resume_versions: [
    {
      collectionGroup: 'resume_versions',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'user_id', order: 'ASCENDING' },
        { fieldPath: 'created_at', order: 'DESCENDING' }
      ]
    },
    {
      collectionGroup: 'resume_versions',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'user_id', order: 'ASCENDING' },
        { fieldPath: 'is_active', order: 'ASCENDING' }
      ]
    },
    {
      collectionGroup: 'resume_versions',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'user_id', order: 'ASCENDING' },
        { fieldPath: 'last_used', order: 'DESCENDING' }
      ]
    },
    {
      collectionGroup: 'resume_versions',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'template_id', order: 'ASCENDING' },
        { fieldPath: 'usage_count', order: 'DESCENDING' }
      ]
    }
  ],

  // Resume templates collection indexes
  resume_templates: [
    {
      collectionGroup: 'resume_templates',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'category', order: 'ASCENDING' },
        { fieldPath: 'usage_count', order: 'DESCENDING' }
      ]
    },
    {
      collectionGroup: 'resume_templates',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'is_premium', order: 'ASCENDING' },
        { fieldPath: 'rating', order: 'DESCENDING' }
      ]
    },
    {
      collectionGroup: 'resume_templates',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'difficulty_level', order: 'ASCENDING' },
        { fieldPath: 'usage_count', order: 'DESCENDING' }
      ]
    },
    {
      collectionGroup: 'resume_templates',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'tags', arrayConfig: 'CONTAINS' },
        { fieldPath: 'rating', order: 'DESCENDING' }
      ]
    }
  ]
};

// Index creation utility
export class FirestoreIndexManager {
  private db = getFirestore();

  // Create all indexes programmatically (for development/testing)
  async createIndexes() {
    console.log('Creating Firestore indexes...');
    
    // Note: In production, indexes should be created via Firebase CLI or Console
    // This is primarily for documentation and local development
    
    try {
      // Log index requirements for manual creation
      console.log('Required Firestore indexes:');
      
      Object.entries(FIRESTORE_INDEXES).forEach(([collection, indexes]) => {
        console.log(`\n${collection.toUpperCase()} Collection:`);
        indexes.forEach((index, i) => {
          console.log(`  Index ${i + 1}:`);
          console.log(`    Query Scope: ${index.queryScope}`);
          console.log(`    Fields:`);
          index.fields.forEach(field => {
            if (field.arrayConfig) {
              console.log(`      - ${field.fieldPath} (${field.arrayConfig})`);
            } else {
              console.log(`      - ${field.fieldPath} (${field.order})`);
            }
          });
        });
      });

      console.log('\nIndexes logged successfully. Create them manually in Firebase Console.');
      return true;
    } catch (error) {
      console.error('Error logging indexes:', error);
      return false;
    }
  }

  // Generate Firebase CLI commands for index creation
  generateFirebaseCLICommands(): string[] {
    const commands: string[] = [];
    
    Object.entries(FIRESTORE_INDEXES).forEach(([collection, indexes]) => {
      indexes.forEach((index, i) => {
        const fields = index.fields.map(field => {
          if (field.arrayConfig) {
            return `${field.fieldPath}:${field.arrayConfig.toLowerCase()}`;
          }
          return `${field.fieldPath}:${field.order.toLowerCase()}`;
        }).join(',');
        
        const scope = index.queryScope === 'COLLECTION_GROUP' ? '--collection-group' : '';
        commands.push(
          `firebase firestore:indexes:create ${scope} --collection-id=${collection} --fields="${fields}"`
        );
      });
    });
    
    return commands;
  }

  // Validate that required indexes exist (for production health checks)
  async validateIndexes(): Promise<boolean> {
    try {
      // This would require additional Firebase Admin SDK methods
      // For now, we'll implement basic query validation
      console.log('Validating Firestore indexes...');
      
      // Test common queries to ensure indexes exist
      const testQueries = [
        // Users by email and status
        this.db.collection('users')
          .where('email', '==', 'test@example.com')
          .where('status', '==', 'active')
          .limit(1),
        
        // Applications by user and date
        this.db.collection('applications')
          .where('user_id', '==', 'test-user-id')
          .orderBy('application_date', 'desc')
          .limit(10),
        
        // Interviews by user and status
        this.db.collection('interviews')
          .where('user_id', '==', 'test-user-id')
          .where('status', '==', 'completed')
          .orderBy('created_at', 'desc')
          .limit(10)
      ];

      // Execute test queries (they will fail if indexes don't exist)
      for (const query of testQueries) {
        try {
          await query.get();
        } catch (error: any) {
          if (error.code === 'failed-precondition') {
            console.error('Missing index for query:', error.message);
            return false;
          }
        }
      }

      console.log('Index validation completed successfully');
      return true;
    } catch (error) {
      console.error('Error validating indexes:', error);
      return false;
    }
  }

  // Get index usage statistics (for optimization)
  async getIndexStats() {
    // This would require Firebase Admin SDK extensions
    // For now, return placeholder data
    return {
      totalIndexes: Object.values(FIRESTORE_INDEXES).flat().length,
      collectionIndexes: Object.fromEntries(
        Object.entries(FIRESTORE_INDEXES).map(([collection, indexes]) => [
          collection,
          indexes.length
        ])
      )
    };
  }
}

// Export commonly used query patterns for reference
export const COMMON_QUERY_PATTERNS = {
  // User queries
  getUserByEmail: (email: string) => 
    `users.where('email', '==', '${email}').where('status', '==', 'active')`,
  
  getUsersByLevel: (minLevel: number) =>
    `users.where('progress.level', '>=', ${minLevel}).orderBy('progress.xp', 'desc')`,

  // Application queries
  getUserApplications: (userId: string, status?: string) =>
    status 
      ? `applications.where('user_id', '==', '${userId}').where('status', '==', '${status}').orderBy('application_date', 'desc')`
      : `applications.where('user_id', '==', '${userId}').orderBy('application_date', 'desc')`,

  getApplicationsByDeadline: (userId: string, beforeDate: string) =>
    `applications.where('user_id', '==', '${userId}').where('deadline', '<=', '${beforeDate}').orderBy('deadline', 'asc')`,

  // Interview queries
  getUserInterviews: (userId: string, type?: string) =>
    type
      ? `interviews.where('user_id', '==', '${userId}').where('interview_type', '==', '${type}').orderBy('created_at', 'desc')`
      : `interviews.where('user_id', '==', '${userId}').orderBy('created_at', 'desc')`,

  getInterviewAttempts: (interviewId: string) =>
    `interviews/${interviewId}/interview_attempts.orderBy('start_time', 'desc')`,

  // Document queries
  getUserDocuments: (userId: string, type?: string) =>
    type
      ? `documents.where('user_id', '==', '${userId}').where('type', '==', '${type}').orderBy('created_at', 'desc')`
      : `documents.where('user_id', '==', '${userId}').orderBy('created_at', 'desc')`,

  // AI Report queries
  getUserReports: (userId: string, reportType?: string) =>
    reportType
      ? `ai_reports.where('user_id', '==', '${userId}').where('report_type', '==', '${reportType}').orderBy('generated_at', 'desc')`
      : `ai_reports.where('user_id', '==', '${userId}').orderBy('generated_at', 'desc')`
};

export default FirestoreIndexManager;
