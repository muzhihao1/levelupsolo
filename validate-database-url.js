// 验证数据库 URL 格式
const testUrls = [
  // 基础正确格式
  "postgresql://postgres.ooepnnsbmtyrcqlqykkr:zbrGHpuON0CNfZBt@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres",
  
  // 可能需要编码的版本（如果密码有特殊字符）
  "postgresql://postgres.ooepnnsbmtyrcqlqykkr:zbrGHpuON%2D0CNfZBt@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres",
  
  // 不同的密码格式
  "postgresql://postgres.ooepnnsbmtyrcqlqykkr:zbrGHpuON0CNfZBt@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require",
];

console.log("🔍 验证数据库 URL 格式...\n");

testUrls.forEach((url, index) => {
  console.log(`${index + 1}️⃣ 测试 URL ${index + 1}:`);
  console.log(`   ${url.replace(/:([^@]+)@/, ':****@')}`);
  
  try {
    const parsed = new URL(url);
    console.log("   ✅ URL 格式有效");
    console.log(`   - 协议: ${parsed.protocol}`);
    console.log(`   - 用户名: ${parsed.username}`);
    console.log(`   - 主机: ${parsed.hostname}`);
    console.log(`   - 端口: ${parsed.port}`);
    console.log(`   - 数据库: ${parsed.pathname.substring(1)}`);
    
    // 检查格式正确性
    const issues = [];
    if (!parsed.username.startsWith('postgres.')) {
      issues.push("用户名格式错误");
    }
    if (!parsed.hostname.includes('pooler.supabase.com')) {
      issues.push("不是 Session Pooler");
    }
    if (parsed.port !== '5432') {
      issues.push("端口应该是 5432");
    }
    
    if (issues.length === 0) {
      console.log("   ✅ 格式完全正确!");
    } else {
      console.log("   ⚠️  发现问题:", issues.join(", "));
    }
    
    console.log("");
    
  } catch (error) {
    console.log("   ❌ URL 无效:", error.message);
    console.log("");
  }
});

console.log("📋 Railway 环境变量设置指南:");
console.log("");
console.log("1. 确保 URL 是一行，没有换行符");
console.log("2. 确保没有前后空格");
console.log("3. 确保密码正确（区分大小写）");
console.log("4. 如果复制粘贴，请手动检查特殊字符");
console.log("");
console.log("🎯 推荐使用的 URL:");
console.log("postgresql://postgres.ooepnnsbmtyrcqlqykkr:zbrGHpuON0CNfZBt@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres");
console.log("");
console.log("💡 如果还是 Invalid URL，可能需要手动输入而不是复制粘贴");

// 如果有 postgres 包，测试连接
try {
  const postgres = require("postgres");
  const correctUrl = "postgresql://postgres.ooepnnsbmtyrcqlqykkr:zbrGHpuON0CNfZBt@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres";
  
  console.log("\n🔗 测试实际连接...");
  const sql = postgres(correctUrl, { connect_timeout: 5, max: 1 });
  
  sql`SELECT 1`
    .then(() => {
      console.log("✅ 连接成功！这个 URL 是正确的");
      process.exit(0);
    })
    .catch(err => {
      console.log("❌ 连接失败:", err.message);
      process.exit(1);
    });
    
} catch (error) {
  console.log("\n(跳过连接测试，postgres 包不可用)");
}