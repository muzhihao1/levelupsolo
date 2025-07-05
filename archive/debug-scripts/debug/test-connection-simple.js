// 最简单的 Supabase 连接测试
require("dotenv").config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.log("❌ DATABASE_URL 未设置");
  process.exit(1);
}

console.log("🔍 分析 DATABASE_URL...\n");

// 解析 URL
try {
  const url = new URL(DATABASE_URL);
  
  console.log("解析结果：");
  console.log("- 协议:", url.protocol);
  console.log("- 用户名:", url.username);
  console.log("- 主机:", url.hostname);
  console.log("- 端口:", url.port);
  console.log("- 数据库:", url.pathname.substring(1));
  
  console.log("\n诊断：");
  
  // 检查是否是 Session Pooler
  if (url.port === '6543' && url.hostname.includes('pooler.supabase.com')) {
    console.log("✅ 使用 Session Pooler (正确)");
  } else if (url.port === '5432') {
    console.log("❌ 使用 Direct Connection (错误)");
    console.log("   解决: 在 Supabase 选择 'Session pooler' 标签");
  }
  
  // 检查用户名格式
  if (url.username.startsWith('postgres.')) {
    console.log("✅ 用户名格式正确");
  } else if (url.username === 'postgres') {
    console.log("❌ 用户名格式错误 - 缺少项目引用");
    console.log("   当前: postgres");
    console.log("   应该: postgres.xxxxxxxxxxxxx (xxxxx 是项目引用)");
    console.log("\n⚠️  这就是 'Tenant or user not found' 错误的原因！");
  }
  
  // 检查密码特殊字符
  const password = decodeURIComponent(url.password);
  if (password !== url.password) {
    console.log("⚠️  密码包含已编码的特殊字符");
  }
  
  console.log("\n🔧 修复建议：");
  console.log("1. 登录 Supabase Dashboard");
  console.log("2. Settings → Database");
  console.log("3. 选择 'Session pooler' 标签（不是 Direct connection）");
  console.log("4. 复制完整的连接字符串");
  console.log("5. 确保用户名是 postgres.xxxxx 格式");
  
} catch (error) {
  console.log("❌ URL 格式无效:", error.message);
}

// 测试实际连接
console.log("\n📡 测试连接...");
const postgres = require("postgres");

try {
  const sql = postgres(DATABASE_URL, {
    connect_timeout: 10,
    max: 1
  });
  
  sql`SELECT 1`
    .then(() => {
      console.log("✅ 连接成功！");
      process.exit(0);
    })
    .catch(err => {
      console.log("❌ 连接失败:", err.message);
      
      if (err.message.includes("Tenant or user not found")) {
        console.log("\n问题确认：用户名格式不正确");
        console.log("必须使用 Session Pooler 连接字符串");
      }
      
      process.exit(1);
    });
} catch (error) {
  console.log("❌ 创建连接失败:", error.message);
  process.exit(1);
}