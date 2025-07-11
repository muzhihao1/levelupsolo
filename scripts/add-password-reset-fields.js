const { Client } = require('pg');
require('dotenv').config();

async function addPasswordResetFields() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Add password reset fields
    console.log('Adding password reset fields...');
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMP DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS deletion_scheduled_for TIMESTAMP DEFAULT NULL;
    `);

    // Create indexes
    console.log('Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_deletion_requested_at ON users(deletion_requested_at);
    `);

    console.log('✅ Password reset fields added successfully');
  } catch (error) {
    console.error('Failed to add password reset fields:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the script
addPasswordResetFields();