/**
 * FIRESTORE DEBUG Mock Job Applications Script
 * 
 * Enhanced debug version that validates Firebase initialization
 * and provides detailed error logging.
 * 
 * Usage:
 * 1. Open your application in the browser
 * 2. Open browser console (F12 or right-click > Inspect > Console)
 * 3. Copy and paste this entire script into the console
 * 4. Press Enter to execute
 * 5. Check console for success/error messages
 */

// Self-executing function with improved error handling
(async function() {
  console.log('🔍 Starting Firebase SDK detection and mock data creation...');
  
  try {
    // Check for Firebase SDK availability with detailed error messages
    if (!window.firebase) {
      throw new Error('Firebase SDK not found on window object. Make sure Firebase is properly initialized.');
    }
    
    console.log('✓ Firebase SDK detected');
    
    // Different Firebase SDK versions have different structures
    let firestoreModule;
    let db;
    
    if (window.firebase.firestore) {
      console.log('✓ Found firebase.firestore API');
      firestoreModule = window.firebase.firestore;
      db = firestoreModule();
    } else if (window.firebase.app) {
      console.log('✓ Found firebase.app API');
      db = window.firebase.app().firestore();
      firestoreModule = db;
    } else {
      throw new Error('Could not locate Firebase Firestore module. Check Firebase SDK version and initialization.');
    }
    
    // Get necessary functions from Firestore
    const addDoc = firestoreModule.addDoc || firestoreModule.collection;
    const collection = firestoreModule.collection;
    const serverTimestamp = firestoreModule.serverTimestamp || firestoreModule.FieldValue?.serverTimestamp;
    
    if (!addDoc || !collection || !serverTimestamp) {
      throw new Error(`Missing required Firestore functions: ${!addDoc ? 'addDoc,' : ''} ${!collection ? 'collection,' : ''} ${!serverTimestamp ? 'serverTimestamp' : ''}`);
    }
    
    // Use specific user ID
    const targetUserId = 'wRj3wH7vR0eUdH6Ckf6ZjFnLjyg1';
    console.log(`Target user ID: ${targetUserId}`);
    
    // Get reference to subcollection
    let jobApplicationsCollection;
    try {
      jobApplicationsCollection = collection(db, 'users', targetUserId, 'jobApplications');
      console.log('\u2713 Successfully created collection reference');
    } catch (error) {
      throw new Error(`Failed to create collection reference: ${error.message}`);
    }
    
    // First try creating a simple test document to verify permissions
    console.log('Attempting to write a test document to verify permissions...');
    
    // Generate a simple test document
    const testDoc = {
      userId: targetUserId,
      company: { name: 'Test Company' },
      role: { title: 'Test Role' },
      status: 'Draft',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      _test: true
    };
    
    try {
      const testRef = await addDoc(jobApplicationsCollection, testDoc);
      console.log(`\u2713 Test document created successfully with ID: ${testRef.id}`);
      console.log('\u2713 Firestore writes are working correctly!');
      
      // Show where to find the data
      console.log('\n\u2705 IMPORTANT: Where to find your data in Firestore:\n' +
                 '1. Go to Firebase Console > Firestore\n' +
                 '2. Look for the "users" collection\n' +
                 '3. Find the document with ID: ' + targetUserId + '\n' +
                 '4. Inside that document, click the "jobApplications" subcollection\n');
      
      const continueWithMockData = confirm('Test document created successfully! Do you want to create 20 mock job applications?');
      
      if (!continueWithMockData) {
        console.log('Mock data creation cancelled by user.');
        return;
      }
      
      console.log('Proceeding with mock data creation...');
    } catch (error) {
      console.error('\u274c Error writing test document:', error);
      console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      console.error('\n\u2705 TROUBLESHOOTING TIPS:\n' +
                  '1. Check if you\'re properly logged in\n' +
                  '2. Ensure Firestore security rules allow writes to users/{userId}/jobApplications\n' +
                  '3. Check if the user ID is correct and exists in your users collection\n' +
                  '4. Verify your Firebase config has the correct projectId\n');
      return;
    }
    
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
    
    console.log(`Preparing to create 20 mock job applications for user: ${targetUserId}`);
    
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
        compensation: {
          minSalary: maybeAddField(minSalary),
          maxSalary: maybeAddField(maxSalary),
          currency: maybeAddField('USD'),
          period: maybeAddField('yearly'),
          benefits: maybeAddField(['Health Insurance', 'Remote Work', '401k'])
        },
        // Add salary field in either string or object format to match updated type definition
        salary: Math.random() > 0.5 
          ? `$${minSalary} - $${maxSalary} USD`
          : {
              min: minSalary,
              max: maxSalary,
              currency: '$'
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
        console.log(`Created job application ${index + 1} with ID: ${docRef.id}`);
        return docRef;
      } catch (error) {
        console.error(`Error creating job application ${index + 1}:`, error);
        throw error;
      }
    });
    
    // Wait for all applications to be created
    await Promise.all(mockApplicationsPromises);
    console.log('🎉 Successfully created all 20 mock job applications!');
    console.log('✅ Please refresh your job applications page to see the new data.');
    
  } catch (error) {
    console.error('❌ Error populating mock job applications:', error);
  }
})();
