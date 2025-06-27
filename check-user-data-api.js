// Script to check user data via API
const userId = '55b0b902-d316-418d-be05-a4f40ceeb5d5'; // 279838958@qq.com's user ID

async function checkUserData() {
  console.log('Checking data for user:', userId);
  console.log('Email: 279838958@qq.com');
  console.log('-----------------------------------\n');

  try {
    // First, let's get a token for this user
    const loginResponse = await fetch('https://levelupsolo.vercel.app/api/auth/simple-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: '279838958@qq.com',
        password: 'levelup2024'
      })
    });

    if (!loginResponse.ok) {
      console.error('Login failed:', await loginResponse.text());
      return;
    }

    const { accessToken } = await loginResponse.json();
    console.log('Login successful, got token:', accessToken.substring(0, 50) + '...\n');

    // Check user profile
    console.log('Checking user profile...');
    const profileResponse = await fetch('https://levelupsolo.vercel.app/api/data?type=profile', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    const profile = await profileResponse.json();
    console.log('Profile data:', JSON.stringify(profile, null, 2));
    console.log('\n-----------------------------------\n');

    // Check tasks
    console.log('Checking tasks...');
    const tasksResponse = await fetch('https://levelupsolo.vercel.app/api/data?type=tasks', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    const tasks = await tasksResponse.json();
    console.log('Total tasks:', tasks.length);
    console.log('First 5 tasks:', JSON.stringify(tasks.slice(0, 5), null, 2));
    console.log('\n-----------------------------------\n');

    // Check skills
    console.log('Checking skills...');
    const skillsResponse = await fetch('https://levelupsolo.vercel.app/api/data?type=skills', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    const skills = await skillsResponse.json();
    console.log('Total skills:', skills.length);
    console.log('Skills:', JSON.stringify(skills, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the check
checkUserData();