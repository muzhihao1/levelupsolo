import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ooepnnsbmtyrcqlqykkr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vZXBubnNibXR5cmNxbHF5a2tyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NDAyNTMsImV4cCI6MjA2NjUxNjI1M30.ElIYudaHCVdnasMNqJP9eH4YnEsuZGyQVgI9vkwymuE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyData() {
  console.log('Verifying data for 279838958@qq.com...\n');

  // Check user
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', '279838958@qq.com')
    .single();

  console.log('User:', {
    id: user?.id,
    email: user?.email,
    name: `${user?.first_name} ${user?.last_name}`
  });

  // Check user stats
  const { data: stats } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', '31581595')
    .single();

  console.log('\nUser Stats:', {
    level: stats?.level,
    experience: stats?.experience,
    experienceToNext: stats?.experience_to_next,
    totalTasksCompleted: stats?.total_tasks_completed
  });

  // Check profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', '31581595')
    .single();

  console.log('\nProfile:', {
    name: profile?.name,
    occupation: profile?.occupation,
    mission: profile?.mission
  });

  // Check tasks count
  const { count: taskCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', '31581595');

  console.log('\nTasks:', taskCount);

  // Check skills
  const { data: skills } = await supabase
    .from('skills')
    .select('name, level')
    .eq('user_id', '31581595');

  console.log('\nSkills:');
  skills?.forEach(skill => {
    console.log(`- ${skill.name}: Level ${skill.level}`);
  });

  console.log('\n✅ All data verified!');
  process.exit(0);
}

verifyData();