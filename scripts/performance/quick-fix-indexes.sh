#!/bin/bash
# 快速性能优化脚本 - 添加关键数据库索引
# 这将显著提升查询性能

echo "🚀 Level Up Solo 性能优化 - 数据库索引"
echo "========================================="
echo ""
echo "此脚本将添加关键的数据库索引来提升任务创建速度"
echo ""

# 检查 DATABASE_URL 是否设置
if [ -z "$DATABASE_URL" ]; then
    echo "❌ 错误: DATABASE_URL 环境变量未设置"
    echo "请先设置: export DATABASE_URL='your-railway-database-url'"
    exit 1
fi

echo "📊 开始添加索引..."
echo ""

# 创建索引的 SQL
psql $DATABASE_URL << EOF
-- 添加任务表索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_user_category ON tasks(user_id, task_category);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_user_completed ON tasks(user_id, completed);

-- 添加技能表索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_skills_user_id ON skills(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_skills_user_name ON skills(user_id, name);

-- 添加用户统计表索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);

-- 分析表以更新查询计划器
ANALYZE tasks;
ANALYZE skills;
ANALYZE user_stats;
EOF

echo ""
echo "✅ 索引创建完成！"
echo ""
echo "预期效果："
echo "- 任务查询速度提升 5-10 倍"
echo "- 技能初始化速度提升 3-5 倍"
echo ""
echo "下一步："
echo "1. 重启应用以确保使用新的查询计划"
echo "2. 测试任务创建速度是否有改善"
echo ""