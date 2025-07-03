// Debug script for testing habit completion
const fetch = require('node-fetch');

async function testHabitCompletion() {
  const BASE_URL = 'http://localhost:5000'; // Change to your deployment URL
  const TASK_ID = 140;
  
  try {
    console.log(`Testing habit completion for task ${TASK_ID}...`);
    
    // First, get the task to see its current state
    const getResponse = await fetch(`${BASE_URL}/api/tasks/${TASK_ID}`, {
      headers: {
        'Cookie': 'your-session-cookie-here' // Add your actual session cookie
      }
    });
    
    if (!getResponse.ok) {
      console.error('Failed to fetch task:', await getResponse.text());
      return;
    }
    
    const task = await getResponse.json();
    console.log('Current task state:', JSON.stringify(task, null, 2));
    
    // Now try to complete the habit
    const patchResponse = await fetch(`${BASE_URL}/api/tasks/${TASK_ID}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'your-session-cookie-here' // Add your actual session cookie
      },
      body: JSON.stringify({
        completed: true
      })
    });
    
    console.log('Response status:', patchResponse.status);
    const responseText = await patchResponse.text();
    console.log('Response body:', responseText);
    
    if (patchResponse.ok) {
      const updatedTask = JSON.parse(responseText);
      console.log('Updated task:', JSON.stringify(updatedTask, null, 2));
    }
    
  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Instructions:
console.log(`
To use this script:
1. Replace BASE_URL with your deployment URL (or keep localhost for local testing)
2. Replace 'your-session-cookie-here' with your actual session cookie from the browser
3. Run: node debug-habit-completion.js

To get your session cookie:
1. Open browser DevTools (F12)
2. Go to Application/Storage > Cookies
3. Copy the value of the session cookie
`);

// Uncomment to run:
// testHabitCompletion();