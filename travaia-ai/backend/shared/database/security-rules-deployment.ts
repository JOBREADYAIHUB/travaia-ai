import { readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

export class FirestoreSecurityRulesManager {
  private projectId: string;
  private rulesFilePath: string;

  constructor(projectId: string = 'travaia-e1310') {
    this.projectId = projectId;
    this.rulesFilePath = join(__dirname, 'firestore-security-rules.rules');
  }

  // Deploy security rules to Firestore
  async deploySecurityRules(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('Deploying Firestore security rules...');
      
      // Validate rules file exists
      if (!this.validateRulesFile()) {
        return {
          success: false,
          message: 'Security rules file not found or invalid'
        };
      }

      // Deploy using Firebase CLI
      const command = `firebase deploy --only firestore:rules --project ${this.projectId}`;
      
      console.log(`Executing: ${command}`);
      const output = execSync(command, { 
        encoding: 'utf8',
        cwd: join(__dirname, '../../../..') // Navigate to project root
      });
      
      console.log('Deployment output:', output);
      
      return {
        success: true,
        message: 'Security rules deployed successfully'
      };
    } catch (error: any) {
      console.error('Failed to deploy security rules:', error.message);
      return {
        success: false,
        message: `Deployment failed: ${error.message}`
      };
    }
  }

  // Test security rules locally
  async testSecurityRules(): Promise<{ success: boolean; results: string }> {
    try {
      console.log('Testing Firestore security rules...');
      
      const command = `firebase emulators:exec --only firestore "npm run test:security-rules" --project ${this.projectId}`;
      
      const output = execSync(command, { 
        encoding: 'utf8',
        cwd: join(__dirname, '../../../..')
      });
      
      return {
        success: true,
        results: output
      };
    } catch (error: any) {
      return {
        success: false,
        results: `Testing failed: ${error.message}`
      };
    }
  }

  // Validate rules syntax
  validateRulesFile(): boolean {
    try {
      const rulesContent = readFileSync(this.rulesFilePath, 'utf8');
      
      // Basic validation checks
      if (!rulesContent.includes("rules_version = '2'")) {
        console.error('Rules file must specify rules_version = 2');
        return false;
      }
      
      if (!rulesContent.includes('service cloud.firestore')) {
        console.error('Rules file must specify service cloud.firestore');
        return false;
      }
      
      // Check for balanced braces
      const openBraces = (rulesContent.match(/{/g) || []).length;
      const closeBraces = (rulesContent.match(/}/g) || []).length;
      
      if (openBraces !== closeBraces) {
        console.error('Unbalanced braces in rules file');
        return false;
      }
      
      console.log('Rules file validation passed');
      return true;
    } catch (error) {
      console.error('Error reading rules file:', error);
      return false;
    }
  }

  // Generate test cases for security rules
  generateTestCases(): string {
    return `
// Security Rules Test Cases
// Run with: firebase emulators:exec --only firestore "npm run test:security-rules"

const firebase = require('@firebase/rules-unit-testing');
const { readFileSync } = require('fs');

const PROJECT_ID = 'test-project';
const RULES_FILE = './backend/shared/database/firestore-security-rules.rules';

describe('Firestore Security Rules', () => {
  let testEnv;

  beforeAll(async () => {
    testEnv = await firebase.initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync(RULES_FILE, 'utf8'),
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  describe('Users Collection', () => {
    test('User can read their own document', async () => {
      const alice = testEnv.authenticatedContext('alice');
      const doc = alice.firestore().collection('users').doc('alice');
      
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc('alice').set({
          user_id: 'alice',
          email: 'alice@example.com',
          status: 'active',
          created_at: new Date(),
          updated_at: new Date()
        });
      });
      
      await firebase.assertSucceeds(doc.get());
    });

    test('User cannot read other user documents', async () => {
      const alice = testEnv.authenticatedContext('alice');
      const doc = alice.firestore().collection('users').doc('bob');
      
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc('bob').set({
          user_id: 'bob',
          email: 'bob@example.com',
          status: 'active',
          created_at: new Date(),
          updated_at: new Date()
        });
      });
      
      await firebase.assertFails(doc.get());
    });

    test('User can create their own document', async () => {
      const alice = testEnv.authenticatedContext('alice');
      const doc = alice.firestore().collection('users').doc('alice');
      
      await firebase.assertSucceeds(doc.set({
        user_id: 'alice',
        email: 'alice@example.com',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      }));
    });

    test('User cannot create document with invalid email', async () => {
      const alice = testEnv.authenticatedContext('alice');
      const doc = alice.firestore().collection('users').doc('alice');
      
      await firebase.assertFails(doc.set({
        user_id: 'alice',
        email: 'invalid-email',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      }));
    });
  });

  describe('Applications Collection', () => {
    test('User can read their own applications', async () => {
      const alice = testEnv.authenticatedContext('alice');
      
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc('alice').set({
          user_id: 'alice',
          email: 'alice@example.com',
          status: 'active'
        });
        
        await context.firestore().collection('applications').doc('app1').set({
          application_id: 'app1',
          user_id: 'alice',
          company_name: 'Tech Corp',
          position_title: 'Developer',
          status: 'applied',
          created_at: new Date(),
          updated_at: new Date()
        });
      });
      
      const doc = alice.firestore().collection('applications').doc('app1');
      await firebase.assertSucceeds(doc.get());
    });

    test('User cannot read other user applications', async () => {
      const alice = testEnv.authenticatedContext('alice');
      
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc('alice').set({
          user_id: 'alice',
          email: 'alice@example.com',
          status: 'active'
        });
        
        await context.firestore().collection('applications').doc('app1').set({
          application_id: 'app1',
          user_id: 'bob',
          company_name: 'Tech Corp',
          position_title: 'Developer',
          status: 'applied',
          created_at: new Date(),
          updated_at: new Date()
        });
      });
      
      const doc = alice.firestore().collection('applications').doc('app1');
      await firebase.assertFails(doc.get());
    });
  });

  describe('Documents Collection', () => {
    test('User can create document with valid file size', async () => {
      const alice = testEnv.authenticatedContext('alice');
      
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc('alice').set({
          user_id: 'alice',
          email: 'alice@example.com',
          status: 'active'
        });
      });
      
      const doc = alice.firestore().collection('documents').doc('doc1');
      await firebase.assertSucceeds(doc.set({
        document_id: 'doc1',
        user_id: 'alice',
        file_name: 'resume.pdf',
        document_type: 'resume',
        access_level: 'private',
        file_size_bytes: 1048576, // 1MB
        created_at: new Date(),
        updated_at: new Date()
      }));
    });

    test('User cannot create document with file size over 10MB', async () => {
      const alice = testEnv.authenticatedContext('alice');
      
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc('alice').set({
          user_id: 'alice',
          email: 'alice@example.com',
          status: 'active'
        });
      });
      
      const doc = alice.firestore().collection('documents').doc('doc1');
      await firebase.assertFails(doc.set({
        document_id: 'doc1',
        user_id: 'alice',
        file_name: 'large-file.pdf',
        document_type: 'resume',
        access_level: 'private',
        file_size_bytes: 11534336, // 11MB
        created_at: new Date(),
        updated_at: new Date()
      }));
    });
  });

  describe('Interview Questions Collection', () => {
    test('User can read public questions', async () => {
      const alice = testEnv.authenticatedContext('alice');
      
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc('alice').set({
          user_id: 'alice',
          email: 'alice@example.com',
          status: 'active'
        });
        
        await context.firestore().collection('interview_questions').doc('q1').set({
          question_id: 'q1',
          question_text: 'Tell me about yourself',
          category: 'general',
          user_id: null, // Public question
          created_at: new Date(),
          updated_at: new Date()
        });
      });
      
      const doc = alice.firestore().collection('interview_questions').doc('q1');
      await firebase.assertSucceeds(doc.get());
    });

    test('User can read their own questions', async () => {
      const alice = testEnv.authenticatedContext('alice');
      
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc('alice').set({
          user_id: 'alice',
          email: 'alice@example.com',
          status: 'active'
        });
        
        await context.firestore().collection('interview_questions').doc('q1').set({
          question_id: 'q1',
          question_text: 'Custom question',
          category: 'technical',
          user_id: 'alice',
          created_at: new Date(),
          updated_at: new Date()
        });
      });
      
      const doc = alice.firestore().collection('interview_questions').doc('q1');
      await firebase.assertSucceeds(doc.get());
    });
  });

  describe('Unauthenticated Access', () => {
    test('Unauthenticated user cannot read any documents', async () => {
      const unauth = testEnv.unauthenticatedContext();
      
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc('alice').set({
          user_id: 'alice',
          email: 'alice@example.com',
          status: 'active'
        });
      });
      
      const doc = unauth.firestore().collection('users').doc('alice');
      await firebase.assertFails(doc.get());
    });
  });
});
    `.trim();
  }

  // Create Firebase configuration for rules deployment
  createFirebaseConfig(): string {
    return `{
  "projects": {
    "default": "${this.projectId}"
  },
  "firestore": {
    "rules": "backend/shared/database/firestore-security-rules.rules"
  },
  "emulators": {
    "firestore": {
      "port": 8080
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}`;
  }

  // Generate deployment script
  generateDeploymentScript(): string {
    return `#!/bin/bash

# Firestore Security Rules Deployment Script
# This script deploys the security rules to Firebase

set -e

echo "🔐 Deploying Firestore Security Rules..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged in to Firebase. Please login first:"
    echo "firebase login"
    exit 1
fi

# Validate rules file
echo "📋 Validating security rules..."
if [ ! -f "backend/shared/database/firestore-security-rules.rules" ]; then
    echo "❌ Security rules file not found!"
    exit 1
fi

# Test rules locally (optional)
read -p "🧪 Do you want to test rules locally first? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Starting Firestore emulator for testing..."
    firebase emulators:start --only firestore &
    EMULATOR_PID=$!
    
    echo "⏳ Waiting for emulator to start..."
    sleep 5
    
    echo "🧪 Running security rules tests..."
    npm run test:security-rules || {
        echo "❌ Tests failed! Stopping deployment."
        kill $EMULATOR_PID
        exit 1
    }
    
    echo "✅ Tests passed!"
    kill $EMULATOR_PID
fi

# Deploy to production
echo "🚀 Deploying to production..."
firebase deploy --only firestore:rules --project ${this.projectId}

echo "✅ Security rules deployed successfully!"
echo "📊 You can view the rules in the Firebase Console:"
echo "https://console.firebase.google.com/project/${this.projectId}/firestore/rules"
`;
  }
}

export default FirestoreSecurityRulesManager;
