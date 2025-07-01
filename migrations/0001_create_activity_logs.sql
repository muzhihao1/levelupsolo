-- Create activity_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL REFERENCES users(id),
    date TIMESTAMP NOT NULL DEFAULT NOW(),
    task_id INTEGER REFERENCES tasks(id),
    skill_id INTEGER REFERENCES skills(id),
    exp_gained INTEGER NOT NULL DEFAULT 0,
    action TEXT NOT NULL,
    description TEXT
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON activity_logs(date DESC);