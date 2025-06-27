import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ooepnnsbmtyrcqlqykkr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vZXBubnNibXR5cmNxbHF5a2tyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NDAyNTMsImV4cCI6MjA2NjUxNjI1M30.ElIYudaHCVdnasMNqJP9eH4YnEsuZGyQVgI9vkwymuE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkUserLevels() {
  const userId = '31581595';
  
  // Check if there's a user_levels table
  const { data: levels, error: levelsError } = await supabase
    .from('user_levels')
    .select('*')
    .eq('user_id', userId);

  if (levelsError) {
    console.log('No user_levels table or error:', levelsError.message);
  } else {
    console.log('User levels:', levels);
  }

  // Check activities to calculate level
  const { data: activities, error: activitiesError } = await supabase
    .from('activities')
    .select('*')
    .eq('user_id', userId);

  if (activities) {
    console.log('\nTotal activities:', activities.length);
    
    // Calculate total XP from activities
    const totalXP = activities.reduce((sum, activity) => sum + (activity.experience_gained || 0), 0);
    console.log('Total XP from activities:', totalXP);
  }

  // Check user_growth_records
  const { data: growthRecords, error: growthError } = await supabase
    .from('user_growth_records')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (growthRecords && growthRecords.length > 0) {
    console.log('\nGrowth records:');
    growthRecords.forEach(record => {
      console.log(`- Level ${record.level}, XP: ${record.experience} (${record.created_at})`);
    });
  }

  process.exit(0);
}

checkUserLevels();