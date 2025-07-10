/**
 * Script to create demo account via API endpoint
 * This uses the existing auth registration endpoint to ensure compatibility
 */

const API_BASE_URL = process.env.API_URL || 'https://www.levelupsolo.net/api';

interface RegisterResponse {
  success: boolean;
  data?: {
    user: { id: string; email: string };
    accessToken: string;
    refreshToken: string;
  };
  error?: any;
}

interface TaskResponse {
  success: boolean;
  data?: any;
  error?: any;
}

async function createDemoAccount() {
  console.log("Creating demo account for App Store review via API...");

  try {
    // Step 1: Register the demo account
    console.log("1. Registering demo user...");
    const registerResponse = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'demo@levelupsolo.net',
        password: 'Demo123456',
        firstName: 'Demo',
        lastName: 'User',
      }),
    });

    const registerData: RegisterResponse = await registerResponse.json();

    if (!registerResponse.ok || !registerData.success) {
      if (registerResponse.status === 409) {
        console.log("Demo account already exists!");
        // Try to login instead
        const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'demo@levelupsolo.net',
            password: 'Demo123456',
          }),
        });

        const loginData = await loginResponse.json();
        if (loginData.success) {
          console.log("Successfully logged in to existing demo account");
          await populateDemoData(loginData.data.accessToken);
        }
        return;
      }
      throw new Error(registerData.error || 'Registration failed');
    }

    console.log("✅ Demo user created successfully!");
    console.log("User ID:", registerData.data?.user.id);

    // Step 2: Populate demo data
    if (registerData.data?.accessToken) {
      await populateDemoData(registerData.data.accessToken);
    }

  } catch (error) {
    console.error("Error creating demo account:", error);
    process.exit(1);
  }
}

async function populateDemoData(accessToken: string) {
  console.log("\n2. Populating demo data...");

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  };

  // Create goals
  const goals = [
    {
      title: "Complete Marathon Training",
      description: "Train for and complete a full marathon in 6 months",
      priority: "high",
      targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      title: "Learn React Native",
      description: "Build and publish a mobile app using React Native",
      priority: "medium",
      targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      title: "Build Emergency Fund",
      description: "Save 6 months of expenses for emergency fund",
      priority: "high",
      targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  for (const goal of goals) {
    try {
      const response = await fetch(`${API_BASE_URL}/goals`, {
        method: 'POST',
        headers,
        body: JSON.stringify(goal),
      });
      const data = await response.json();
      console.log(`✅ Created goal: ${goal.title}`);
    } catch (error) {
      console.error(`Failed to create goal ${goal.title}:`, error);
    }
  }

  // Create tasks
  const tasks = [
    // Daily habits
    {
      title: "Morning Meditation",
      description: "10 minutes of mindfulness meditation",
      taskCategory: "habit",
      taskType: "daily",
      difficulty: "easy",
      requiredEnergyBalls: 1,
      expReward: 20,
    },
    {
      title: "Evening Run",
      description: "5km run in the park",
      taskCategory: "habit", 
      taskType: "daily",
      difficulty: "medium",
      requiredEnergyBalls: 2,
      expReward: 30,
    },
    {
      title: "Read 'Atomic Habits'",
      description: "Read 30 pages before bed",
      taskCategory: "habit",
      taskType: "daily",
      difficulty: "easy",
      requiredEnergyBalls: 1,
      expReward: 20,
    },
    // Main quests
    {
      title: "Complete React Native Course Module 3",
      description: "Learn about navigation and state management",
      taskCategory: "todo",
      taskType: "main",
      difficulty: "hard",
      requiredEnergyBalls: 3,
      expReward: 50,
    },
    {
      title: "Week 4 Marathon Training",
      description: "Complete all scheduled runs for week 4",
      taskCategory: "todo",
      taskType: "main",
      difficulty: "hard",
      requiredEnergyBalls: 4,
      expReward: 40,
    },
    // Side quests
    {
      title: "Review Investment Portfolio",
      description: "Check and rebalance investment allocations",
      taskCategory: "todo",
      taskType: "simple",
      difficulty: "medium",
      requiredEnergyBalls: 1,
      expReward: 25,
    },
    {
      title: "Call Mom",
      description: "Weekly catch-up call with family",
      taskCategory: "todo",
      taskType: "simple",
      difficulty: "easy",
      requiredEnergyBalls: 1,
      expReward: 15,
    },
  ];

  for (const task of tasks) {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks`, {
        method: 'POST',
        headers,
        body: JSON.stringify(task),
      });
      const data = await response.json();
      console.log(`✅ Created task: ${task.title}`);
    } catch (error) {
      console.error(`Failed to create task ${task.title}:`, error);
    }
  }

  // Complete some tasks to show activity
  console.log("\n3. Completing some tasks for demo activity...");
  try {
    // Get all tasks
    const tasksResponse = await fetch(`${API_BASE_URL}/tasks`, {
      headers,
    });
    const tasksData = await tasksResponse.json();
    
    if (tasksData.success && tasksData.data) {
      // Complete a few tasks
      const tasksToComplete = tasksData.data.slice(0, 3);
      for (const task of tasksToComplete) {
        const completeResponse = await fetch(`${API_BASE_URL}/tasks/${task.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ ...task, completed: true }),
        });
        console.log(`✅ Completed task: ${task.title}`);
      }
    }
  } catch (error) {
    console.error("Failed to complete demo tasks:", error);
  }

  console.log("\n✅ Demo account created and populated successfully!");
  console.log("\nAccount details:");
  console.log("Email: demo@levelupsolo.net");
  console.log("Password: Demo123456");
  console.log("\nDemo data includes:");
  console.log("- 3 active goals");
  console.log("- 7 tasks (mix of habits and quests)");
  console.log("- Some completed tasks for activity history");
}

// Run the script
createDemoAccount();