// 检查 Supabase 连接字符串问题
require("dotenv").config();

console.log("🔍 分析你的 Supabase 连接配置...\n");

// 你提供的 Session Pooler 字符串
const providedString = "postgresql://postgres.ooepnnsbmtyrcqlqykkr:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres";

// 你实际设置的（从截图看到的）
const actualString = "postgresql://postgres.ooepnnsbmtyrcqlqykkr:zbrGHpuON0CNfZBt@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";

console.log("📋 你提供的 Session Pooler 字符串：");
console.log(providedString);
console.log("\n📸 截图中实际设置的：");
console.log(actualString.replace(/:[^@]+@/, ':****@'));

console.log("\n❌ 发现的问题：");

console.log("\n1. 端口号不一致：");
console.log("   - 你提供的: 5432 (这通常是 Direct Connection 端口)");
console.log("   - 实际设置: 6543 (这是 Session Pooler 端口)");

console.log("\n2. 区域不一致：");
console.log("   - 你提供的: ap-northeast-1 (日本东京)");
console.log("   - 实际设置: ap-southeast-1 (新加坡)");

console.log("\n⚠️  这可能是问题的关键！");

console.log("\n🔧 解决方案：");
console.log("\n请按以下步骤操作：");
console.log("1. 登录 Supabase Dashboard");
console.log("2. 进入 Settings → Database");
console.log("3. 确认选择的是 'Session pooler' 标签");
console.log("4. 注意 Session Pooler 的端口应该是 6543，不是 5432");
console.log("5. 检查你的项目在哪个区域（Region）");
console.log("6. 复制完整的连接字符串");

console.log("\n正确的格式应该是：");
console.log("postgresql://postgres.ooepnnsbmtyrcqlqykkr:zbrGHpuON0CNfZBt@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres");
console.log("                                                                     ↑ 你的实际区域              ↑ 必须是6543");

// 测试当前设置的连接
if (process.env.DATABASE_URL) {
  console.log("\n📡 测试当前 .env 中的连接...");
  const postgres = require("postgres");
  
  try {
    const sql = postgres(process.env.DATABASE_URL, {
      connect_timeout: 10,
      max: 1
    });
    
    sql`SELECT 1`
      .then(() => {
        console.log("✅ 本地连接成功！");
        process.exit(0);
      })
      .catch(err => {
        console.log("❌ 连接失败:", err.message);
        
        if (err.message.includes("Tenant or user not found")) {
          console.log("\n可能是区域设置错误，请确认你的 Supabase 项目所在区域");
        }
        
        process.exit(1);
      });
  } catch (error) {
    console.log("❌ 创建连接失败:", error.message);
  }
}