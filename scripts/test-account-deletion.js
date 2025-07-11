const fetch = require('node-fetch');

// Test account credentials
const testAccount = {
  email: 'test-deletion@example.com',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'Deletion'
};

let authToken = null;
let userId = null;

async function registerTestAccount() {
  console.log('📝 Registering test account...');
  
  const response = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testAccount)
  });
  
  if (response.status === 200) {
    const data = await response.json();
    authToken = data.accessToken;
    userId = data.user.id;
    console.log('✅ Account registered successfully');
    console.log('   User ID:', userId);
    return true;
  } else if (response.status === 400) {
    console.log('⚠️  Account already exists, trying to login...');
    return await loginTestAccount();
  } else {
    console.error('❌ Registration failed:', await response.text());
    return false;
  }
}

async function loginTestAccount() {
  const response = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testAccount.email,
      password: testAccount.password
    })
  });
  
  if (response.status === 200) {
    const data = await response.json();
    authToken = data.accessToken;
    userId = data.user.id;
    console.log('✅ Logged in successfully');
    return true;
  } else {
    console.error('❌ Login failed:', await response.text());
    return false;
  }
}

async function testAccountDeletion() {
  console.log('\n🗑️  Testing account deletion...');
  
  // Test 1: Try deletion without password (current implementation)
  console.log('\n1. Testing deletion without password verification:');
  const response1 = await fetch('http://localhost:5000/api/v1/users/account', {
    method: 'DELETE',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({})
  });
  
  console.log('   Status:', response1.status);
  const data1 = await response1.json();
  console.log('   Response:', data1);
  
  // Test 2: Try deletion with password (as iOS app expects)
  console.log('\n2. Testing deletion with password (iOS app format):');
  const scheduledDate = new Date();
  scheduledDate.setDate(scheduledDate.getDate() + 30);
  
  const response2 = await fetch('http://localhost:5000/api/v1/users/account', {
    method: 'DELETE',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      password: testAccount.password,
      scheduledDeletionDate: scheduledDate.toISOString()
    })
  });
  
  console.log('   Status:', response2.status);
  const data2 = await response2.json();
  console.log('   Response:', data2);
  
  // Test 3: Check if user data was modified
  console.log('\n3. Checking user data after deletion request:');
  const response3 = await fetch('http://localhost:5000/api/auth/user', {
    headers: { 
      'Authorization': `Bearer ${authToken}`
    }
  });
  
  if (response3.status === 200) {
    const userData = await response3.json();
    console.log('   User data:', {
      id: userData.id,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName
    });
  } else {
    console.log('   Could not fetch user data:', response3.status);
  }
  
  // Test 4: Try to cancel deletion
  console.log('\n4. Testing deletion cancellation:');
  const response4 = await fetch('http://localhost:5000/api/v1/users/cancel-deletion', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    }
  });
  
  console.log('   Status:', response4.status);
  const data4 = await response4.json();
  console.log('   Response:', data4);
}

async function testProductionEndpoint() {
  console.log('\n🌐 Testing production endpoint existence:');
  
  const response = await fetch('https://www.levelupsolo.net/api/v1/users/account', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  
  console.log('   Status:', response.status);
  if (response.status === 401) {
    console.log('   ✅ Endpoint exists (requires authentication)');
  } else if (response.status === 404) {
    console.log('   ❌ Endpoint not found - needs deployment');
  }
}

async function runTests() {
  console.log('🔍 Testing Account Deletion Flow\n');
  
  // Test local implementation
  if (await registerTestAccount()) {
    await testAccountDeletion();
  }
  
  // Test production endpoint
  await testProductionEndpoint();
  
  console.log('\n📋 Summary of Issues Found:');
  console.log('1. ❌ No password verification before deletion');
  console.log('2. ❌ User data is immediately modified instead of scheduled');
  console.log('3. ❌ No proper deletion_requested_at and deletion_scheduled_for fields');
  console.log('4. ❌ iOS expects password in request body but backend ignores it');
  console.log('5. ⚠️  Need to implement proper 30-day delay mechanism');
}

// Run tests
runTests().catch(console.error);