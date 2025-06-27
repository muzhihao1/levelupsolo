import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ooepnnsbmtyrcqlqykkr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vZXBubnNibXR5cmNxbHF5a2tyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NDAyNTMsImV4cCI6MjA2NjUxNjI1M30.ElIYudaHCVdnasMNqJP9eH4YnEsuZGyQVgI9vkwymuE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixUserStats() {
  console.log('Fixing user stats for 279838958@qq.com...\n');

  try {
    // Check if user_stats record exists
    const { data: existing, error: checkError } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', '31581595')
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing stats:', checkError);
      return;
    }

    if (existing) {
      // Update existing record
      console.log('Found existing stats, updating...');
      const { data: updated, error: updateError } = await supabase
        .from('user_stats')
        .update({
          level: 5,
          experience: 60,
          experience_to_next: 300,
          total_tasks_completed: 69,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', '31581595')
        .select()
        .single();

      if (updateError) {
        console.error('Update error:', updateError);
      } else {
        console.log('Successfully updated user stats:');
        console.log(updated);
      }
    } else {
      // Insert new record
      console.log('No existing stats found, creating new record...');
      const { data: inserted, error: insertError } = await supabase
        .from('user_stats')
        .insert({
          user_id: '31581595',
          level: 5,
          experience: 60,
          experience_to_next: 300,
          energy_balls: 18,
          max_energy_balls: 18,
          energy_ball_duration: 15,
          energy_peak_start: 9,
          energy_peak_end: 12,
          streak: 0,
          total_tasks_completed: 69
        })
        .select()
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
      } else {
        console.log('Successfully created user stats:');
        console.log(inserted);
      }
    }

    // Also check/create growth record
    const { data: growthRecords } = await supabase
      .from('user_growth_records')
      .select('*')
      .eq('user_id', '31581595')
      .order('created_at', { ascending: false })
      .limit(1);

    if (!growthRecords || growthRecords.length === 0) {
      console.log('\nCreating growth record...');
      const { data: growthRecord, error: growthError } = await supabase
        .from('user_growth_records')
        .insert({
          user_id: '31581595',
          level: 5,
          experience: 60,
          experience_gained: 60,
          activity_type: 'migration',
          activity_description: 'Migrated from old system'
        })
        .select()
        .single();

      if (growthError) {
        console.error('Growth record error:', growthError);
      } else {
        console.log('Growth record created:', growthRecord);
      }
    }

    console.log('\n✅ All done! User stats have been fixed.');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }

  process.exit(0);
}

fixUserStats();