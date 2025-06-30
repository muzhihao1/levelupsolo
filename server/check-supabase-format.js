#!/usr/bin/env node

/**
 * Supabase 连接字符串格式快速检查
 * 
 * 专门用于诊断 "Tenant or user not found" 错误
 */

require("dotenv").config();

console.log("=== Supabase 连接格式检查 ===\n");

// 获取连接字符串
const url = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;

if (!url) {
  console.error("❌ 未找到 DATABASE_URL 环境变量");
  process.exit(1);
}

// 解析URL
try {
  const parsed = new URL(url);
  
  console.log("📍 连接信息:");
  console.log(`   完整URL: ${url.substring(0, 50)}...`);
  console.log(`   用户名: ${parsed.username}`);
  console.log(`   主机: ${parsed.hostname}`);
  console.log(`   端口: ${parsed.port}`);
  console.log(`   数据库: ${parsed.pathname.slice(1)}`);
  
  console.log("\n🔍 格式检查:");
  
  // 检查用户名格式
  const usernameValid = parsed.username.startsWith('postgres.');
  console.log(`   用户名格式: ${usernameValid ? '✅' : '❌'} ${usernameValid ? '正确' : '错误 - 必须是 postgres.xxxxx 格式'}`);
  
  // 检查连接类型
  const isPooler = parsed.hostname.includes('.pooler.supabase.com');
  const isDirect = parsed.hostname.includes('.supabase.co');
  
  if (isPooler) {
    console.log(`   连接类型: ✅ Session Pooler (推荐)`);
    const portValid = parsed.port === '6543';
    console.log(`   端口检查: ${portValid ? '✅' : '❌'} ${portValid ? '正确' : `错误 - Session Pooler 应使用 6543，当前是 ${parsed.port}`}`);
  } else if (isDirect) {
    console.log(`   连接类型: ⚠️  Direct Connection (可能导致问题)`);
    console.log(`   建议: 使用 Session Pooler 连接`);
  } else {
    console.log(`   连接类型: ❌ 未知的主机格式`);
  }
  
  // 检查密码特殊字符
  const specialChars = ['@', '#', '%', '&', '+', '=', '?', '/', ':', ' '];
  const hasSpecialChars = specialChars.some(char => parsed.password.includes(char));
  
  if (hasSpecialChars) {
    console.log(`   密码检查: ⚠️  包含特殊字符，可能需要URL编码`);
  } else {
    console.log(`   密码检查: ✅ 无特殊字符`);
  }
  
  // 提供修复建议
  if (!usernameValid || !isPooler) {
    console.log("\n💡 修复建议:");
    console.log("1. 登录 Supabase Dashboard");
    console.log("2. 进入 Settings → Database");
    console.log("3. 选择 'Session pooler' 标签");
    console.log("4. 复制完整的连接字符串");
    console.log("5. 更新你的 DATABASE_URL 环境变量");
    
    if (!usernameValid) {
      console.log("\n⚠️  特别注意: 用户名必须是 postgres.xxxxx 格式");
      console.log("   其中 xxxxx 是你的项目引用ID");
    }
  }
  
  // 快速连接测试
  console.log("\n📡 快速连接测试...");
  const postgres = require("postgres");
  
  const sql = postgres(url, {
    ssl: 'require',
    connect_timeout: 5,
    max: 1
  });
  
  sql`SELECT 1 as test`
    .then(() => {
      console.log("✅ 连接成功!");
      sql.end();
    })
    .catch(error => {
      console.log("❌ 连接失败!");
      console.log(`   错误: ${error.message}`);
      
      if (error.message.includes('Tenant or user not found')) {
        console.log("\n🚨 这是格式问题! 请按上述建议获取正确的连接字符串。");
      }
    });
  
} catch (error) {
  console.error("❌ 无法解析URL:", error.message);
}