import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { COLLECTIONS } from '../models/database-models';
import { DatabaseValidator } from '../validation/database-validators';

export interface ConsistencyViolation {
  type: 'missing_reference' | 'invalid_data' | 'orphaned_document' | 'duplicate_data' | 'timestamp_inconsistency';
  collection: string;
  documentId: string;
  field?: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ConsistencyReport {
  violations: ConsistencyViolation[];
  totalChecked: number;
  violationCount: number;
  checkDuration: number;
  timestamp: Timestamp;
}

export class DataConsistencyValidator {
  private db = getFirestore();

  // Run comprehensive data consistency checks
  async validateDataConsistency(): Promise<ConsistencyReport> {
    const startTime = Date.now();
    const violations: ConsistencyViolation[] = [];
    let totalChecked = 0;

    console.log('Starting comprehensive data consistency validation...');

    // Check each collection
    const checks = [
      this.validateUsers(),
      this.validateApplications(),
      this.validateInterviews(),
      this.validateDocuments(),
      this.validateAIReports(),
      this.validateResumeVersions(),
      this.validateFavoriteJobs(),
      this.validateInterviewQuestions()
    ];

    const results = await Promise.allSettled(checks);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        violations.push(...result.value.violations);
        totalChecked += result.value.checked;
      } else {
        violations.push({
          type: 'invalid_data',
          collection: 'system',
          documentId: 'validation_error',
          message: `Validation check ${index} failed: ${result.reason}`,
          severity: 'critical'
        });
      }
    });

    // Cross-collection consistency checks
    const crossChecks = await this.validateCrossCollectionConsistency();
    violations.push(...crossChecks.violations);
    totalChecked += crossChecks.checked;

    const report: ConsistencyReport = {
      violations,
      totalChecked,
      violationCount: violations.length,
      checkDuration: Date.now() - startTime,
      timestamp: Timestamp.now()
    };

    console.log(`Consistency validation completed: ${violations.length} violations found in ${totalChecked} documents`);
    return report;
  }

  // Validate users collection
  private async validateUsers(): Promise<{ violations: ConsistencyViolation[]; checked: number }> {
    const violations: ConsistencyViolation[] = [];
    const snapshot = await this.db.collection(COLLECTIONS.USERS).get();
    let checked = 0;

    for (const doc of snapshot.docs) {
      checked++;
      const data = doc.data();

      try {
        // Validate against schema
        DatabaseValidator.validateUser(data);
      } catch (error: any) {
        violations.push({
          type: 'invalid_data',
          collection: COLLECTIONS.USERS,
          documentId: doc.id,
          message: `Schema validation failed: ${error.message}`,
          severity: 'high'
        });
      }

      // Check required fields
      if (!data.user_id || data.user_id !== doc.id) {
        violations.push({
          type: 'invalid_data',
          collection: COLLECTIONS.USERS,
          documentId: doc.id,
          field: 'user_id',
          message: 'user_id must match document ID',
          severity: 'critical'
        });
      }

      // Check email format
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        violations.push({
          type: 'invalid_data',
          collection: COLLECTIONS.USERS,
          documentId: doc.id,
          field: 'email',
          message: 'Invalid email format',
          severity: 'medium'
        });
      }

      // Check timestamp consistency
      if (data.created_at && data.updated_at && data.created_at.toMillis() > data.updated_at.toMillis()) {
        violations.push({
          type: 'timestamp_inconsistency',
          collection: COLLECTIONS.USERS,
          documentId: doc.id,
          message: 'created_at is after updated_at',
          severity: 'medium'
        });
      }

      // Check profile data consistency
      if (data.profile_data) {
        if (data.profile_data.experience && Array.isArray(data.profile_data.experience)) {
          for (const exp of data.profile_data.experience) {
            if (exp.start_date && exp.end_date && exp.start_date > exp.end_date) {
              violations.push({
                type: 'invalid_data',
                collection: COLLECTIONS.USERS,
                documentId: doc.id,
                field: 'profile_data.experience',
                message: 'Experience start_date is after end_date',
                severity: 'medium'
              });
            }
          }
        }
      }
    }

    return { violations, checked };
  }

  // Validate applications collection
  private async validateApplications(): Promise<{ violations: ConsistencyViolation[]; checked: number }> {
    const violations: ConsistencyViolation[] = [];
    const snapshot = await this.db.collection(COLLECTIONS.APPLICATIONS).get();
    let checked = 0;

    for (const doc of snapshot.docs) {
      checked++;
      const data = doc.data();

      try {
        DatabaseValidator.validateApplication(data);
      } catch (error: any) {
        violations.push({
          type: 'invalid_data',
          collection: COLLECTIONS.APPLICATIONS,
          documentId: doc.id,
          message: `Schema validation failed: ${error.message}`,
          severity: 'high'
        });
      }

      // Check user reference exists
      if (data.user_id) {
        const userExists = await this.documentExists(COLLECTIONS.USERS, data.user_id);
        if (!userExists) {
          violations.push({
            type: 'missing_reference',
            collection: COLLECTIONS.APPLICATIONS,
            documentId: doc.id,
            field: 'user_id',
            message: `Referenced user ${data.user_id} does not exist`,
            severity: 'critical'
          });
        }
      }

      // Check salary range consistency
      if (data.salary_min && data.salary_max && data.salary_min > data.salary_max) {
        violations.push({
          type: 'invalid_data',
          collection: COLLECTIONS.APPLICATIONS,
          documentId: doc.id,
          field: 'salary',
          message: 'salary_min is greater than salary_max',
          severity: 'medium'
        });
      }

      // Check application date is not in future
      if (data.application_date && data.application_date.toMillis() > Date.now()) {
        violations.push({
          type: 'invalid_data',
          collection: COLLECTIONS.APPLICATIONS,
          documentId: doc.id,
          field: 'application_date',
          message: 'Application date is in the future',
          severity: 'medium'
        });
      }
    }

    return { violations, checked };
  }

  // Validate interviews collection
  private async validateInterviews(): Promise<{ violations: ConsistencyViolation[]; checked: number }> {
    const violations: ConsistencyViolation[] = [];
    const snapshot = await this.db.collection(COLLECTIONS.INTERVIEWS).get();
    let checked = 0;

    for (const doc of snapshot.docs) {
      checked++;
      const data = doc.data();

      try {
        DatabaseValidator.validateInterview(data);
      } catch (error: any) {
        violations.push({
          type: 'invalid_data',
          collection: COLLECTIONS.INTERVIEWS,
          documentId: doc.id,
          message: `Schema validation failed: ${error.message}`,
          severity: 'high'
        });
      }

      // Check user reference
      if (data.user_id) {
        const userExists = await this.documentExists(COLLECTIONS.USERS, data.user_id);
        if (!userExists) {
          violations.push({
            type: 'missing_reference',
            collection: COLLECTIONS.INTERVIEWS,
            documentId: doc.id,
            field: 'user_id',
            message: `Referenced user ${data.user_id} does not exist`,
            severity: 'critical'
          });
        }
      }

      // Check application reference (if provided)
      if (data.application_id) {
        const appExists = await this.documentExists(COLLECTIONS.APPLICATIONS, data.application_id);
        if (!appExists) {
          violations.push({
            type: 'missing_reference',
            collection: COLLECTIONS.INTERVIEWS,
            documentId: doc.id,
            field: 'application_id',
            message: `Referenced application ${data.application_id} does not exist`,
            severity: 'high'
          });
        }
      }

      // Check attempts count consistency
      const attemptsSnapshot = await doc.ref.collection(COLLECTIONS.INTERVIEW_ATTEMPTS).get();
      const actualAttempts = attemptsSnapshot.size;
      
      if (data.total_attempts !== actualAttempts) {
        violations.push({
          type: 'invalid_data',
          collection: COLLECTIONS.INTERVIEWS,
          documentId: doc.id,
          field: 'total_attempts',
          message: `total_attempts (${data.total_attempts}) doesn't match actual attempts (${actualAttempts})`,
          severity: 'medium'
        });
      }
    }

    return { violations, checked };
  }

  // Validate documents collection
  private async validateDocuments(): Promise<{ violations: ConsistencyViolation[]; checked: number }> {
    const violations: ConsistencyViolation[] = [];
    const snapshot = await this.db.collection(COLLECTIONS.DOCUMENTS).get();
    let checked = 0;

    for (const doc of snapshot.docs) {
      checked++;
      const data = doc.data();

      try {
        DatabaseValidator.validateDocument(data);
      } catch (error: any) {
        violations.push({
          type: 'invalid_data',
          collection: COLLECTIONS.DOCUMENTS,
          documentId: doc.id,
          message: `Schema validation failed: ${error.message}`,
          severity: 'high'
        });
      }

      // Check user reference
      if (data.user_id) {
        const userExists = await this.documentExists(COLLECTIONS.USERS, data.user_id);
        if (!userExists) {
          violations.push({
            type: 'missing_reference',
            collection: COLLECTIONS.DOCUMENTS,
            documentId: doc.id,
            field: 'user_id',
            message: `Referenced user ${data.user_id} does not exist`,
            severity: 'critical'
          });
        }
      }

      // Check file size is positive
      if (data.file_size_bytes && data.file_size_bytes <= 0) {
        violations.push({
          type: 'invalid_data',
          collection: COLLECTIONS.DOCUMENTS,
          documentId: doc.id,
          field: 'file_size_bytes',
          message: 'File size must be positive',
          severity: 'medium'
        });
      }

      // Check MIME type format
      if (data.mime_type && !data.mime_type.includes('/')) {
        violations.push({
          type: 'invalid_data',
          collection: COLLECTIONS.DOCUMENTS,
          documentId: doc.id,
          field: 'mime_type',
          message: 'Invalid MIME type format',
          severity: 'low'
        });
      }
    }

    return { violations, checked };
  }

  // Validate AI reports collection
  private async validateAIReports(): Promise<{ violations: ConsistencyViolation[]; checked: number }> {
    const violations: ConsistencyViolation[] = [];
    const snapshot = await this.db.collection(COLLECTIONS.AI_REPORTS).get();
    let checked = 0;

    for (const doc of snapshot.docs) {
      checked++;
      const data = doc.data();

      try {
        DatabaseValidator.validateAIReport(data);
      } catch (error: any) {
        violations.push({
          type: 'invalid_data',
          collection: COLLECTIONS.AI_REPORTS,
          documentId: doc.id,
          message: `Schema validation failed: ${error.message}`,
          severity: 'high'
        });
      }

      // Check user reference
      if (data.user_id) {
        const userExists = await this.documentExists(COLLECTIONS.USERS, data.user_id);
        if (!userExists) {
          violations.push({
            type: 'missing_reference',
            collection: COLLECTIONS.AI_REPORTS,
            documentId: doc.id,
            field: 'user_id',
            message: `Referenced user ${data.user_id} does not exist`,
            severity: 'critical'
          });
        }
      }

      // Check related entity references
      if (data.application_id) {
        const appExists = await this.documentExists(COLLECTIONS.APPLICATIONS, data.application_id);
        if (!appExists) {
          violations.push({
            type: 'missing_reference',
            collection: COLLECTIONS.AI_REPORTS,
            documentId: doc.id,
            field: 'application_id',
            message: `Referenced application ${data.application_id} does not exist`,
            severity: 'high'
          });
        }
      }

      if (data.interview_id) {
        const interviewExists = await this.documentExists(COLLECTIONS.INTERVIEWS, data.interview_id);
        if (!interviewExists) {
          violations.push({
            type: 'missing_reference',
            collection: COLLECTIONS.AI_REPORTS,
            documentId: doc.id,
            field: 'interview_id',
            message: `Referenced interview ${data.interview_id} does not exist`,
            severity: 'high'
          });
        }
      }
    }

    return { violations, checked };
  }

  // Validate resume versions collection
  private async validateResumeVersions(): Promise<{ violations: ConsistencyViolation[]; checked: number }> {
    const violations: ConsistencyViolation[] = [];
    const snapshot = await this.db.collection(COLLECTIONS.RESUME_VERSIONS).get();
    let checked = 0;

    for (const doc of snapshot.docs) {
      checked++;
      const data = doc.data();

      try {
        DatabaseValidator.validateResumeVersion(data);
      } catch (error: any) {
        violations.push({
          type: 'invalid_data',
          collection: COLLECTIONS.RESUME_VERSIONS,
          documentId: doc.id,
          message: `Schema validation failed: ${error.message}`,
          severity: 'high'
        });
      }

      // Check user reference
      if (data.user_id) {
        const userExists = await this.documentExists(COLLECTIONS.USERS, data.user_id);
        if (!userExists) {
          violations.push({
            type: 'missing_reference',
            collection: COLLECTIONS.RESUME_VERSIONS,
            documentId: doc.id,
            field: 'user_id',
            message: `Referenced user ${data.user_id} does not exist`,
            severity: 'critical'
          });
        }
      }

      // Check template reference (if provided)
      if (data.template_id) {
        const templateExists = await this.documentExists(COLLECTIONS.RESUME_TEMPLATES, data.template_id);
        if (!templateExists) {
          violations.push({
            type: 'missing_reference',
            collection: COLLECTIONS.RESUME_VERSIONS,
            documentId: doc.id,
            field: 'template_id',
            message: `Referenced template ${data.template_id} does not exist`,
            severity: 'medium'
          });
        }
      }
    }

    return { violations, checked };
  }

  // Validate favorite jobs collection
  private async validateFavoriteJobs(): Promise<{ violations: ConsistencyViolation[]; checked: number }> {
    const violations: ConsistencyViolation[] = [];
    const snapshot = await this.db.collection(COLLECTIONS.FAVORITE_JOBS).get();
    let checked = 0;

    for (const doc of snapshot.docs) {
      checked++;
      const data = doc.data();

      try {
        DatabaseValidator.validateFavoriteJob(data);
      } catch (error: any) {
        violations.push({
          type: 'invalid_data',
          collection: COLLECTIONS.FAVORITE_JOBS,
          documentId: doc.id,
          message: `Schema validation failed: ${error.message}`,
          severity: 'high'
        });
      }

      // Check user reference
      if (data.user_id) {
        const userExists = await this.documentExists(COLLECTIONS.USERS, data.user_id);
        if (!userExists) {
          violations.push({
            type: 'missing_reference',
            collection: COLLECTIONS.FAVORITE_JOBS,
            documentId: doc.id,
            field: 'user_id',
            message: `Referenced user ${data.user_id} does not exist`,
            severity: 'critical'
          });
        }
      }
    }

    return { violations, checked };
  }

  // Validate interview questions collection
  private async validateInterviewQuestions(): Promise<{ violations: ConsistencyViolation[]; checked: number }> {
    const violations: ConsistencyViolation[] = [];
    const snapshot = await this.db.collection(COLLECTIONS.INTERVIEW_QUESTIONS).get();
    let checked = 0;

    for (const doc of snapshot.docs) {
      checked++;
      const data = doc.data();

      try {
        DatabaseValidator.validateInterviewQuestion(data);
      } catch (error: any) {
        violations.push({
          type: 'invalid_data',
          collection: COLLECTIONS.INTERVIEW_QUESTIONS,
          documentId: doc.id,
          message: `Schema validation failed: ${error.message}`,
          severity: 'high'
        });
      }

      // Check user reference (if provided)
      if (data.user_id) {
        const userExists = await this.documentExists(COLLECTIONS.USERS, data.user_id);
        if (!userExists) {
          violations.push({
            type: 'missing_reference',
            collection: COLLECTIONS.INTERVIEW_QUESTIONS,
            documentId: doc.id,
            field: 'user_id',
            message: `Referenced user ${data.user_id} does not exist`,
            severity: 'high'
          });
        }
      }
    }

    return { violations, checked };
  }

  // Cross-collection consistency checks
  private async validateCrossCollectionConsistency(): Promise<{ violations: ConsistencyViolation[]; checked: number }> {
    const violations: ConsistencyViolation[] = [];
    let checked = 0;

    // Check for duplicate emails across users
    const usersSnapshot = await this.db.collection(COLLECTIONS.USERS).get();
    const emails = new Map<string, string[]>();
    
    usersSnapshot.forEach(doc => {
      checked++;
      const email = doc.data().email;
      if (email) {
        if (!emails.has(email)) {
          emails.set(email, []);
        }
        emails.get(email)!.push(doc.id);
      }
    });

    emails.forEach((userIds, email) => {
      if (userIds.length > 1) {
        violations.push({
          type: 'duplicate_data',
          collection: COLLECTIONS.USERS,
          documentId: userIds.join(', '),
          field: 'email',
          message: `Duplicate email ${email} found in users: ${userIds.join(', ')}`,
          severity: 'critical'
        });
      }
    });

    return { violations, checked };
  }

  // Helper method to check if document exists
  private async documentExists(collection: string, documentId: string): Promise<boolean> {
    try {
      const doc = await this.db.collection(collection).doc(documentId).get();
      return doc.exists;
    } catch (error) {
      return false;
    }
  }

  // Fix violations automatically where possible
  async fixViolations(violations: ConsistencyViolation[]): Promise<{ fixed: number; errors: string[] }> {
    let fixedCount = 0;
    const errors: string[] = [];

    for (const violation of violations) {
      try {
        switch (violation.type) {
          case 'orphaned_document':
            await this.db.collection(violation.collection).doc(violation.documentId).delete();
            fixedCount++;
            break;
            
          case 'timestamp_inconsistency':
            await this.db.collection(violation.collection).doc(violation.documentId).update({
              updated_at: Timestamp.now()
            });
            fixedCount++;
            break;
            
          // Add more auto-fix cases as needed
          default:
            // Cannot auto-fix this violation type
            break;
        }
      } catch (error: any) {
        errors.push(`Failed to fix ${violation.type} in ${violation.collection}/${violation.documentId}: ${error.message}`);
      }
    }

    return { fixed: fixedCount, errors };
  }

  // Generate consistency report
  generateReport(report: ConsistencyReport): string {
    const severityCounts = report.violations.reduce((acc, violation) => {
      acc[violation.severity] = (acc[violation.severity] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    return `
# Data Consistency Report
Generated: ${report.timestamp.toDate().toISOString()}
Duration: ${report.checkDuration}ms

## Summary
- Total documents checked: ${report.totalChecked}
- Total violations found: ${report.violationCount}

## Violations by Severity
- Critical: ${severityCounts.critical || 0}
- High: ${severityCounts.high || 0}
- Medium: ${severityCounts.medium || 0}
- Low: ${severityCounts.low || 0}

## Detailed Violations
${report.violations.map(v => 
  `- [${v.severity.toUpperCase()}] ${v.collection}/${v.documentId}${v.field ? ` (${v.field})` : ''}: ${v.message}`
).join('\n')}
    `.trim();
  }
}

export default DataConsistencyValidator;
