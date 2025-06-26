-- 添加用户密码表
CREATE TABLE IF NOT EXISTS user_passwords (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  hashed_password TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_passwords_user_id ON user_passwords(user_id);

-- 添加更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_passwords_updated_at BEFORE UPDATE
  ON user_passwords FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();