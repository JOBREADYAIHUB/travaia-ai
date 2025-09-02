/**
 * Sample Data Service - Generates comprehensive Firestore sample data
 * Populates all collections with realistic, interconnected data
 */

import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  Timestamp,
  writeBatch,
  getFirestore 
} from 'firebase/firestore';
import { User } from 'firebase/auth';

interface SampleDataProgress {
  step: string;
  progress: number;
  total: number;
  message: string;
}

export class SampleDataService {
  private db = getFirestore();
  private progressCallback?: (progress: SampleDataProgress) => void;

  constructor(progressCallback?: (progress: SampleDataProgress) => void) {
    this.progressCallback = progressCallback;
  }

  private updateProgress(step: string, progress: number, total: number, message: string) {
    this.progressCallback?.({ step, progress, total, message });
  }

  private generateRandomId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private getRandomDate(daysBack: number = 90): Timestamp {
    const now = new Date();
    const randomDays = Math.floor(Math.random() * daysBack);
    const date = new Date(now.getTime() - (randomDays * 24 * 60 * 60 * 1000));
    return Timestamp.fromDate(date);
  }

  private generateUserProfile(user: User) {
    const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
    const cities = ['New York', 'San Francisco', 'Seattle', 'Austin', 'Boston', 'Chicago', 'Denver', 'Portland'];
    const states = ['NY', 'CA', 'WA', 'TX', 'MA', 'IL', 'CO', 'OR'];
    const skills = [
      'JavaScript', 'Python', 'React', 'Node.js', 'TypeScript', 'AWS', 'Docker', 'Kubernetes',
      'Machine Learning', 'Data Analysis', 'Project Management', 'Agile', 'SQL', 'MongoDB',
      'GraphQL', 'Vue.js', 'Angular', 'DevOps', 'CI/CD', 'Microservices'
    ];

    const firstName = this.getRandomElement(firstNames);
    const lastName = this.getRandomElement(lastNames);
    const city = this.getRandomElement(cities);
    const state = this.getRandomElement(states);

    return {
      email: user.email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      username: `${firstName.toLowerCase()}${lastName.toLowerCase()}${Math.floor(Math.random() * 100)}`,
      profile_data: {
        first_name: firstName,
        last_name: lastName,
        phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        address: {
          city,
          state,
          zip: `${Math.floor(Math.random() * 90000) + 10000}`
        },
        linkedin_url: `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
        portfolio_url: `https://${firstName.toLowerCase()}${lastName.toLowerCase()}.dev`,
        skills: this.getRandomElement([3, 4, 5, 6, 7]).toString().split('').map(() => 
          this.getRandomElement(skills)
        ).filter((skill, index, arr) => arr.indexOf(skill) === index),
        education: [
          {
            institution: this.getRandomElement(['MIT', 'Stanford', 'UC Berkeley', 'Carnegie Mellon', 'Harvard']),
            degree: this.getRandomElement(['Bachelor of Science', 'Master of Science', 'Bachelor of Arts']),
            field: this.getRandomElement(['Computer Science', 'Software Engineering', 'Data Science', 'Information Systems']),
            graduation_year: 2018 + Math.floor(Math.random() * 6),
            gpa: (3.0 + Math.random() * 1.0).toFixed(2)
          }
        ],
        experience: [
          {
            company: this.getRandomElement(['Google', 'Microsoft', 'Amazon', 'Meta', 'Apple', 'Netflix', 'Uber']),
            position: this.getRandomElement(['Software Engineer', 'Senior Developer', 'Full Stack Developer', 'Backend Engineer']),
            start_date: this.getRandomDate(1095), // 3 years back
            end_date: this.getRandomDate(365), // 1 year back
            description: 'Developed and maintained scalable web applications using modern technologies.'
          }
        ]
      },
      progress: {
        xp: Math.floor(Math.random() * 5000) + 1000,
        level: Math.floor(Math.random() * 10) + 1,
        streak: Math.floor(Math.random() * 30),
        weekly_challenge_id: this.generateRandomId()
      },
      settings: {
        theme: this.getRandomElement(['light', 'dark']),
        language: this.getRandomElement(['en', 'es', 'fr', 'de']),
        notifications_enabled: Math.random() > 0.3
      }
    };
  }

  private generateApplications(userId: string, count: number = 8) {
    const companies = [
      'Google', 'Microsoft', 'Amazon', 'Meta', 'Apple', 'Netflix', 'Uber', 'Airbnb',
      'Spotify', 'Slack', 'Zoom', 'Dropbox', 'Stripe', 'Square', 'Coinbase', 'Shopify'
    ];
    const positions = [
      'Senior Software Engineer', 'Full Stack Developer', 'Backend Engineer', 'Frontend Developer',
      'DevOps Engineer', 'Data Scientist', 'Product Manager', 'Engineering Manager',
      'Staff Engineer', 'Principal Engineer', 'Lead Developer', 'Software Architect'
    ];
    const statuses = ['applied', 'screening', 'interview', 'offer', 'rejected', 'hired'];

    return Array.from({ length: count }, () => {
      const company = this.getRandomElement(companies);
      const position = this.getRandomElement(positions);
      
      return {
        user_id: userId,
        job_title: position,
        company_name: company,
        link_to_job_post: `https://${company.toLowerCase().replace(/\s+/g, '')}.com/careers/${this.generateRandomId()}`,
        job_description_text: `We are looking for a ${position} to join our team at ${company}. The ideal candidate will have experience with modern web technologies, cloud platforms, and agile development practices. You will work on cutting-edge projects that impact millions of users worldwide.`,
        status: this.getRandomElement(statuses),
        application_date: this.getRandomDate(),
        contacts: [
          {
            name: `${this.getRandomElement(['John', 'Jane', 'Mike', 'Sarah', 'David', 'Lisa'])} ${this.getRandomElement(['Smith', 'Johnson', 'Brown', 'Davis'])}`,
            role: this.getRandomElement(['Hiring Manager', 'Technical Recruiter', 'Engineering Manager', 'HR Specialist']),
            email: `contact@${company.toLowerCase().replace(/\s+/g, '')}.com`,
            phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`
          }
        ],
        notes: [
          {
            content: this.getRandomElement([
              'Great company culture and benefits package',
              'Technical interview scheduled for next week',
              'Need to prepare system design questions',
              'Positive feedback from initial screening',
              'Competitive salary range discussed'
            ]),
            created_at: this.getRandomDate(30),
            type: 'general'
          }
        ],
        ai_job_fit_report_id: '' // Will be populated after creating AI reports
      };
    });
  }

  private generateFavoriteJobs(userId: string, count: number = 5) {
    const companies = ['Tesla', 'SpaceX', 'OpenAI', 'Anthropic', 'DeepMind', 'Palantir'];
    const positions = ['AI Engineer', 'ML Engineer', 'Research Scientist', 'Data Scientist'];

    return Array.from({ length: count }, () => ({
      user_id: userId,
      job_title: this.getRandomElement(positions),
      company_name: this.getRandomElement(companies),
      link: `https://careers.example.com/${this.generateRandomId()}`,
      saved_date: this.getRandomDate(60)
    }));
  }

  private generateInterviewQuestions(userId: string, count: number = 3) {
    const questionSets = [
      {
        name: 'JavaScript Fundamentals',
        language: 'en',
        questions: [
          'Explain the difference between let, const, and var',
          'What is closure in JavaScript?',
          'How does prototypal inheritance work?',
          'Explain event delegation',
          'What are promises and how do they work?'
        ]
      },
      {
        name: 'System Design',
        language: 'en',
        questions: [
          'Design a URL shortening service like bit.ly',
          'How would you design a chat application?',
          'Design a social media feed',
          'How would you handle rate limiting?',
          'Design a distributed cache system'
        ]
      },
      {
        name: 'Behavioral Questions',
        language: 'en',
        questions: [
          'Tell me about a challenging project you worked on',
          'How do you handle conflicts in a team?',
          'Describe a time you had to learn something new quickly',
          'How do you prioritize tasks when everything is urgent?',
          'Tell me about a mistake you made and how you handled it'
        ]
      }
    ];

    return Array.from({ length: count }, (_, index) => ({
      user_id: userId,
      ...questionSets[index % questionSets.length],
      created_at: this.getRandomDate(30)
    }));
  }

  private generateInterviews(userId: string, applicationIds: string[], count: number = 4) {
    const types = ['behavioral', 'technical', 'system_design', 'cultural_fit'];
    const difficulties = ['easy', 'medium', 'hard'];
    const languages = ['en', 'es', 'fr'];
    const statuses = ['scheduled', 'completed', 'cancelled'];

    return Array.from({ length: count }, () => ({
      user_id: userId,
      application_id: this.getRandomElement(applicationIds),
      interview_type: this.getRandomElement(types),
      configuration: {
        difficulty: this.getRandomElement(difficulties),
        language: this.getRandomElement(languages),
        question_set_id: this.generateRandomId()
      },
      status: this.getRandomElement(statuses)
    }));
  }

  private generateAIReports(userId: string, applicationIds: string[], interviewIds: string[], count: number = 10) {
    const reportTypes = ['job_fit', 'interview_feedback', 'skill_assessment', 'performance_analysis'];
    const strengths = [
      'Strong technical skills', 'Excellent communication', 'Problem-solving abilities',
      'Leadership potential', 'Team collaboration', 'Adaptability', 'Creative thinking'
    ];
    const weaknesses = [
      'Could improve system design knowledge', 'Need more experience with cloud platforms',
      'Could benefit from more practice with algorithms', 'Public speaking could be improved'
    ];

    return Array.from({ length: count }, () => ({
      user_id: userId,
      application_id: Math.random() > 0.3 ? this.getRandomElement(applicationIds) : null,
      interview_id: Math.random() > 0.5 ? this.getRandomElement(interviewIds) : null,
      report_type: this.getRandomElement(reportTypes),
      generated_at: this.getRandomDate(60),
      content: {
        score: Math.floor(Math.random() * 40) + 60, // 60-100 range
        strengths: Array.from({ length: Math.floor(Math.random() * 3) + 2 }, () => 
          this.getRandomElement(strengths)
        ).filter((item, index, arr) => arr.indexOf(item) === index),
        weaknesses: Array.from({ length: Math.floor(Math.random() * 2) + 1 }, () => 
          this.getRandomElement(weaknesses)
        ).filter((item, index, arr) => arr.indexOf(item) === index),
        detailed_feedback: 'The candidate demonstrated strong technical abilities and good problem-solving skills. Areas for improvement include system design and cloud architecture knowledge.',
        transcription: 'Q: Tell me about yourself. A: I am a software engineer with 5 years of experience...'
      }
    }));
  }

  private generateDocuments(userId: string, applicationIds: string[], count: number = 6) {
    const documentTypes = ['resume', 'cover_letter', 'portfolio', 'certificate', 'transcript'];
    const fileNames = [
      'Resume_2024.pdf', 'Cover_Letter_Google.pdf', 'Portfolio_Website.pdf',
      'AWS_Certificate.pdf', 'University_Transcript.pdf', 'Project_Documentation.pdf'
    ];

    return Array.from({ length: count }, (_, index) => ({
      user_id: userId,
      application_id: Math.random() > 0.4 ? this.getRandomElement(applicationIds) : null,
      file_name: fileNames[index % fileNames.length],
      file_url: `https://storage.googleapis.com/travaia-documents/${userId}/${this.generateRandomId()}.pdf`,
      type: this.getRandomElement(documentTypes),
      creation_date: this.getRandomDate(120)
    }));
  }

  async populateDatabase(user: User): Promise<void> {
    try {
      this.updateProgress('Starting', 0, 100, 'Initializing sample data generation...');

      // Step 1: Create user profile
      this.updateProgress('User Profile', 10, 100, 'Creating user profile...');
      const userProfile = this.generateUserProfile(user);
      await setDoc(doc(this.db, 'users', user.uid), userProfile);

      // Step 2: Create applications (using TRAVAIA's nested structure)
      this.updateProgress('Applications', 20, 100, 'Creating job applications...');
      const applications = this.generateApplications(user.uid);
      const applicationIds: string[] = [];
      
      for (const application of applications) {
        const docRef = await addDoc(collection(this.db, 'users', user.uid, 'jobApplications'), application);
        applicationIds.push(docRef.id);
      }

      // Step 3: Create favorite jobs (using nested structure)
      this.updateProgress('Favorites', 30, 100, 'Creating favorite jobs...');
      const favoriteJobs = this.generateFavoriteJobs(user.uid);
      for (const favorite of favoriteJobs) {
        await addDoc(collection(this.db, 'users', user.uid, 'favoriteJobs'), favorite);
      }

      // Step 4: Create interview questions (using nested structure)
      this.updateProgress('Questions', 40, 100, 'Creating interview question sets...');
      const questionSets = this.generateInterviewQuestions(user.uid);
      const questionSetIds: string[] = [];
      
      for (const questionSet of questionSets) {
        const docRef = await addDoc(collection(this.db, 'users', user.uid, 'interviewQuestions'), questionSet);
        questionSetIds.push(docRef.id);
      }

      // Step 5: Create interviews (using nested structure)
      this.updateProgress('Interviews', 50, 100, 'Creating interview records...');
      const interviews = this.generateInterviews(user.uid, applicationIds);
      const interviewIds: string[] = [];
      
      for (const interview of interviews) {
        const docRef = await addDoc(collection(this.db, 'users', user.uid, 'interviews'), interview);
        interviewIds.push(docRef.id);
        
        // Create interview attempts sub-collection
        const attemptsCount = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < attemptsCount; i++) {
          await addDoc(collection(this.db, 'users', user.uid, 'interviews', docRef.id, 'attempts'), {
            attempt_number: i + 1,
            score: Math.floor(Math.random() * 40) + 60,
            recording_url: `https://storage.googleapis.com/travaia-recordings/${user.uid}/${this.generateRandomId()}.mp4`,
            feedback_report_id: '', // Will be updated after creating AI reports
            completed_at: this.getRandomDate(30)
          });
        }
      }

      // Step 6: Create AI reports (using nested structure)
      this.updateProgress('AI Reports', 70, 100, 'Generating AI analysis reports...');
      const aiReports = this.generateAIReports(user.uid, applicationIds, interviewIds);
      const aiReportIds: string[] = [];
      
      for (const report of aiReports) {
        const docRef = await addDoc(collection(this.db, 'users', user.uid, 'aiReports'), report);
        aiReportIds.push(docRef.id);
      }

      // Step 7: Update references
      this.updateProgress('References', 80, 100, 'Updating document references...');
      
      // Update applications with AI report references (using nested structure)
      const batch = writeBatch(this.db);
      for (let i = 0; i < applicationIds.length; i++) {
        if (i < aiReportIds.length) {
          const appRef = doc(this.db, 'users', user.uid, 'jobApplications', applicationIds[i]);
          batch.update(appRef, { ai_job_fit_report_id: aiReportIds[i] });
        }
      }
      await batch.commit();

      // Step 8: Create documents (using TRAVAIA's nested structure)
      this.updateProgress('Documents', 90, 100, 'Creating document records...');
      const documents = this.generateDocuments(user.uid, applicationIds);
      for (const document of documents) {
        await addDoc(collection(this.db, 'users', user.uid, 'documents'), document);
      }

      this.updateProgress('Complete', 100, 100, 'Sample data generation completed successfully!');

    } catch (error) {
      console.error('Error populating database:', error);
      throw new Error(`Failed to populate database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default SampleDataService;
