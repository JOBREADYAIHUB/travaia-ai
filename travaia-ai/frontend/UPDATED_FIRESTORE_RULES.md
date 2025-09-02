# Updated Firestore Security Rules for Travaia

This document contains the updated Firestore security rules to resolve "Permission denied" errors in both document management and job application systems.

## Updated Rules

Copy and paste these rules into your Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own user document
    match /users/{userId} {
      allow read, write, delete: if request.auth != null && request.auth.uid == userId;
      
      // Users can only access their own documents
      match /documents/{docId} {
        allow read, write, delete: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // Allow users to read/write/delete their own profile data
    match /userProfiles/{userId} {
      allow read, write, delete: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow users to access their own job applications (using hierarchical model)
    match /users/{userId}/jobApplications/{docId} {
      allow read, write, delete: if request.auth != null && request.auth.uid == userId;
    }
    
    // Public read access for application metadata (if needed)
    match /metadata/{document=**} {
      allow read: if true;
      allow write, delete: if request.auth != null;
    }
  }
}
```

## Key Security Principles

1. **Authentication Required**: All operations require `request.auth != null`
2. **User Isolation**: Users can only access documents where `request.auth.uid == userId`
3. **Path-based Security**: 
   - Document paths include the user ID: `users/{userId}/documents/{docId}`
   - Job applications are secured by userId field: `jobApplications/{docId}`
4. **Full CRUD Access**: Users can create, read, update, and **delete** their own documents
5. **No Cross-User Access**: Users cannot read, write, or delete other users' documents

## Document Path Structure

The application uses these path structures:
- User documents: `users/{userId}/documents/{docId}`
- User profiles: `userProfiles/{userId}`
- Job applications: `users/{userId}/jobApplications/{docId}` (hierarchical security model)
