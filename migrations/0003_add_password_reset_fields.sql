-- Add password reset fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP DEFAULT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Add deletion requested fields for account deletion functionality
ALTER TABLE users
ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMP DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deletion_scheduled_for TIMESTAMP DEFAULT NULL;

-- Create index for deletion management
CREATE INDEX IF NOT EXISTS idx_users_deletion_requested_at ON users(deletion_requested_at);