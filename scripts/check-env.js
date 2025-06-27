#!/usr/bin/env node

console.log('=== 环境配置检查 ===\n');

// 检查必需的环境变量
const requiredEnvVars = [
  'OPENAI_API_KEY',
  'DATABASE_URL',
  'JWT_SECRET',
  'SESSION_SECRET'
];

const optionalEnvVars = [
  'SUPABASE_DATABASE_URL',
  'PORT',
  'NODE_ENV'
];

console.log('必需的环境变量:');
let missingRequired = false;
requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`❌ ${varName}: 未设置`);
    missingRequired = true;
  } else {
    // 隐藏敏感信息，只显示前几个字符
    const displayValue = value.substring(0, 10) + '...' + (value.length > 10 ? `(${value.length}字符)` : '');
    console.log(`✅ ${varName}: ${displayValue}`);
  }
});

console.log('\n可选的环境变量:');
optionalEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`⚠️  ${varName}: 未设置`);
  } else {
    console.log(`✅ ${varName}: ${value}`);
  }
});

// 检查OpenAI API Key格式
const apiKey = process.env.OPENAI_API_KEY;
if (apiKey) {
  console.log('\n=== OpenAI API Key 检查 ===');
  if (apiKey.startsWith('sk-')) {
    console.log('✅ API Key格式正确（以sk-开头）');
  } else {
    console.log('❌ API Key格式可能不正确（应该以sk-开头）');
  }
  
  if (apiKey.length > 40) {
    console.log('✅ API Key长度正常');
  } else {
    console.log('⚠️  API Key长度较短，请确认是否完整');
  }
}

// 检查运行环境
console.log('\n=== 运行环境 ===');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`运行目录: ${process.cwd()}`);
console.log(`Node版本: ${process.version}`);

// 建议
if (missingRequired) {
  console.log('\n⚠️  警告：缺少必需的环境变量！');
  console.log('\n建议：');
  console.log('1. 如果是本地开发，请检查 .env 文件');
  console.log('2. 如果是生产环境，请在Vercel控制台配置环境变量');
  console.log('3. 配置后需要重启服务器或重新部署');
} else {
  console.log('\n✅ 所有必需的环境变量都已设置！');
}

// 测试数据库连接（如果有DATABASE_URL）
if (process.env.DATABASE_URL) {
  console.log('\n=== 数据库连接检查 ===');
  const dbUrl = process.env.DATABASE_URL;
  try {
    const url = new URL(dbUrl);
    console.log(`✅ 数据库主机: ${url.hostname}`);
    console.log(`✅ 数据库端口: ${url.port || '5432'}`);
    console.log(`✅ 数据库名称: ${url.pathname.slice(1)}`);
  } catch (error) {
    console.log('❌ 数据库URL格式不正确');
  }
}

console.log('\n=== 检查完成 ===');