import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
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

    // Create user_levels table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_levels (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        level INTEGER NOT NULL DEFAULT 1,
        experience INTEGER NOT NULL DEFAULT 0,
        total_experience INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert or update user level
    const result = await pool.query(`
      INSERT INTO user_levels (user_id, level, experience, total_experience)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        level = $2,
        experience = $3,
        total_experience = $4,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, ['31581595', 5, 60, 60]);

    // Also ensure growth record exists
    await pool.query(`
      INSERT INTO user_growth_records (user_id, level, experience, experience_gained, activity_type, activity_description)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT DO NOTHING
    `, ['31581595', 5, 60, 60, 'migration', 'Migrated from old system']);

    await pool.end();

    return res.status(200).json({ 
      success: true, 
      userLevel: result.rows[0],
      message: 'User level has been set to Level 5 with 60 XP'
    });

  } catch (error) {
    console.error('Fix user level error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}