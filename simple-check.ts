import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ooepnnsbmtyrcqlqykkr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vZXBubnNibXR5cmNxbHF5a2tyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NDAyNTMsImV4cCI6MjA2NjUxNjI1M30.ElIYudaHCVdnasMNqJP9eH4YnEsuZGyQVgI9vkwymuE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkData() {
  console.log('Checking data for 279838958@qq.com...\n');

  // Find user
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', '279838958@qq.com');

  if (userError) {
    console.error('Error fetching user:', userError);
    return;
  }

  if (!users || users.length === 0) {
    console.log('No user found with email 279838958@qq.com');
    return;
  }

  const user = users[0];
  console.log('Found user:', {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name
  });

  // Check profile
  const { data: profiles, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id);

  if (profiles && profiles.length > 0) {
    console.log('\nProfile:', {
      level: profiles[0].level,
      experience: profiles[0].experience,
      name: profiles[0].name
    });
  } else {
    console.log('\nNo profile found');
  }

  // Check tasks
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id);

  console.log('\nTasks count:', tasks?.length || 0);
  if (tasks && tasks.length > 0) {
    console.log('First 3 tasks:');
    tasks.slice(0, 3).forEach((task, i) => {
      console.log(`${i + 1}. ${task.title} (${task.status})`);
    });
  }

  // Check skills
  const { data: skills, error: skillsError } = await supabase
    .from('skills')
    .select('*')
    .eq('user_id', user.id);

  console.log('\nSkills count:', skills?.length || 0);
  if (skills && skills.length > 0) {
    skills.forEach(skill => {
      console.log(`- ${skill.name}: Level ${skill.level}`);
    });
  }

  process.exit(0);
}

checkData();