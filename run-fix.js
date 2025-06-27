// Script to fix user stats
async function fixUserStats() {
  console.log('Waiting for deployment to be ready...');
  
  // Wait 30 seconds for deployment
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  console.log('Attempting to fix user stats...');
  
  try {
    const response = await fetch('https://levelupsolo.vercel.app/api/fix-user-stats', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: '279838958@qq.com'
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Fix failed:', response.status, text);
      return;
    }

    const result = await response.json();
    console.log('Success!', result);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixUserStats();