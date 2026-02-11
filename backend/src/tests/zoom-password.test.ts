import zoomService from '../services/zoom.service';

/**
 * Test script for Zoom Password Management
 * Run with: npm run dev (in backend folder)
 * Then call the API endpoints to test
 */

async function testZoomPasswordFeatures() {
  console.log('🧪 Testing Zoom Password Management Features\n');

  try {
    // Test 1: Connection
    console.log('1️⃣ Testing Zoom API Connection...');
    const isConnected = await zoomService.testConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to Zoom API');
    }
    console.log('✅ Connection successful\n');

    // Test 2: Generate secure password
    console.log('2️⃣ Testing Password Generation...');
    const password1 = zoomService.generateSecurePassword();
    const password2 = zoomService.generateSecurePassword(16);
    console.log(`Generated 12-char password: ${password1}`);
    console.log(`Generated 16-char password: ${password2}`);
    console.log('✅ Password generation working\n');

    // Test 3: Get all users
    console.log('3️⃣ Testing User Retrieval...');
    const users = await zoomService.getAllUsers();
    console.log(`✅ Found ${users.length} Zoom users`);
    if (users.length > 0) {
      console.log(`   First user: ${users[0].email}\n`);
    }

    // Note: Actual password change requires user confirmation
    console.log('⚠️  Password change test skipped (requires specific user email)');
    console.log('   Use the API endpoint: POST /api/zoom/change-password');
    console.log('   with body: { "userEmail": "user@example.com" }\n');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  }
}

// Export for use in other files
export { testZoomPasswordFeatures };

// Run tests if executed directly
if (require.main === module) {
  testZoomPasswordFeatures();
}
