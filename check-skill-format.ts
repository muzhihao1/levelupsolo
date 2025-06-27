import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ooepnnsbmtyrcqlqykkr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vZXBubnNibXR5cmNxbHF5a2tyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NDAyNTMsImV4cCI6MjA2NjUxNjI1M30.ElIYudaHCVdnasMNqJP9eH4YnEsuZGyQVgI9vkwymuE'
);

async function check() {
  const { data: skills } = await supabase
    .from('skills')
    .select('*')
    .eq('user_id', '31581595');

  console.log('Skills from database:');
  console.log(JSON.stringify(skills, null, 2));
  
  console.log('\nSkill fields:');
  if (skills && skills.length > 0) {
    console.log('Available fields:', Object.keys(skills[0]));
  }
}

check();