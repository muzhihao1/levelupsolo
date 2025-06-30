#!/usr/bin/env node

/**
 * Supabase 高级诊断和修复工具
 * 
 * 功能：
 * 1. 深度诊断 "Tenant or user not found" 错误
 * 2. 自动检测和修复连接字符串问题
 * 3. 测试多种连接配置
 * 4. 提供详细的故障排除建议
 * 
 * 使用方法:
 * node test-supabase-advanced.js [--fix] [--test-all]
 */

require("dotenv").config();
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

// 命令行参数
const args = process.argv.slice(2);
const shouldFix = args.includes('--fix');
const testAll = args.includes('--test-all');

console.log("=== Supabase 高级诊断工具 ===");
console.log(`模式: ${shouldFix ? '自动修复' : '仅诊断'}\n`);

/**
 * Supabase 区域映射
 */
const SUPABASE_REGIONS = {
  'us-east-1': 'aws-0-us-east-1',
  'us-west-1': 'aws-0-us-west-1',
  'us-west-2': 'aws-0-us-west-2',
  'ap-southeast-1': 'aws-0-ap-southeast-1',
  'ap-northeast-1': 'aws-0-ap-northeast-1',
  'ap-northeast-2': 'aws-0-ap-northeast-2',
  'ap-south-1': 'aws-0-ap-south-1',
  'eu-west-1': 'aws-0-eu-west-1',
  'eu-west-2': 'aws-0-eu-west-2',
  'eu-central-1': 'aws-0-eu-central-1',
  'ca-central-1': 'aws-0-ca-central-1',
  'sa-east-1': 'aws-0-sa-east-1'
};

/**
 * 检测 Supabase 项目信息
 */
function detectSupabaseProject(url) {
  const patterns = {
    // Direct connection: db.xxxxx.supabase.co
    direct: /db\.([a-z]+)\.supabase\.co/,
    // Pooler connection: aws-0-region.pooler.supabase.com
    pooler: /(aws-0-[a-z-]+)\.pooler\.supabase\.com/,
    // 从用户名提取项目ID: postgres.xxxxx
    username: /postgres\.([a-z]+)/
  };
  
  const result = {
    projectRef: null,
    region: null,
    connectionType: null
  };
  
  // 尝试从URL提取
  const directMatch = url.match(patterns.direct);
  if (directMatch) {
    result.projectRef = directMatch[1];
    result.connectionType = 'direct';
  }
  
  const poolerMatch = url.match(patterns.pooler);
  if (poolerMatch) {
    result.region = poolerMatch[1];
    result.connectionType = 'pooler';
  }
  
  // 尝试从用户名提取
  try {
    const parsed = new URL(url);
    const usernameMatch = parsed.username.match(patterns.username);
    if (usernameMatch) {
      result.projectRef = usernameMatch[1];
    }
  } catch (e) {
    // 忽略解析错误
  }
  
  return result;
}

/**
 * 生成所有可能的连接字符串变体
 */
function generateConnectionVariants(originalUrl) {
  const variants = [];
  
  try {
    const parsed = new URL(originalUrl);
    const projectInfo = detectSupabaseProject(originalUrl);
    
    if (!projectInfo.projectRef) {
      console.log("⚠️  无法检测项目引用ID");
      return variants;
    }
    
    // 生成不同的密码编码
    const passwords = [
      parsed.password, // 原始密码
      decodeURIComponent(parsed.password), // 解码后的密码
      encodeURIComponent(decodeURIComponent(parsed.password)) // 重新编码的密码
    ];
    
    // 生成不同的主机配置
    const hosts = [];
    
    // Direct connection
    hosts.push({
      hostname: `db.${projectInfo.projectRef}.supabase.co`,
      port: '5432',
      type: 'direct'
    });
    
    // Pooler connections (尝试不同区域)
    Object.values(SUPABASE_REGIONS).forEach(region => {
      hosts.push({
        hostname: `${region}.pooler.supabase.com`,
        port: '6543',
        type: 'pooler',
        region: region
      });
    });
    
    // 生成所有组合
    hosts.forEach(host => {
      passwords.forEach(password => {
        const variant = {
          url: `postgresql://${parsed.username}:${password}@${host.hostname}:${host.port}${parsed.pathname}`,
          type: host.type,
          region: host.region,
          passwordEncoding: password === parsed.password ? 'original' : 'encoded'
        };
        variants.push(variant);
      });
    });
    
  } catch (error) {
    console.error("❌ 无法生成连接变体:", error.message);
  }
  
  return variants;
}

/**
 * 测试单个连接配置
 */
async function testSingleConnection(config, options = {}) {
  const { silent = false, timeout = 5000 } = options;
  
  if (!silent) {
    console.log(`\n测试: ${config.type} (${config.region || 'default'})`);
  }
  
  try {
    const postgres = require("postgres");
    
    const sql = postgres(config.url, {
      ssl: 'require',
      connect_timeout: Math.floor(timeout / 1000),
      max: 1,
      idle_timeout: 0,
      max_lifetime: 60 * 2
    });
    
    // 设置超时
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), timeout)
    );
    
    // 测试查询
    const queryPromise = sql`
      SELECT 
        current_database() as db,
        current_user as user,
        now() as time
    `.then(async (result) => {
      await sql.end();
      return result;
    });
    
    const result = await Promise.race([queryPromise, timeoutPromise]);
    
    if (!silent) {
      console.log(`✅ 连接成功!`);
      console.log(`   数据库: ${result[0].db}`);
      console.log(`   用户: ${result[0].user}`);
    }
    
    return { success: true, config, result: result[0] };
    
  } catch (error) {
    if (!silent) {
      console.log(`❌ 连接失败: ${error.message}`);
    }
    
    return { 
      success: false, 
      config, 
      error: error.message,
      errorCode: error.code
    };
  }
}

/**
 * 批量测试连接
 */
async function testMultipleConnections(variants) {
  console.log(`\n🔄 测试 ${variants.length} 个连接配置...`);
  
  const results = [];
  const successfulConfigs = [];
  
  // 使用 Promise.allSettled 并行测试
  const promises = variants.map(variant => 
    testSingleConnection(variant, { silent: true, timeout: 3000 })
  );
  
  const settled = await Promise.allSettled(promises);
  
  settled.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      results.push(result.value);
      if (result.value.success) {
        successfulConfigs.push(result.value);
      }
    }
  });
  
  // 显示结果摘要
  console.log(`\n📊 测试结果:`);
  console.log(`   成功: ${successfulConfigs.length}`);
  console.log(`   失败: ${results.length - successfulConfigs.length}`);
  
  if (successfulConfigs.length > 0) {
    console.log(`\n✅ 可用的连接配置:`);
    successfulConfigs.forEach((config, index) => {
      console.log(`\n${index + 1}. ${config.config.type} (${config.config.region || 'default'})`);
      console.log(`   密码编码: ${config.config.passwordEncoding}`);
      console.log(`   连接字符串: ${config.config.url.substring(0, 60)}...`);
    });
    
    return successfulConfigs[0].config.url;
  }
  
  // 分析失败原因
  console.log(`\n❌ 所有连接都失败了。错误分析:`);
  const errorGroups = {};
  results.filter(r => !r.success).forEach(r => {
    const key = r.error;
    if (!errorGroups[key]) {
      errorGroups[key] = [];
    }
    errorGroups[key].push(r);
  });
  
  Object.entries(errorGroups).forEach(([error, configs]) => {
    console.log(`\n"${error}": ${configs.length} 次`);
    if (configs.length <= 3) {
      configs.forEach(c => {
        console.log(`   - ${c.config.type} (${c.config.region || 'default'})`);
      });
    }
  });
  
  return null;
}

/**
 * 修复 .env 文件
 */
function updateEnvFile(newUrl) {
  const envPath = path.join(process.cwd(), '.env');
  
  try {
    let content = '';
    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, 'utf8');
    }
    
    // 更新或添加 DATABASE_URL
    const lines = content.split('\n');
    let updated = false;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('DATABASE_URL=') || lines[i].startsWith('SUPABASE_DATABASE_URL=')) {
        lines[i] = `DATABASE_URL=${newUrl}`;
        updated = true;
        break;
      }
    }
    
    if (!updated) {
      lines.push(`DATABASE_URL=${newUrl}`);
    }
    
    fs.writeFileSync(envPath, lines.join('\n'));
    console.log(`\n✅ 已更新 .env 文件`);
    
  } catch (error) {
    console.error(`\n❌ 无法更新 .env 文件: ${error.message}`);
  }
}

/**
 * 主诊断函数
 */
async function diagnose() {
  // 1. 检查环境变量
  console.log("1️⃣  检查环境变量...");
  const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;
  
  if (!databaseUrl) {
    console.error("❌ 未找到 DATABASE_URL 或 SUPABASE_DATABASE_URL");
    console.log("\n解决方案:");
    console.log("1. 创建 .env 文件");
    console.log("2. 添加: DATABASE_URL=你的Supabase连接字符串");
    return;
  }
  
  console.log("✅ 找到数据库URL");
  
  // 2. 检测项目信息
  console.log("\n2️⃣  检测 Supabase 项目信息...");
  const projectInfo = detectSupabaseProject(databaseUrl);
  
  if (projectInfo.projectRef) {
    console.log(`✅ 项目引用: ${projectInfo.projectRef}`);
  }
  if (projectInfo.region) {
    console.log(`✅ 区域: ${projectInfo.region}`);
  }
  if (projectInfo.connectionType) {
    console.log(`✅ 连接类型: ${projectInfo.connectionType}`);
  }
  
  // 3. 测试当前连接
  console.log("\n3️⃣  测试当前连接...");
  const currentTest = await testSingleConnection({ url: databaseUrl, type: 'current' });
  
  if (currentTest.success) {
    console.log("\n🎉 当前连接正常工作!");
    return;
  }
  
  // 4. 分析错误
  console.log("\n4️⃣  分析错误原因...");
  if (currentTest.error.includes('Tenant or user not found')) {
    console.log("❌ 错误: Tenant or user not found");
    console.log("\n可能的原因:");
    console.log("1. 用户名格式不正确（必须是 postgres.xxxxx）");
    console.log("2. 使用了错误的连接类型");
    console.log("3. 项目可能已被删除或暂停");
  }
  
  // 5. 尝试自动修复
  if (testAll || shouldFix) {
    console.log("\n5️⃣  尝试自动修复...");
    const variants = generateConnectionVariants(databaseUrl);
    
    if (variants.length > 0) {
      const workingUrl = await testMultipleConnections(variants);
      
      if (workingUrl && shouldFix) {
        console.log("\n🔧 应用修复...");
        updateEnvFile(workingUrl);
        console.log("\n✅ 修复完成! 请重启应用以使用新的连接字符串。");
      } else if (workingUrl) {
        console.log("\n💡 找到可用的连接! 使用 --fix 参数来自动更新 .env 文件。");
      }
    }
  }
  
  // 6. 额外建议
  console.log("\n6️⃣  故障排除建议:");
  console.log("\n如果问题仍然存在，请尝试:");
  console.log("1. 登录 Supabase Dashboard 确认项目状态");
  console.log("2. 重置数据库密码（使用简单密码，避免特殊字符）");
  console.log("3. 从 Dashboard 复制最新的 Session Pooler 连接字符串");
  console.log("4. 确保项目未超出免费层限制");
  console.log("5. 考虑创建新的 Supabase 项目");
  console.log("\n其他选项:");
  console.log("- 使用 Railway PostgreSQL 插件");
  console.log("- 使用 Neon.tech (另一个 PostgreSQL 服务)");
  console.log("- 使用本地 PostgreSQL 进行开发");
}

// 运行诊断
diagnose().catch(console.error);