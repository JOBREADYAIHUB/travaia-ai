// This script will update existing job applications in your Firestore database
// to match the current JobApplication interface structure
// To use this script:
// 1. Log in to your application
// 2. Open your browser console (F12 or Ctrl+Shift+J)
// 3. Paste this entire script into the console and press Enter

(async function updateJobApplications() {
  // Check if Firebase is initialized
  if (!firebase || !firebase.auth || !firebase.firestore) {
    console.error("Firebase SDK not found. Make sure you're logged in and running this script from your application's page.");
    return;
  }

  try {
    // Get current user
    const currentUser = firebase.auth().currentUser;
    
    if (!currentUser) {
      console.error("You must be logged in to update job application data.");
      alert("Please log in first to update job application data.");
      return;
    }

    // Confirm before proceeding
    if (!confirm("This script will update all your job applications to match the current interface structure. Continue?")) {
      return;
    }

    console.log('Starting job application updates...');
    console.log('User ID:', currentUser.uid);
    
    // First, refresh token to ensure we have fresh permissions
    await currentUser.getIdToken(true);
    console.log('Auth token refreshed successfully.');
    
    const db = firebase.firestore();
    const targetUserId = currentUser.uid;
    const jobApplicationsCollection = db.collection(`users/${targetUserId}/jobApplications`);
    
    // Fetch all existing job applications
    const snapshot = await jobApplicationsCollection.get();
    
    if (snapshot.empty) {
      console.log('No job applications found to update.');
      return;
    }
    
    console.log(`Found ${snapshot.size} job applications to process.`);
    
    const updatePromises = [];
    
    snapshot.forEach(doc => {
      const application = doc.data();
      const updates = {};
      let needsUpdate = false;
      
      // Fix salary (convert object to string if needed)
      if (application.salary && typeof application.salary === 'object') {
        updates.salary = `$${application.salary.min || 0} - $${application.salary.max || 0} ${application.salary.currency || 'USD'}`;
        needsUpdate = true;
        console.log(`Converting salary object to string for job ${doc.id}`);
      }
      
      // Fix notes (convert string to object if needed)
      if (application.notes && typeof application.notes === 'string') {
        updates.notes = {
          personalNotes: application.notes
        };
        needsUpdate = true;
        console.log(`Converting notes string to object for job ${doc.id}`);
      }
      
      // Ensure role structure is correct
      if (!application.role || typeof application.role !== 'object') {
        updates.role = {
          title: application.jobTitle || application.role || 'Unknown Position'
        };
        needsUpdate = true;
        console.log(`Creating proper role object for job ${doc.id}`);
      }
      
      // Ensure company structure is correct
      if (!application.company || typeof application.company !== 'object') {
        updates.company = {
          name: application.companyName || application.company || 'Unknown Company'
        };
        needsUpdate = true;
        console.log(`Creating proper company object for job ${doc.id}`);
      }
      
      // Ensure keyDates structure exists
      if (!application.keyDates) {
        const createdDate = application.createdAt ? 
          new Date(application.createdAt.toDate()) : 
          new Date();
          
        updates.keyDates = {
          submissionDate: application.applicationDate || 
            createdDate.toISOString().split('T')[0]
        };
        needsUpdate = true;
        console.log(`Creating keyDates object for job ${doc.id}`);
      }
      
      // Ensure required fields exist
      if (!application.source) {
        updates.source = 'Other';
        needsUpdate = true;
      }
      
      if (!application.priority) {
        updates.priority = 'Medium';
        needsUpdate = true;
      }
      
      if (!application.tags || !Array.isArray(application.tags)) {
        updates.tags = [];
        needsUpdate = true;
      }
      
      if (!application.documents || !Array.isArray(application.documents)) {
        updates.documents = [];
        needsUpdate = true;
      }
      
      // Only update if changes are needed
      if (needsUpdate) {
        console.log(`Updating job application ${doc.id}`, updates);
        updatePromises.push(doc.ref.update(updates));
      }
    });
    
    if (updatePromises.length === 0) {
      console.log('No job applications needed updates.');
      return;
    }
    
    await Promise.all(updatePromises);
    console.log(`✅ Successfully updated ${updatePromises.length} job applications!`);
    
    // Suggest refreshing the page to see the updated data
    if (confirm('Job applications updated successfully! Would you like to refresh the page to see the updated data?')) {
      window.location.reload();
    }
  } catch (error) {
    console.error('❌ Error updating job applications:', error);
    alert(`Failed to update job applications: ${error.message}`);
  }
})();
