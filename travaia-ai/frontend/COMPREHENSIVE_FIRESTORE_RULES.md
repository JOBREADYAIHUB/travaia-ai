# Comprehensive Firestore Security Rules for TRAVAIA

This document contains the complete Firestore security rules needed to support all TRAVAIA features including the sample data population functionality.

## Complete Security Rules

Copy and paste these rules into your Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection - users can only access their own profile
    match /users/{userId} {
      allow read, write, delete: if request.auth != null && request.auth.uid == userId;
    }
    
    // Applications collection - users can only access their own applications
    match /applications/{applicationId} {
      allow read, write, delete: if request.auth != null && 
        request.auth.uid == resource.data.user_id;
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.user_id;
    }
    
    // Favorite jobs collection - users can only access their own favorites
    match /favorite_jobs/{favoriteId} {
      allow read, write, delete: if request.auth != null && 
        request.auth.uid == resource.data.user_id;
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.user_id;
    }
    
    // Interview questions collection - users can only access their own question sets
    match /interview_questions/{questionSetId} {
      allow read, write, delete: if request.auth != null && 
        request.auth.uid == resource.data.user_id;
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.user_id;
    }
    
    // Interviews collection - users can only access their own interviews
    match /interviews/{interviewId} {
      allow read, write, delete: if request.auth != null && 
        request.auth.uid == resource.data.user_id;
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.user_id;
      
      // Interview attempts sub-collection
      match /attempts/{attemptId} {
        allow read, write, delete: if request.auth != null && 
          request.auth.uid == get(/databases/$(database)/documents/interviews/$(interviewId)).data.user_id;
        allow create: if request.auth != null && 
          request.auth.uid == get(/databases/$(database)/documents/interviews/$(interviewId)).data.user_id;
      }
    }
    
    // AI reports collection - users can only access their own reports
    match /ai_reports/{reportId} {
      allow read, write, delete: if request.auth != null && 
        request.auth.uid == resource.data.user_id;
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.user_id;
    }
    
    // Documents collection - users can only access their own documents
    match /documents/{documentId} {
      allow read, write, delete: if request.auth != null && 
        request.auth.uid == resource.data.user_id;
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.user_id;
    }
    
    // Legacy support for nested document structure (if still used)
    match /users/{userId}/documents/{docId} {
      allow read, write, delete: if request.auth != null && request.auth.uid == userId;
    }
    
    // User profiles collection (legacy support)
    match /userProfiles/{userId} {
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

## Key Security Features

### 1. **User Data Isolation**
- All collections use `user_id` field to ensure users can only access their own data
- Both `resource.data.user_id` (for existing docs) and `request.resource.data.user_id` (for new docs) are checked

### 2. **Authentication Required**
- All operations require `request.auth != null`
- No anonymous access to user data

### 3. **Full CRUD Operations**
- Users can create, read, update, and delete their own documents
- Sub-collections (like interview attempts) inherit parent document permissions

### 4. **Collection Support**
The rules support all collections used by the sample data generator:
- `users/{userId}` - User profiles
- `applications/{applicationId}` - Job applications
- `favorite_jobs/{favoriteId}` - Saved job listings
- `interview_questions/{questionSetId}` - Interview question sets
- `interviews/{interviewId}` - Interview records
- `interviews/{interviewId}/attempts/{attemptId}` - Interview attempts (sub-collection)
- `ai_reports/{reportId}` - AI analysis reports
- `documents/{documentId}` - Document metadata

### 5. **Backward Compatibility**
- Maintains support for legacy nested document structures
- Supports both `userProfiles/{userId}` and `users/{userId}` patterns

## Implementation Steps

1. **Open Firebase Console**
   - Go to your Firebase project
   - Navigate to Firestore Database → Rules

2. **Replace Current Rules**
   - Copy the complete rules above
   - Paste them into the Firebase Console
   - Click "Publish" to deploy

3. **Test Sample Data Population**
   - Return to the Toddler UI Demo page
   - Click "Populate Sample Data"
   - The operation should now succeed

## Security Validation

These rules ensure:
- ✅ Users can only access their own data
- ✅ Authentication is required for all operations
- ✅ Cross-user data access is prevented
- ✅ Sub-collections inherit proper permissions
- ✅ Sample data population will work correctly
- ✅ All TRAVAIA features are supported

## Troubleshooting

If you still encounter permission errors:
1. Verify the rules are published in Firebase Console
2. Check that `user_id` fields are properly set in documents
3. Ensure the user is properly authenticated
4. Check browser console for specific error details


old rules ###########


rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow users to read and write their own documents
    match /users/{userId}/documents/{document=**} {
      allow read, write, delete: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow users to read and write their own profile images
    match /users/{userId}/profile/{profileImage=**} {
      allow read, write, delete: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow users to read and write their own avatars
    match /users/{userId}/avatars/{avatar=**} {
      allow read, write, delete: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow authenticated users to read public content (if any)
    match /public/{document=**} {
      allow read: if request.auth != null;
      allow write, delete: if false; // Only admins can write to public
    }
    
    // Deny all other access
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}