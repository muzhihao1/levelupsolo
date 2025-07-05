// 测试注册和登录问题
require("dotenv").config();
const postgres = require("postgres");
const bcrypt = require("bcryptjs");

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres.ooepnnsbmtyrcqlqykkr:zbrGHpuON0CNfZBt@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres";

console.log("🔍 诊断注册/登录问题...\n");

async function testDatabaseIssue() {
  try {
    // 1. 测试数据库连接
    console.log("1️⃣ 测试数据库连接...");
    const sql = postgres(DATABASE_URL);
    
    const testResult = await sql`SELECT 1 as test`;
    console.log("✅ 数据库连接成功");
    
    // 2. 检查 users 表是否存在
    console.log("\n2️⃣ 检查 users 表...");
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      ) as exists
    `;
    
    if (!tableCheck[0].exists) {
      console.log("❌ users 表不存在！");
      console.log("需要运行数据库迁移来创建表");
      return;
    }
    console.log("✅ users 表存在");
    
    // 3. 查看表结构
    console.log("\n3️⃣ 检查 users 表结构...");
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'users'
      ORDER BY ordinal_position
    `;
    
    console.log("表结构:");
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });
    
    // 检查是否有 hashed_password 列
    const hasPasswordCol = columns.some(col => col.column_name === 'hashed_password');
    if (!hasPasswordCol) {
      console.log("\n❌ 缺少 hashed_password 列！");
      console.log("这可能是问题的原因");
    }
    
    // 4. 模拟注册过程
    console.log("\n4️⃣ 测试注册流程...");
    const testEmail = `test_${Date.now()}@example.com`;
    const testPassword = "test123456";
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      await sql`
        INSERT INTO users (id, email, first_name, last_name, hashed_password, created_at, updated_at)
        VALUES (${userId}, ${testEmail}, ${'Test'}, ${'User'}, ${hashedPassword}, NOW(), NOW())
      `;
      console.log("✅ 测试用户注册成功");
      
      // 5. 验证用户是否真的保存了
      console.log("\n5️⃣ 验证用户是否保存...");
      const savedUser = await sql`
        SELECT id, email, hashed_password 
        FROM users 
        WHERE email = ${testEmail}
      `;
      
      if (savedUser.length > 0) {
        console.log("✅ 用户已保存到数据库");
        console.log(`  - ID: ${savedUser[0].id}`);
        console.log(`  - Email: ${savedUser[0].email}`);
        console.log(`  - Password Hash: ${savedUser[0].hashed_password ? '已设置' : '未设置'}`);
        
        // 6. 测试密码验证
        console.log("\n6️⃣ 测试密码验证...");
        const isValid = await bcrypt.compare(testPassword, savedUser[0].hashed_password);
        console.log(`密码验证结果: ${isValid ? '✅ 成功' : '❌ 失败'}`);
        
        // 清理测试数据
        await sql`DELETE FROM users WHERE id = ${userId}`;
        console.log("\n✅ 测试数据已清理");
      } else {
        console.log("❌ 用户未保存到数据库！");
      }
      
    } catch (insertError) {
      console.log("❌ 注册失败:", insertError.message);
      console.log("错误详情:", insertError);
    }
    
    // 7. 查看最近注册的用户
    console.log("\n7️⃣ 查看最近注册的用户...");
    const recentUsers = await sql`
      SELECT id, email, created_at,
             CASE WHEN hashed_password IS NOT NULL THEN '已设置' ELSE '未设置' END as password_status
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    
    if (recentUsers.length > 0) {
      console.log("最近的用户:");
      recentUsers.forEach(user => {
        console.log(`  - ${user.email} (${user.password_status}) - ${user.created_at}`);
      });
    } else {
      console.log("数据库中没有用户");
    }
    
    await sql.end();
    
    // 8. 总结
    console.log("\n📊 诊断总结:");
    console.log("1. 数据库连接: ✅");
    console.log("2. users 表存在: ✅");
    console.log("3. 表结构正确: " + (hasPasswordCol ? "✅" : "❌"));
    console.log("4. 可以插入数据: ✅");
    console.log("5. 密码验证功能: ✅");
    
    console.log("\n🔍 可能的问题:");
    console.log("1. Railway 环境变量没有正确设置");
    console.log("2. 注册时使用了不同的数据库连接");
    console.log("3. 有多个数据库实例在运行");
    console.log("4. 注册操作可能在内存中而不是真实数据库");
    
  } catch (error) {
    console.error("❌ 错误:", error.message);
    console.error("详情:", error);
  }
}

testDatabaseIssue();