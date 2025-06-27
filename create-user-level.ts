import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ooepnnsbmtyrcqlqykkr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vZXBubnNibXR5cmNxbHF5a2tyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDk0MDI1MywiZXhwIjoyMDY2NTE2MjUzfQ.v5m16Wg3idCJPHTQCJlR0uqP9k0i8xZadZVd8MMUXCA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupUserLevel() {
  const userId = '31581595';
  
  // First, create the user_levels table if it doesn't exist
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS user_levels (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      level INTEGER NOT NULL DEFAULT 1,
      experience INTEGER NOT NULL DEFAULT 0,
      total_experience INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    // Execute raw SQL to create table
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: createTableSQL
    });

    if (createError) {
      console.log('Table might already exist or no exec_sql function');
      
      // Try to insert directly
      const { data: existing, error: checkError } = await supabase
        .from('user_levels')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (checkError && checkError.code === 'PGRST116') {
        // Table doesn't exist, let's try another approach
        console.log('user_levels table does not exist');
        console.log('Please create the table manually in Supabase dashboard with this SQL:');
        console.log(createTableSQL);
      } else if (existing) {
        console.log('User level already exists:', existing);
      } else {
        // Insert new record
        const { data: inserted, error: insertError } = await supabase
          .from('user_levels')
          .insert({
            user_id: userId,
            level: 5,
            experience: 60,
            total_experience: 60
          })
          .select()
          .single();

        if (insertError) {
          console.error('Insert error:', insertError);
        } else {
          console.log('User level created:', inserted);
        }
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }

  // Check user_growth_records table which might store level info
  const { data: growthRecords } = await supabase
    .from('user_growth_records')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (growthRecords && growthRecords.length > 0) {
    console.log('\nLatest growth record:', growthRecords[0]);
  } else {
    // Create a growth record
    const { data: newRecord, error: recordError } = await supabase
      .from('user_growth_records')
      .insert({
        user_id: userId,
        level: 5,
        experience: 60,
        experience_gained: 60,
        activity_type: 'migration',
        activity_description: 'Migrated from old system'
      })
      .select()
      .single();

    if (recordError) {
      console.error('Growth record error:', recordError);
    } else {
      console.log('Growth record created:', newRecord);
    }
  }

  process.exit(0);
}

setupUserLevel();