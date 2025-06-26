-- 将密码字段添加到 users 表
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS hashed_password TEXT;

-- 从 user_passwords 表迁移数据
UPDATE users u
SET hashed_password = up.hashed_password
FROM user_passwords up
WHERE u.id = up.user_id;

-- 删除 user_passwords 表（确认数据迁移后再执行）
-- DROP TABLE IF EXISTS user_passwords;