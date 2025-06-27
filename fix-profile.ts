import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ooepnnsbmtyrcqlqykkr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vZXBubnNibXR5cmNxbHF5a2tyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NDAyNTMsImV4cCI6MjA2NjUxNjI1M30.ElIYudaHCVdnasMNqJP9eH4YnEsuZGyQVgI9vkwymuE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixProfile() {
  const userId = '31581595';
  
  // First check the full profile data
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  console.log('Current profile:', profile);

  // Update profile with correct level and experience
  const { data: updated, error: updateError } = await supabase
    .from('user_profiles')
    .update({
      level: 5,
      experience: 60,
      total_experience: 60
    })
    .eq('user_id', userId);

  if (updateError) {
    console.error('Update error:', updateError);
  } else {
    console.log('Profile updated successfully');
    
    // Verify update
    const { data: newProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    console.log('Updated profile:', newProfile);
  }

  process.exit(0);
}

fixProfile();