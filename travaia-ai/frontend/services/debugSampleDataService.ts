/**
 * Debug Sample Data Service - Simplified version for troubleshooting permissions
 * This version tests each collection individually to identify permission issues
 */

import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  Timestamp,
  getFirestore 
} from 'firebase/firestore';
import { User } from 'firebase/auth';

interface DebugProgress {
  step: string;
  success: boolean;
  error?: string;
  details?: any;
}

export class DebugSampleDataService {
  private db = getFirestore();
  private progressCallback?: (progress: DebugProgress) => void;

  constructor(progressCallback?: (progress: DebugProgress) => void) {
    this.progressCallback = progressCallback;
  }

  private updateProgress(step: string, success: boolean, error?: string, details?: any) {
    this.progressCallback?.({ step, success, error, details });
  }

  async testFirestorePermissions(user: User): Promise<void> {
    console.log('🔍 Starting Firestore permissions test for user:', user.uid);
    
    try {
      // Test 1: User document
      this.updateProgress('Testing users collection', false);
      try {
        const userData = {
          email: user.email || 'test@example.com',
          username: 'testuser',
          profile_data: {
            first_name: 'Test',
            last_name: 'User'
          }
        };
        
        await setDoc(doc(this.db, 'users', user.uid), userData);
        this.updateProgress('Testing users collection', true, undefined, 'User document created successfully');
      } catch (error) {
        this.updateProgress('Testing users collection', false, error instanceof Error ? error.message : 'Unknown error');
        console.error('❌ Users collection test failed:', error);
      }

      // Test 2: Applications collection (using TRAVAIA's nested structure)
      this.updateProgress('Testing jobApplications collection (nested)', false);
      try {
        const applicationData = {
          job_title: 'Test Engineer',
          company_name: 'Test Company',
          link_to_job_post: 'https://example.com/job',
          job_description_text: 'Test job description',
          status: 'applied',
          application_date: Timestamp.now(),
          contacts: [],
          notes: [],
          ai_job_fit_report_id: ''
        };
        
        const docRef = await addDoc(collection(this.db, 'users', user.uid, 'jobApplications'), applicationData);
        this.updateProgress('Testing jobApplications collection (nested)', true, undefined, `Application created with ID: ${docRef.id}`);
      } catch (error) {
        this.updateProgress('Testing jobApplications collection (nested)', false, error instanceof Error ? error.message : 'Unknown error');
        console.error('❌ JobApplications collection test failed:', error);
      }

      // Test 3: Favorite jobs collection (using nested structure)
      this.updateProgress('Testing favoriteJobs collection (nested)', false);
      try {
        const favoriteData = {
          job_title: 'Test Position',
          company_name: 'Test Corp',
          link: 'https://example.com/favorite',
          saved_date: Timestamp.now()
        };
        
        const docRef = await addDoc(collection(this.db, 'users', user.uid, 'favoriteJobs'), favoriteData);
        this.updateProgress('Testing favoriteJobs collection (nested)', true, undefined, `Favorite job created with ID: ${docRef.id}`);
      } catch (error) {
        this.updateProgress('Testing favoriteJobs collection (nested)', false, error instanceof Error ? error.message : 'Unknown error');
        console.error('❌ Favorite jobs collection test failed:', error);
      }

      // Test 4: Interview questions collection (using nested structure)
      this.updateProgress('Testing interviewQuestions collection (nested)', false);
      try {
        const questionsData = {
          name: 'Test Questions',
          language: 'en',
          questions: ['Test question 1', 'Test question 2'],
          created_at: Timestamp.now()
        };
        
        const docRef = await addDoc(collection(this.db, 'users', user.uid, 'interviewQuestions'), questionsData);
        this.updateProgress('Testing interviewQuestions collection (nested)', true, undefined, `Question set created with ID: ${docRef.id}`);
      } catch (error) {
        this.updateProgress('Testing interviewQuestions collection (nested)', false, error instanceof Error ? error.message : 'Unknown error');
        console.error('❌ Interview questions collection test failed:', error);
      }

      // Test 5: Interviews collection (using nested structure)
      this.updateProgress('Testing interviews collection (nested)', false);
      try {
        const interviewData = {
          application_id: 'test-app-id',
          interview_type: 'technical',
          configuration: {
            difficulty: 'medium',
            language: 'en',
            question_set_id: 'test-questions-id'
          },
          status: 'completed'
        };
        
        const docRef = await addDoc(collection(this.db, 'users', user.uid, 'interviews'), interviewData);
        this.updateProgress('Testing interviews collection (nested)', true, undefined, `Interview created with ID: ${docRef.id}`);
      } catch (error) {
        this.updateProgress('Testing interviews collection (nested)', false, error instanceof Error ? error.message : 'Unknown error');
        console.error('❌ Interviews collection test failed:', error);
      }

      // Test 6: AI reports collection (using nested structure)
      this.updateProgress('Testing aiReports collection (nested)', false);
      try {
        const reportData = {
          application_id: 'test-app-id',
          interview_id: 'test-interview-id',
          report_type: 'job_fit',
          generated_at: Timestamp.now(),
          content: {
            score: 85,
            strengths: ['Good communication'],
            weaknesses: ['Needs more experience'],
            detailed_feedback: 'Test feedback',
            transcription: 'Test transcription'
          }
        };
        
        const docRef = await addDoc(collection(this.db, 'users', user.uid, 'aiReports'), reportData);
        this.updateProgress('Testing aiReports collection (nested)', true, undefined, `AI report created with ID: ${docRef.id}`);
      } catch (error) {
        this.updateProgress('Testing aiReports collection (nested)', false, error instanceof Error ? error.message : 'Unknown error');
        console.error('❌ AI reports collection test failed:', error);
      }

      // Test 7: Documents collection (using TRAVAIA's nested structure)
      this.updateProgress('Testing documents collection (nested)', false);
      try {
        const documentData = {
          application_id: 'test-app-id',
          file_name: 'test-resume.pdf',
          file_url: 'https://example.com/test-resume.pdf',
          type: 'resume',
          creation_date: Timestamp.now()
        };
        
        const docRef = await addDoc(collection(this.db, 'users', user.uid, 'documents'), documentData);
        this.updateProgress('Testing documents collection (nested)', true, undefined, `Document created with ID: ${docRef.id}`);
      } catch (error) {
        this.updateProgress('Testing documents collection (nested)', false, error instanceof Error ? error.message : 'Unknown error');
        console.error('❌ Documents collection test failed:', error);
      }

      console.log('✅ Firestore permissions test completed');

    } catch (error) {
      console.error('💥 Critical error during permissions test:', error);
      throw error;
    }
  }
}

export default DebugSampleDataService;
