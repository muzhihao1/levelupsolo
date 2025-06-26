-- 删除 user_passwords 表
-- 由于已经将密码字段整合到 users 表中，这个表不再需要

-- 首先检查表是否存在并且是空的
DO $$
BEGIN
    -- 检查表是否为空
    IF EXISTS (SELECT 1 FROM user_passwords LIMIT 1) THEN
        RAISE EXCEPTION 'user_passwords 表不为空，请先确认数据已迁移';
    END IF;
    
    -- 如果表为空，则删除
    DROP TABLE IF EXISTS user_passwords CASCADE;
    RAISE NOTICE '成功删除 user_passwords 表';
END $$;