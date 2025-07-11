const fetch = require('node-fetch');

async function testEndpoints() {
  const baseUrl = 'https://www.levelupsolo.net/api';
  
  console.log('🔍 Testing password reset endpoints on production...\n');
  
  // Test request password reset
  console.log('1. Testing /auth/request-password-reset endpoint:');
  try {
    const response = await fetch(`${baseUrl}/auth/request-password-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' })
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    const data = await response.json();
    console.log('   Response:', data);
    
    if (response.status === 200) {
      console.log('   ✅ Endpoint is working!');
    } else if (response.status === 404) {
      console.log('   ❌ Endpoint not found - needs deployment');
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
  
  console.log('\n2. Testing /auth/reset-password endpoint:');
  try {
    const response = await fetch(`${baseUrl}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        token: 'test-token',
        newPassword: 'newPassword123'
      })
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    const data = await response.json();
    console.log('   Response:', data);
    
    if (response.status === 400 && data.message.includes('无效')) {
      console.log('   ✅ Endpoint is working (invalid token response expected)!');
    } else if (response.status === 404) {
      console.log('   ❌ Endpoint not found - needs deployment');
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
  
  console.log('\n📋 Summary:');
  console.log('The password reset endpoints have been implemented in the code.');
  console.log('To make them available to iOS app, you need to:');
  console.log('1. Commit and push the changes to GitHub');
  console.log('2. Railway will automatically deploy the new version');
  console.log('3. The endpoints will be available at:');
  console.log('   - POST https://www.levelupsolo.net/api/auth/request-password-reset');
  console.log('   - POST https://www.levelupsolo.net/api/auth/reset-password');
}

testEndpoints();