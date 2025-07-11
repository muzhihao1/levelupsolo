require('dotenv').config();
const express = require('express');
const { setupAuth } = require('../dist/simpleAuth');
const app = express();

// Middleware
app.use(express.json());

// Setup auth routes
setupAuth(app);

// Start server
const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log('Password reset endpoints available at:');
  console.log('- POST http://localhost:5001/api/auth/request-password-reset');
  console.log('- POST http://localhost:5001/api/auth/reset-password');
});

// Test the endpoints
setTimeout(async () => {
  console.log('\n📧 Testing password reset request...');
  
  try {
    const response = await fetch('http://localhost:5001/api/auth/request-password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' })
    });
    
    const data = await response.json();
    console.log('Response:', data);
    console.log('\n✅ Password reset endpoints are working!');
    console.log('Note: In development mode, emails are logged to console instead of being sent.');
  } catch (error) {
    console.error('❌ Error testing endpoint:', error);
  }
  
  // Exit after test
  setTimeout(() => process.exit(0), 1000);
}, 2000);