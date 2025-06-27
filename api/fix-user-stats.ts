import type { VercelRequest, VercelResponse } from '@vercel/node';
import pg from 'pg';

const { Pool } = pg;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify the request is for the specific user
    const { email } = req.body;
    if (email !== '279838958@qq.com') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const pool = new Pool({
      connectionString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL,
    });

    // Insert or update user stats
    const result = await pool.query(`
      INSERT INTO user_stats (
        user_id, 
        level, 
        experience, 
        experience_to_next,
        energy_balls,
        max_energy_balls,
        energy_ball_duration,
        energy_peak_start,
        energy_peak_end,
        streak,
        total_tasks_completed
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        level = $2,
        experience = $3,
        experience_to_next = $4,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      '31581595', // user_id
      5,          // level
      60,         // experience
      300,        // experience_to_next (from CSV data)
      18,         // energy_balls
      18,         // max_energy_balls
      15,         // energy_ball_duration
      9,          // energy_peak_start
      12,         // energy_peak_end
      0,          // streak
      69          // total_tasks_completed (based on task count)
    ]);

    await pool.end();

    return res.status(200).json({ 
      success: true, 
      userStats: result.rows[0],
      message: 'User stats have been set to Level 5 with 60 XP'
    });

  } catch (error) {
    console.error('Fix user stats error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}