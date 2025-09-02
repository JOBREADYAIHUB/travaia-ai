import AuthService from '../services/authService';

/**
 * Test utility to verify frontend-backend authentication integration
 */
export class AuthFlowTester {
  
  /**
   * Test user registration flow
   */
  static async testRegistration(): Promise<void> {
    console.log('🧪 Testing User Registration Flow...');
    
    const testUser = {
      email: `test-${Date.now()}@travaia.com`,
      password: 'TestPassword123!',
      displayName: 'Test User'
    };

    try {
      const result = await AuthService.registerUser(testUser);
      
      if (result.success) {
        console.log('✅ Registration successful:', result.user);
      } else {
        console.log('❌ Registration failed:', result.error);
      }
    } catch (error) {
      console.log('❌ Registration error:', error);
    }
  }

  /**
   * Test user login flow
   */
  static async testLogin(): Promise<void> {
    console.log('🧪 Testing User Login Flow...');
    
    const loginData = {
      email: 'test@travaia.com',
      password: 'TestPassword123!'
    };

    try {
      const result = await AuthService.loginUser(loginData);
      
      if (result.success) {
        console.log('✅ Login successful:', result.user);
      } else {
        console.log('❌ Login failed:', result.error);
      }
    } catch (error) {
      console.log('❌ Login error:', error);
    }
  }

  /**
   * Test getting current user profile
   */
  static async testGetCurrentUser(): Promise<void> {
    console.log('🧪 Testing Get Current User...');
    
    try {
      const result = await AuthService.getCurrentUser();
      
      if (result.success) {
        console.log('✅ Get current user successful:', result.user);
      } else {
        console.log('❌ Get current user failed:', result.error);
      }
    } catch (error) {
      console.log('❌ Get current user error:', error);
    }
  }

  /**
   * Test backend connectivity
   */
  static async testBackendConnectivity(): Promise<void> {
    console.log('🧪 Testing Backend Connectivity...');
    
    try {
      // Simple health check by attempting to get current user (should fail gracefully if not authenticated)
      const result = await AuthService.getCurrentUser();
      
      if (result.success || result.error) {
        console.log('✅ Backend is reachable');
        console.log('📡 Response:', result.success ? 'Authenticated user found' : result.error);
      }
    } catch (error: any) {
      if (error.code === 'NETWORK_ERROR') {
        console.log('❌ Backend connectivity failed - Network error');
      } else if (error.response?.status === 401) {
        console.log('✅ Backend is reachable (401 Unauthorized - expected when not logged in)');
      } else {
        console.log('❌ Backend connectivity test failed:', error.message);
      }
    }
  }

  /**
   * Run all authentication tests
   */
  static async runAllTests(): Promise<void> {
    console.log('🚀 Starting TRAVAIA Authentication Flow Tests...\n');
    
    await this.testBackendConnectivity();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await this.testGetCurrentUser();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await this.testRegistration();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await this.testLogin();
    console.log('\n' + '='.repeat(50) + '\n');
    
    console.log('🏁 Authentication Flow Tests Complete!');
  }
}

// Export for use in browser console or components
(window as any).AuthFlowTester = AuthFlowTester;

export default AuthFlowTester;
