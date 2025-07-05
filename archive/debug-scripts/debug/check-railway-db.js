// 检查 Railway 的数据库连接问题
const fetch = require('node-fetch');

async function checkRailwayDB() {
  const baseUrl = 'https://levelupsolo-production.up.railway.app';
  
  console.log("🔍 检查 Railway 部署的数据库状态...\n");
  
  // 1. 检查健康状态
  console.log("1️⃣ 检查健康状态...");
  try {
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const health = await healthRes.json();
    console.log("健康检查结果:");
    console.log(JSON.stringify(health, null, 2));
  } catch (error) {
    console.log("❌ 健康检查失败:", error.message);
  }
  
  // 2. 检查数据库连接
  console.log("\n2️⃣ 检查数据库连接测试...");
  try {
    const dbTestRes = await fetch(`${baseUrl}/api/test/db-connection`);
    const dbTest = await dbTestRes.json();
    console.log("数据库连接测试:");
    console.log(JSON.stringify(dbTest, null, 2));
  } catch (error) {
    console.log("❌ 数据库测试失败:", error.message);
  }
  
  // 3. 检查用户列表（如果有权限）
  console.log("\n3️⃣ 检查用户列表...");
  try {
    const usersRes = await fetch(`${baseUrl}/api/debug/users`);
    const users = await usersRes.json();
    console.log("用户列表:");
    console.log(JSON.stringify(users, null, 2));
  } catch (error) {
    console.log("❌ 用户列表获取失败:", error.message);
  }
  
  console.log("\n📊 分析:");
  console.log("如果上面的测试显示数据库未连接，说明:");
  console.log("1. Railway 的 DATABASE_URL 环境变量可能没有正确设置");
  console.log("2. 或者连接字符串格式有问题");
  console.log("3. 需要在 Railway 的环境变量中检查 DATABASE_URL");
}

// 如果有 node-fetch 模块
try {
  checkRailwayDB();
} catch (error) {
  // 如果没有 node-fetch，提供 curl 命令
  console.log("请运行以下命令来检查 Railway 部署:");
  console.log("\n# 健康检查");
  console.log("curl https://levelupsolo-production.up.railway.app/api/health");
  console.log("\n# 数据库连接测试");
  console.log("curl https://levelupsolo-production.up.railway.app/api/test/db-connection");
  console.log("\n# 用户列表");
  console.log("curl https://levelupsolo-production.up.railway.app/api/debug/users");
}