// Test script for pomodoro available tasks endpoint with authentication

import 'dotenv/config';

async function testPomodoroAuth() {
  const API_URL = process.env.API_URL || 'http://localhost:5000';
  
  console.log('🔍 Testing Pomodoro Available Tasks Endpoint...\n');
  console.log(`API URL: ${API_URL}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}\n`);

  // Step 1: Login to get tokens
  console.log('Step 1: Logging in...');
  try {
    const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword123'
      })
    });

    if (!loginResponse.ok) {
      const error = await loginResponse.text();
      console.error('❌ Login failed:', loginResponse.status, error);
      console.log('\n💡 Make sure test user exists. Try registering first:');
      console.log('   npm run test:register-user');
      return;
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    console.log('   Access Token:', loginData.accessToken ? `${loginData.accessToken.substring(0, 20)}...` : 'None');
    console.log('   User ID:', loginData.user?.id || 'Unknown');
    
    const accessToken = loginData.accessToken;
    if (!accessToken) {
      console.error('❌ No access token received');
      return;
    }

    // Step 2: Test available tasks endpoint
    console.log('\nStep 2: Fetching available tasks...');
    const tasksResponse = await fetch(`${API_URL}/api/pomodoro/available-tasks`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('   Response Status:', tasksResponse.status);
    console.log('   Response Headers:', Object.fromEntries(tasksResponse.headers));

    if (!tasksResponse.ok) {
      const errorText = await tasksResponse.text();
      console.error('❌ Failed to fetch available tasks');
      console.error('   Error:', errorText);
      
      // Try to parse error as JSON
      try {
        const errorJson = JSON.parse(errorText);
        console.error('   Error details:', errorJson);
      } catch (e) {
        // Not JSON, that's fine
      }
      return;
    }

    const tasksData = await tasksResponse.json();
    console.log('✅ Successfully fetched available tasks');
    console.log('\nData received:');
    console.log(`   Goals: ${tasksData.goals?.length || 0}`);
    console.log(`   Tasks: ${tasksData.tasks?.length || 0}`);
    console.log(`   Habits: ${tasksData.habits?.length || 0}`);
    
    if (tasksData.goals?.length > 0) {
      console.log('\nSample Goal:', tasksData.goals[0]);
    }
    if (tasksData.tasks?.length > 0) {
      console.log('\nSample Task:', tasksData.tasks[0]);
    }
    if (tasksData.habits?.length > 0) {
      console.log('\nSample Habit:', tasksData.habits[0]);
    }

    // Step 3: Test with invalid token
    console.log('\nStep 3: Testing with invalid token...');
    const invalidResponse = await fetch(`${API_URL}/api/pomodoro/available-tasks`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer invalid-token',
        'Content-Type': 'application/json'
      }
    });

    console.log('   Response Status:', invalidResponse.status);
    if (invalidResponse.status === 401) {
      console.log('✅ Correctly rejected invalid token');
    } else {
      console.log('⚠️  Unexpected response for invalid token');
    }

    // Step 4: Test without token
    console.log('\nStep 4: Testing without token...');
    const noTokenResponse = await fetch(`${API_URL}/api/pomodoro/available-tasks`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('   Response Status:', noTokenResponse.status);
    if (noTokenResponse.status === 401) {
      console.log('✅ Correctly rejected request without token');
    } else {
      console.log('⚠️  Unexpected response for no token');
    }

    console.log('\n🎉 All tests completed!');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
  }
}

// Helper script to register test user
async function registerTestUser() {
  const API_URL = process.env.API_URL || 'http://localhost:5000';
  
  console.log('📝 Registering test user...\n');
  
  try {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword123',
        firstName: 'Test',
        lastName: 'User'
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Test user registered successfully');
      console.log('   User ID:', data.user?.id);
      console.log('   Email:', data.user?.email);
    } else {
      console.log('ℹ️  Registration response:', response.status);
      console.log('   Message:', data.message);
      if (data.message === '该邮箱已被注册') {
        console.log('   (User already exists - this is OK)');
      }
    }
  } catch (error) {
    console.error('❌ Registration failed:', error);
  }
}

// Check command line argument
const command = process.argv[2];

if (command === 'register') {
  registerTestUser();
} else {
  testPomodoroAuth();
}