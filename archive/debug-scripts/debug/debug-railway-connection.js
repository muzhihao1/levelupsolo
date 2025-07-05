// 调试 Railway 数据库连接问题
const postgres = require("postgres");

// 模拟 Railway 环境，测试可能的连接字符串
const possibleUrls = [
  // 原始确认的正确URL
  "postgresql://postgres.ooepnnsbmtyrcqlqykkr:zbrGHpuON0CNfZBt@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres",
  
  // 可能的变体（如果有编码问题）
  "postgresql://postgres.ooepnnsbmtyrcqlqykkr:zbrGHpuON%2D0CNfZBt@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres",
  
  // 不同端口的版本
  "postgresql://postgres.ooepnnsbmtyrcqlqykkr:zbrGHpuON0CNfZBt@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres",
  
  // 可能没有正确设置的版本
  "postgresql://postgres.ooepnnsbmtyrcqlqykkr:zbrGHpuON0CNfZBt@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
];

async function testConnections() {
  console.log("🔍 测试不同的连接字符串...\n");
  
  for (let i = 0; i < possibleUrls.length; i++) {
    const url = possibleUrls[i];
    console.log(`${i + 1}️⃣ 测试连接 ${i + 1}:`);
    console.log(`URL: ${url.replace(/:[^@]+@/, ':****@')}`);
    
    try {
      // 使用与 Railway 相同的连接方式
      const sql = postgres(url, {
        connect_timeout: 10,
        max: 1
      });
      
      const result = await sql`SELECT 1 as test`;
      console.log("✅ 连接成功!");
      
      // 测试用户表
      try {
        const userCount = await sql`SELECT COUNT(*) as count FROM users`;
        console.log(`✅ 用户表可访问，共 ${userCount[0].count} 个用户`);
      } catch (tableError) {
        console.log("❌ 用户表不可访问:", tableError.message);
      }
      
      await sql.end();
      console.log("这是正确的连接字符串!\n");
      return;
      
    } catch (error) {
      console.log("❌ 连接失败:", error.message);
      
      if (error.message.includes("Tenant or user not found")) {
        console.log("   → 可能是用户名格式或区域问题");
      } else if (error.message.includes("password authentication failed")) {
        console.log("   → 密码错误");
      } else if (error.message.includes("ENETUNREACH") || error.message.includes("ENOTFOUND")) {
        console.log("   → 网络连接或域名问题");
      } else {
        console.log("   → 其他错误");
      }
      console.log("");
    }
  }
  
  console.log("🚨 所有连接都失败了！");
  console.log("\n建议检查:");
  console.log("1. Railway 环境变量中的 DATABASE_URL 是否完整");
  console.log("2. 是否有特殊字符编码问题");
  console.log("3. Supabase 项目是否处于活跃状态");
  console.log("4. 是否需要重置数据库密码");
}

// 也测试具体的错误类型
async function testSpecificIssues() {
  console.log("\n🔧 测试特定问题...\n");
  
  const baseUrl = "postgresql://postgres.ooepnnsbmtyrcqlqykkr:zbrGHpuON0CNfZBt@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres";
  
  try {
    // 测试 URL 解析
    const url = new URL(baseUrl);
    console.log("✅ URL 解析成功:");
    console.log(`  - 用户名: ${url.username}`);
    console.log(`  - 主机: ${url.hostname}`);
    console.log(`  - 端口: ${url.port}`);
    console.log(`  - 数据库: ${url.pathname.substring(1)}`);
    
    // 检查格式
    if (url.username.startsWith('postgres.')) {
      console.log("✅ 用户名格式正确");
    } else {
      console.log("❌ 用户名格式错误");
    }
    
    if (url.hostname.includes('pooler.supabase.com')) {
      console.log("✅ 使用 Session Pooler");
    } else {
      console.log("❌ 不是 Session Pooler");
    }
    
  } catch (parseError) {
    console.log("❌ URL 解析失败:", parseError.message);
  }
}

testConnections().then(() => {
  testSpecificIssues();
});