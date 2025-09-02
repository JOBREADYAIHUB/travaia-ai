// This script will create 20 mock job applications in your Firestore database
// under the path users/{userId}/jobApplications
// To use this script:
// 1. Log in to your application
// 2. Open your browser console (F12 or Ctrl+Shift+J)
// 3. Paste this entire script into the console and press Enter

(async function createMockData() {
  // Check if Firebase is initialized
  if (!firebase || !firebase.auth || !firebase.firestore) {
    console.error("Firebase SDK not found. Make sure you're logged in and running this script from your application's page.");
    return;
  }

  try {
    // Get current user
    const currentUser = firebase.auth().currentUser;
    
    if (!currentUser) {
      console.error("You must be logged in to create mock data.");
      alert("Please log in first to create mock data.");
      return;
    }

    // Confirm before proceeding
    if (!confirm("Are you sure you want to create 20 mock job applications? This cannot be undone.")) {
      return;
    }

    console.log('Starting mock data creation...');
    console.log('User ID:', currentUser.uid);
    
    // First, refresh token to ensure we have fresh permissions
    await currentUser.getIdToken(true);
    console.log('Auth token refreshed successfully.');
    
    const db = firebase.firestore();
    const targetUserId = currentUser.uid;
    const jobApplicationsCollection = db.collection(`users/${targetUserId}/jobApplications`);
    
    // Create a test document first to verify permissions
    console.log('Creating test document to verify permissions...');
    
    await jobApplicationsCollection.add({
      userId: targetUserId,
      company: { name: 'Test Company' },
      role: { title: 'Test Role' },
      status: 'Applied', // String literal instead of enum
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    
    console.log('Test document created successfully. Now creating mock data...');
    
    // Mock data generation with explicit values
    const companies = ['Google', 'Apple', 'Microsoft', 'Amazon', 'Meta', 'Netflix', 'Tesla', 'Twitter', 'IBM', 'Intel'];
    const roles = ['Frontend Developer', 'Backend Developer', 'Full-Stack Developer', 'DevOps Engineer', 'Data Scientist', 'Product Manager', 'UI/UX Designer', 'QA Engineer'];
    // Use string literals instead of enum values to avoid any issues
    const statuses = ['Draft', 'Applied', 'Interviewed', 'OfferReceived', 'Rejected'];
    const locations = ['Remote', 'New York', 'San Francisco', 'Seattle', 'London', 'Berlin', 'Toronto'];
    
    console.log(`Creating 20 mock applications with statuses: ${statuses.join(', ')}`);
    
    // Create 20 mock applications with safe index-based statuses
    const mockPromises = Array(20).fill(0).map((_, index) => {
      // Use index modulo to ensure we always get a valid status
      const statusIndex = index % statuses.length;
      const status = statuses[statusIndex];
      
      console.log(`Creating application #${index + 1} with status: ${status}`);
      
      // Generate a random date within the last 3 months
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const submissionDate = new Date(threeMonthsAgo.getTime() + Math.random() * (Date.now() - threeMonthsAgo.getTime()));
      
      const mockApp = {
        id: `mock-job-${index + 1}`, // Adding id as per interface
        userId: targetUserId,
        company: {
          name: companies[Math.floor(Math.random() * companies.length)] || 'Default Company',
          department: ['Engineering', 'Product', 'Design', 'Marketing', 'Sales'][Math.floor(Math.random() * 5)],
          sizeType: ['Small', 'Medium', 'Large', 'Enterprise'][Math.floor(Math.random() * 4)],
          industry: ['Technology', 'Finance', 'Healthcare', 'Retail'][Math.floor(Math.random() * 4)],
        },
        role: {
          title: roles[Math.floor(Math.random() * roles.length)] || 'Software Developer',
          jobId: `JOB-${Math.floor(Math.random() * 10000)}`,
          jobType: ['Full-time', 'Part-time', 'Contract'][Math.floor(Math.random() * 3)],
          employmentMode: ['Remote', 'Hybrid', 'On-site'][Math.floor(Math.random() * 3)],
        },
        location: locations[Math.floor(Math.random() * locations.length)] || 'Remote',
        status: status, // Using explicit string status
        // Randomly generate salary as either string or object format to match updated type definition
        salary: Math.random() > 0.5 
          ? `$${80000 + Math.floor(Math.random() * 20000)} - $${120000 + Math.floor(Math.random() * 30000)} USD`
          : {
              min: 80000 + Math.floor(Math.random() * 20000),
              max: 120000 + Math.floor(Math.random() * 30000),
              currency: '$'
            },
        // Use structured notes object as per interface
        notes: {
          personalNotes: `Mock application #${index + 1} generated for testing`,
          recruiterFeedback: index % 3 === 0 ? 'Good candidate, proceed with interview' : undefined,
          interviewerComments: index % 5 === 0 ? 'Strong technical skills, cultural fit needs assessment' : undefined,
        },
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        url: `https://example.com/jobs/${Math.floor(Math.random() * 10000)}`,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        // Adding required fields per JobApplication interface
        source: ['JobBoard', 'CompanyCareerPage', 'RecruiterReferral', 'NetworkingEvent', 'Recruiter'][Math.floor(Math.random() * 5)],
        priority: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)],
        tags: Array(Math.floor(Math.random() * 3 + 1)).fill(0).map(() => 
          ['Remote', 'Tech', 'StartUp', 'Enterprise', 'HighPay', 'GoodBenefits'][Math.floor(Math.random() * 6)]
        ),
        keyDates: {
          submissionDate: submissionDate.toISOString().split('T')[0],
          interviewDates: index % 3 === 0 ? 
            [new Date(submissionDate.getTime() + 7*24*60*60*1000).toISOString().split('T')[0]] : 
            undefined,
          offerExpiryDate: index % 7 === 0 ? 
            new Date(submissionDate.getTime() + 30*24*60*60*1000).toISOString().split('T')[0] : 
            undefined
        },
        documents: [
          { 
            type: 'Resume', 
            path: '/uploads/mock-resume.pdf', 
            name: 'My Resume.pdf'
          },
          index % 4 === 0 ? 
            { 
              type: 'CoverLetter', 
              path: '/uploads/mock-cover-letter.pdf', 
              name: 'Cover Letter.pdf'
            } : 
            undefined
        ].filter(Boolean),
      };
      
      return jobApplicationsCollection.add(mockApp);
    });
    
    await Promise.all(mockPromises);
    console.log('✅ Successfully created 20 mock job applications!');
    console.log('View them in Firestore at path:', `users/${targetUserId}/jobApplications`);
    
    // Suggest refreshing the page to see the new data
    if (confirm('Mock data created successfully! Would you like to refresh the page to see the new data?')) {
      window.location.reload();
    }
  } catch (error) {
    console.error('❌ Error creating mock data:', error);
    alert(`Failed to create mock data: ${error.message}`);
  }
})();
