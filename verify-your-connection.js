// 验证你的 Supabase 连接字符串

// 你提供的 "Session Pooler" 字符串（有问题）
const yourProvidedString = "postgresql://postgres.ooepnnsbmtyrcqlqykkr:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres";

// 基于你的密码和截图，正确的应该是
const correctFormat1 = "postgresql://postgres.ooepnnsbmtyrcqlqykkr:zbrGHpuON0CNfZBt@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";
const correctFormat2 = "postgresql://postgres.ooepnnsbmtyrcqlqykkr:zbrGHpuON0CNfZBt@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres";

console.log("🔍 分析你的连接字符串问题：\n");

console.log("❌ 你提供的字符串有问题：");
console.log(yourProvidedString);
console.log("\n问题：");
console.log("1. 端口 5432 是错误的 - Session Pooler 必须用 6543");
console.log("2. 这看起来像是你从 Direct Connection 标签复制的\n");

console.log("✅ 正确的格式应该是以下之一：\n");
console.log("如果你的项目在新加坡 (ap-southeast-1):");
console.log(correctFormat1);
console.log("\n如果你的项目在东京 (ap-northeast-1):");
console.log(correctFormat2);

console.log("\n📋 关键区别：");
console.log("┌─────────────────┬──────────────────────┬──────────────────────┐");
console.log("│ 连接类型        │ Direct Connection    │ Session Pooler       │");
console.log("├─────────────────┼──────────────────────┼──────────────────────┤");
console.log("│ 端口            │ 5432                 │ 6543                 │");
console.log("│ 域名格式        │ db.xxx.supabase.co   │ xxx.pooler.supabase  │");
console.log("│ 支持 Railway    │ ❌ 不支持            │ ✅ 支持              │");
console.log("│ 用户名格式      │ postgres             │ postgres.项目引用     │");
console.log("└─────────────────┴──────────────────────┴──────────────────────┘");

console.log("\n🚨 重要提醒：");
console.log("你必须从 Supabase Dashboard 的 'Session pooler' 标签页复制连接字符串！");
console.log("不要从 'Direct connection' 标签页复制！");

console.log("\n🔧 立即行动：");
console.log("1. 去 Supabase Dashboard");
console.log("2. Settings → Database");
console.log("3. 点击 'Session pooler' 标签（不是 Direct connection）");
console.log("4. 复制完整的连接字符串");
console.log("5. 更新 Railway 的 DATABASE_URL 变量");

// 测试连接
const postgres = require("postgres");

console.log("\n📡 测试正确格式的连接（使用 ap-southeast-1）...");

try {
  const sql = postgres(correctFormat1, {
    connect_timeout: 10,
    max: 1
  });
  
  sql`SELECT 1`
    .then(() => {
      console.log("✅ 连接成功！使用这个连接字符串");
      process.exit(0);
    })
    .catch(err => {
      console.log("❌ ap-southeast-1 连接失败:", err.message);
      
      console.log("\n📡 尝试 ap-northeast-1...");
      const sql2 = postgres(correctFormat2, {
        connect_timeout: 10,
        max: 1
      });
      
      sql2`SELECT 1`
        .then(() => {
          console.log("✅ 连接成功！你的项目在 ap-northeast-1 区域");
          process.exit(0);
        })
        .catch(err2 => {
          console.log("❌ 两个区域都失败了");
          console.log("请确认你的 Supabase 项目区域并使用正确的连接字符串");
          process.exit(1);
        });
    });
} catch (error) {
  console.log("❌ 连接错误:", error.message);
}