# Firebase Storage Security Rules

## Current Storage Rules

Copy and paste these rules into your Firebase Console under Storage > Rules:

```javascript
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
      allow write, delete: if false; // Only admins can write to public (implement admin check if needed)
    }
    
    // Deny all other access
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

## How to Apply These Rules

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `travaia-e1310`
3. Navigate to **Storage** in the left sidebar
4. Click on the **Rules** tab
5. Replace the existing rules with the rules above
6. Click **Publish**

## Rule Explanation

- **User Documents**: Users can only access documents in their own `/users/{userId}/documents/` path
- **Profile Images**: Users can manage their own profile images in `/users/{userId}/profile/`
- **Avatars**: Users can manage their own avatars in `/users/{userId}/avatars/`
- **Public Content**: Authenticated users can read public content, but writing is restricted
- **Default Deny**: All other paths are denied by default for security

## Testing the Rules

After applying the rules, test by:

1. Logging into the app
2. Trying to upload a document
3. Trying to delete a document
4. Checking that you can only access your own files

## Troubleshooting

If you still get CORS errors after applying these rules:

1. **Check Authentication**: Ensure the user is properly authenticated before making Storage requests
2. **Check File Paths**: Verify that file paths match the pattern `/users/{userId}/documents/`
3. **Check Token**: Ensure the Firebase Auth token is valid and not expired
4. **Browser Cache**: Clear browser cache and try again
5. **Firebase Console**: Check the Storage usage logs in Firebase Console for detailed error messages

## Development vs Production

These rules work for both development and production environments. The authentication check `request.auth != null && request.auth.uid == userId` ensures that:

- Only authenticated users can access files
- Users can only access their own files
- The same rules work regardless of the domain (localhost, production domain, etc.)
