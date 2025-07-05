import { config } from 'dotenv';
config();

async function testApiAuth() {
  console.log('Testing API authentication...\n');
  
  // Check if we're running with a real server
  const apiUrl = 'http://localhost:5000';
  
  try {
    // Test the auth endpoint
    console.log('1. Testing /api/auth/user endpoint...');
    const authResponse = await fetch(`${apiUrl}/api/auth/user`, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      }
    });
    
    console.log(`Auth response status: ${authResponse.status}`);
    if (authResponse.ok) {
      const user = await authResponse.json();
      console.log('Authenticated user:', user);
    } else {
      console.log('Not authenticated');
    }
    
    // Test the available tasks endpoint
    console.log('\n2. Testing /api/pomodoro/available-tasks endpoint...');
    const tasksResponse = await fetch(`${apiUrl}/api/pomodoro/available-tasks`, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      }
    });
    
    console.log(`Tasks response status: ${tasksResponse.status}`);
    if (tasksResponse.ok) {
      const data = await tasksResponse.json();
      console.log('Available tasks:', data);
    } else {
      const error = await tasksResponse.json();
      console.log('Error response:', error);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
    console.log('\nMake sure the dev server is running: npm run dev');
  }
}

testApiAuth();