#!/usr/bin/env node

/**
 * Supabase连接字符串格式验证和修复工具
 * 
 * 用于诊断和修复 "Tenant or user not found" 错误
 * 
 * 使用方法:
 * node test-supabase-format.js
 */

require("dotenv").config();
const { URL } = require('url');

console.log("=== Supabase 连接字符串格式检查工具 ===\n");

/**
 * URL编码特殊字符
 */
function urlEncodePassword(password) {
  const specialChars = {
    '@': '%40',
    '#': '%23',
    '%': '%25',
    '&': '%26',
    '+': '%2B',
    '=': '%3D',
    '?': '%3F',
    '/': '%2F',
    ':': '%3A',
    ' ': '%20'
  };
  
  let encoded = password;
  for (const [char, encoding] of Object.entries(specialChars)) {
    encoded = encoded.split(char).join(encoding);
  }
  return encoded;
}

/**
 * 解析并验证连接字符串
 */
function parseConnectionString(connectionString) {
  try {
    const url = new URL(connectionString);
    
    return {
      protocol: url.protocol,
      username: url.username,
      password: url.password,
      hostname: url.hostname,
      port: url.port,
      pathname: url.pathname,
      fullUrl: connectionString
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * 验证连接字符串格式
 */
function validateConnectionString(parsed) {
  const issues = [];
  const warnings = [];
  const info = [];
  
  if (parsed.error) {
    issues.push(`❌ 无法解析URL: ${parsed.error}`);
    return { issues, warnings, info };
  }
  
  // 检查协议
  if (parsed.protocol !== 'postgresql:') {
    issues.push(`❌ 协议错误: ${parsed.protocol} (应该是 postgresql:)`);
  }
  
  // 检查用户名格式
  if (!parsed.username.startsWith('postgres.')) {
    issues.push(`❌ 用户名格式错误: "${parsed.username}"`);
    issues.push(`   必须是 "postgres.xxxxx" 格式，其中 xxxxx 是你的项目引用ID`);
  } else {
    info.push(`✅ 用户名格式正确: ${parsed.username}`);
  }
  
  // 检查主机名
  if (parsed.hostname.includes('.pooler.supabase.com')) {
    info.push(`✅ 使用 Session Pooler (推荐)`);
    
    // 检查端口
    if (parsed.port !== '6543') {
      issues.push(`❌ Session Pooler 端口错误: ${parsed.port} (应该是 6543)`);
    } else {
      info.push(`✅ 端口正确: ${parsed.port}`);
    }
  } else if (parsed.hostname.includes('.supabase.co')) {
    warnings.push(`⚠️  使用 Direct Connection (不推荐用于无服务器环境)`);
    
    if (parsed.port !== '5432') {
      issues.push(`❌ Direct Connection 端口错误: ${parsed.port} (应该是 5432)`);
    }
  } else {
    issues.push(`❌ 未知的主机名格式: ${parsed.hostname}`);
  }
  
  // 检查密码中的特殊字符
  const specialCharsInPassword = ['@', '#', '%', '&', '+', '=', '?', '/', ':', ' '];
  const foundSpecialChars = specialCharsInPassword.filter(char => parsed.password.includes(char));
  
  if (foundSpecialChars.length > 0) {
    warnings.push(`⚠️  密码包含特殊字符: ${foundSpecialChars.join(', ')}`);
    warnings.push(`   这些字符可能需要URL编码`);
  }
  
  // 检查数据库名
  if (parsed.pathname !== '/postgres') {
    warnings.push(`⚠️  数据库名: ${parsed.pathname} (通常应该是 /postgres)`);
  }
  
  return { issues, warnings, info };
}

/**
 * 生成修复后的连接字符串
 */
function generateFixedConnectionString(parsed) {
  if (parsed.error) {
    return null;
  }
  
  // 修复用户名（如果需要）
  let fixedUsername = parsed.username;
  if (!fixedUsername.startsWith('postgres.')) {
    console.log("\n⚠️  需要获取正确的用户名:");
    console.log("1. 登录 Supabase Dashboard");
    console.log("2. 进入 Settings → Database");
    console.log("3. 在 Connection String 中找到 'User' 字段");
    console.log("4. 复制完整的用户名 (格式: postgres.xxxxx)");
    return null;
  }
  
  // URL编码密码
  const encodedPassword = urlEncodePassword(parsed.password);
  
  // 生成Session Pooler URL
  const region = parsed.hostname.split('.')[0]; // 提取区域信息
  const poolerHostname = parsed.hostname.includes('.pooler.supabase.com') 
    ? parsed.hostname 
    : `${region}.pooler.supabase.com`;
  
  const fixedUrl = `postgresql://${fixedUsername}:${encodedPassword}@${poolerHostname}:6543/postgres`;
  
  return fixedUrl;
}

/**
 * 测试数据库连接
 */
async function testConnection(connectionString) {
  console.log("\n📡 测试连接...");
  
  try {
    const postgres = require("postgres");
    
    const sql = postgres(connectionString, {
      ssl: 'require',
      connect_timeout: 10,
      max: 1
    });
    
    const result = await sql`
      SELECT 
        current_database() as database,
        current_user as user,
        version() as version
    `;
    
    console.log("✅ 连接成功!");
    console.log(`   数据库: ${result[0].database}`);
    console.log(`   用户: ${result[0].user}`);
    console.log(`   版本: ${result[0].version.split(',')[0]}`);
    
    // 检查表是否存在
    const tables = await sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `;
    
    console.log(`\n📋 找到 ${tables.length} 个表:`);
    tables.forEach(t => console.log(`   - ${t.tablename}`));
    
    await sql.end();
    return true;
  } catch (error) {
    console.log("❌ 连接失败!");
    console.log(`   错误: ${error.message}`);
    
    if (error.message.includes('Tenant or user not found')) {
      console.log("\n💡 解决方案:");
      console.log("1. 确保使用正确的用户名格式 (postgres.xxxxx)");
      console.log("2. 使用 Session Pooler URL (端口 6543)");
      console.log("3. 检查项目是否处于活跃状态");
    }
    
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  // 获取数据库URL
  const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;
  
  if (!databaseUrl) {
    console.error("❌ 未找到 DATABASE_URL 或 SUPABASE_DATABASE_URL 环境变量");
    console.log("\n请在 .env 文件中设置:");
    console.log("DATABASE_URL=你的Supabase连接字符串");
    process.exit(1);
  }
  
  console.log("📍 当前连接字符串:");
  console.log(`   ${databaseUrl.substring(0, 60)}...`);
  
  // 解析连接字符串
  console.log("\n🔍 解析连接字符串...");
  const parsed = parseConnectionString(databaseUrl);
  
  if (!parsed.error) {
    console.log(`   协议: ${parsed.protocol}`);
    console.log(`   用户名: ${parsed.username}`);
    console.log(`   密码: ${'*'.repeat(parsed.password.length)}`);
    console.log(`   主机: ${parsed.hostname}`);
    console.log(`   端口: ${parsed.port}`);
    console.log(`   数据库: ${parsed.pathname}`);
  }
  
  // 验证格式
  console.log("\n🔍 验证格式...");
  const { issues, warnings, info } = validateConnectionString(parsed);
  
  // 显示信息
  info.forEach(msg => console.log(msg));
  warnings.forEach(msg => console.log(msg));
  issues.forEach(msg => console.log(msg));
  
  // 如果有问题，尝试生成修复建议
  if (issues.length > 0) {
    console.log("\n🔧 尝试生成修复建议...");
    const fixedUrl = generateFixedConnectionString(parsed);
    
    if (fixedUrl) {
      console.log("\n建议的连接字符串:");
      console.log(`DATABASE_URL=${fixedUrl}`);
      
      console.log("\n是否要测试修复后的连接? (仅测试，不会修改环境变量)");
      
      // 测试修复后的连接
      await testConnection(fixedUrl);
    }
  } else {
    // 测试当前连接
    await testConnection(databaseUrl);
  }
  
  // 额外建议
  console.log("\n💡 其他建议:");
  console.log("1. 如果仍有问题，尝试重置数据库密码（使用简单密码，不含特殊字符）");
  console.log("2. 确保 Supabase 项目处于活跃状态（未暂停）");
  console.log("3. 检查是否超出免费层限制");
  console.log("4. 考虑使用 Railway 自带的 PostgreSQL 作为替代方案");
}

// 运行主函数
main().catch(console.error);