/**
 * Mock Job Applications Population Script
 * 
 * This script populates a specific user account with mock job application data.
 * It uses the hierarchical Firestore path model (users/{userId}/jobApplications).
 * Run this script in your browser console while logged in to your application.
 * 
 * Usage:
 * 1. Open your application in the browser
 * 2. Open the browser console (F12 or right-click > Inspect > Console)
 * 3. Copy and paste this entire script into the console
 * 4. Press Enter to execute
 * 5. Refresh your job applications page to see the mock data
 */

// Import required Firebase modules
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Run this as an immediately-invoked function to allow for async/await
(async function() {
  try {
    // Use specified user ID
    const targetUserId = 'wRj3wH7vR0eUdH6Ckf6ZjFnLjyg1';
    console.log(`Creating mock job applications for user: ${targetUserId}`);
    
    // Initialize Firestore with hierarchical path
    const db = getFirestore();
    const jobApplicationsCollection = collection(db, 'users', targetUserId, 'jobApplications');
    
    // Mock application statuses
    const statuses = [
      'Draft',
      'Applied',
      'InterviewScheduled',
      'Interviewed',
      'AssessmentPending',
      'WaitingResponse',
      'OfferReceived',
      'Rejected',
      'Hired'
    ];
    
    // Mock company names
    const companies = [
      'Google',
      'Microsoft',
      'Apple',
      'Amazon',
      'Meta',
      'Netflix',
      'Airbnb',
      'Uber',
      'Shopify',
      'Twitter'
    ];
    
    // Mock job titles
    const jobTitles = [
      'Frontend Developer',
      'Backend Engineer',
      'Full Stack Developer',
      'DevOps Engineer',
      'Data Scientist',
      'Product Manager',
      'UX Designer',
      'Project Manager',
      'QA Tester',
      'Technical Writer'
    ];
    
    // Mock company departments
    const departments = [
      'Engineering',
      'Product',
      'Design',
      'Marketing',
      'Sales',
      'Customer Support',
      'Operations',
      'Human Resources',
      'Finance',
      null // Some might not have department
    ];
    
    // Mock company sizes
    const companySizes = [
      'Startup',
      'Enterprise',
      'NGO',
      null // Some might not have size specified
    ];
    
    // Mock industries
    const industries = [
      'Technology',
      'Finance',
      'Healthcare',
      'Education',
      'Retail',
      'Manufacturing',
      'Media',
      'Government',
      'Non-profit',
      null // Some might not have industry specified
    ];
    
    // Mock job types
    const jobTypes = [
      'Full-time',
      'Part-time',
      'Contract',
      'Internship',
      'Freelance'
    ];
    
    // Mock employment modes
    const employmentModes = [
      'On-site',
      'Remote',
      'Hybrid'
    ];
    
    // Mock application sources
    const applicationSources = [
      'JobBoard',
      'CompanyCareerPage',
      'RecruiterReferral',
      'NetworkingEvent',
      'InternalTransfer',
      'Recruiter',
      'Other'
    ];
    
    // Mock priority levels
    const priorityLevels = [
      'High',
      'Medium',
      'Low'
    ];
    
    // Helper function to get a random item from an array
    const getRandomItem = (array) => array[Math.floor(Math.random() * array.length)];
    
    // Helper function to get a random date within the past 3 months
    const getRandomDate = () => {
      const now = new Date();
      const threeMonthsAgo = new Date(now.setMonth(now.getMonth() - 3));
      return new Date(threeMonthsAgo.getTime() + Math.random() * (Date.now() - threeMonthsAgo.getTime()));
    };
    
    // Helper function to maybe add a field (30% chance of being null)
    const maybeAddField = (value) => {
      return Math.random() > 0.3 ? value : null;
    };
    
    // Create 20 mock job applications
    const mockApplicationsPromises = Array(20).fill().map(async (_, index) => {
      // Generate application date (random within last 3 months)
      const applicationDate = getRandomDate();
      
      // Random compensation
      const minSalary = Math.floor(Math.random() * 50000) + 50000;
      const maxSalary = minSalary + Math.floor(Math.random() * 30000);
      
      const mockApplication = {
        userId: targetUserId,
        status: getRandomItem(statuses),
        company: {
          name: getRandomItem(companies),
          department: maybeAddField(getRandomItem(departments)),
          sizeType: maybeAddField(getRandomItem(companySizes)),
          industry: maybeAddField(getRandomItem(industries))
        },
        role: {
          title: getRandomItem(jobTitles),
          jobId: maybeAddField(`JOB-${Math.floor(Math.random() * 10000)}`)
        },
        jobDetails: {
          description: maybeAddField(`This is a mock job description for position ${index + 1}.`),
          requirements: maybeAddField(`Requirements for position ${index + 1}.`),
          responsibilities: maybeAddField(`Responsibilities for position ${index + 1}.`),
          type: getRandomItem(jobTypes),
          mode: getRandomItem(employmentModes),
          location: maybeAddField(`City ${index + 1}, Country`),
          department: maybeAddField(getRandomItem(departments))
        },
        applicationDetails: {
          source: getRandomItem(applicationSources),
          appliedDate: applicationDate,
          contactPerson: maybeAddField(`Contact Person ${index + 1}`),
          contactEmail: maybeAddField(`contact${index + 1}@company.com`),
          referredBy: maybeAddField(`Referrer ${index + 1}`),
          notes: maybeAddField(`Notes for application ${index + 1}.`),
          priority: getRandomItem(priorityLevels)
        },
        // Add salary field formatted consistently with updated type definition
        salary: Math.random() > 0.5 
          ? `$${minSalary} - $${maxSalary} USD`
          : { min: minSalary, max: maxSalary, currency: '$' },
        compensation: {
          minSalary: maybeAddField(minSalary),
          maxSalary: maybeAddField(maxSalary),
          currency: maybeAddField('USD'),
          period: maybeAddField('yearly'),
          benefits: maybeAddField(['Health Insurance', 'Remote Work', '401k'])
        },
        tracking: {
          lastStatusUpdateDate: serverTimestamp(),
          lastContactDate: maybeAddField(serverTimestamp()),
          nextFollowUpDate: maybeAddField(serverTimestamp()),
          interviewDates: maybeAddField([serverTimestamp()]),
          rejectionReason: Math.random() > 0.8 ? 'Position filled internally' : null
        },
        documents: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      try {
        const docRef = await addDoc(jobApplicationsCollection, mockApplication);
        console.log(`Created job application with ID: ${docRef.id}`);
        return docRef;
      } catch (error) {
        console.error(`Error creating job application: ${error.message}`);
        throw error;
      }
    });
    
    // Wait for all applications to be created
    await Promise.all(mockApplicationsPromises);
    console.log('Successfully created all mock job applications!');
    console.log('Please refresh your job applications page to see the new data.');
    
  } catch (error) {
    console.error('Error populating mock job applications:', error);
  }
})();
