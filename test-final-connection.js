// 测试最终的正确连接字符串
require("dotenv").config();

const correctUrl = "postgresql://postgres.ooepnnsbmtyrcqlqykkr:zbrGHpuON0CNfZBt@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres";

console.log("🔍 测试最终的 Supabase 连接...\n");

console.log("连接字符串（基于你的截图）:");
console.log(correctUrl.replace(/:[^@]+@/, ':****@'));

const postgres = require("postgres");

console.log("\n📡 开始连接测试...");

try {
  const sql = postgres(correctUrl, {
    connect_timeout: 10,
    max: 1
  });
  
  sql`SELECT current_database() as db, current_user as user`
    .then(result => {
      console.log("\n✅ 连接成功！");
      console.log("数据库:", result[0].db);
      console.log("用户:", result[0].user);
      
      console.log("\n🎉 这就是正确的连接字符串！");
      console.log("\n请在 Railway 中设置:");
      console.log("DATABASE_URL=" + correctUrl);
      
      process.exit(0);
    })
    .catch(err => {
      console.log("\n❌ 连接失败:", err.message);
      
      if (err.message.includes("password authentication failed")) {
        console.log("\n可能的原因:");
        console.log("1. 密码不正确");
        console.log("2. 需要重置数据库密码");
      } else if (err.message.includes("Tenant or user not found")) {
        console.log("\n用户名格式可能有问题，请确认 Supabase 中的连接字符串");
      }
      
      process.exit(1);
    });
} catch (error) {
  console.log("❌ 错误:", error.message);
  process.exit(1);
}