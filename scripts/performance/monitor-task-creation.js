#!/usr/bin/env node

/**
 * 任务创建性能监控脚本
 * 帮助诊断任务创建慢的具体原因
 */

const https = require('https');
const { performance } = require('perf_hooks');

// 配置
const API_BASE_URL = process.env.API_URL || 'https://www.levelupsolo.net';
const AUTH_TOKEN = process.env.AUTH_TOKEN; // 需要有效的认证 token

// 测试数据
const testTask = {
  description: "测试任务 - 性能监控"
};

// 计时函数
function measureTime(label, fn) {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  console.log(`⏱️  ${label}: ${duration.toFixed(2)}ms`);
  return result;
}

// 发送 HTTP 请求
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve(body);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// 测试任务创建性能
async function testTaskCreation() {
  console.log('🔍 Level Up Solo 任务创建性能监控');
  console.log('=====================================\n');
  
  if (!AUTH_TOKEN) {
    console.log('❌ 错误: 需要设置 AUTH_TOKEN 环境变量');
    console.log('请先登录网站，从浏览器开发者工具获取认证 token');
    return;
  }
  
  const url = new URL(`${API_BASE_URL}/api/tasks/intelligent-create`);
  
  const options = {
    hostname: url.hostname,
    port: url.port || 443,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Cookie': `auth_token=${AUTH_TOKEN}` // 可能需要 cookie
    }
  };
  
  console.log('📍 测试端点:', url.href);
  console.log('');
  
  try {
    // 总计时
    const totalStart = performance.now();
    
    // DNS 解析时间（粗略估计）
    const dnsStart = performance.now();
    await measureTime('DNS 解析', () => {
      return new Promise(resolve => {
        require('dns').resolve4(url.hostname, resolve);
      });
    });
    
    // 建立连接和发送请求
    console.log('\n📤 发送任务创建请求...');
    
    const requestStart = performance.now();
    const response = await makeRequest(options, testTask);
    const requestDuration = performance.now() - requestStart;
    
    console.log(`✅ 请求完成: ${requestDuration.toFixed(2)}ms`);
    
    // 分析响应
    if (response.task) {
      console.log('\n📊 任务创建成功:');
      console.log(`  - 任务 ID: ${response.task.id}`);
      console.log(`  - 任务标题: ${response.task.title}`);
      console.log(`  - 任务类型: ${response.task.taskCategory}`);
      console.log(`  - 技能分配: ${response.task.skillId ? '是' : '否'}`);
    }
    
    // 总时间
    const totalDuration = performance.now() - totalStart;
    
    console.log('\n📈 性能分析:');
    console.log(`  - 总耗时: ${totalDuration.toFixed(2)}ms`);
    console.log(`  - 网络请求: ${requestDuration.toFixed(2)}ms`);
    console.log(`  - 服务器处理: ~${(requestDuration - 100).toFixed(2)}ms (估计)`);
    
    // 诊断
    console.log('\n🔧 诊断结果:');
    if (totalDuration > 3000) {
      console.log('  ❌ 任务创建时间过长 (>3秒)');
      console.log('  可能原因:');
      console.log('    1. AI API 响应慢');
      console.log('    2. 数据库查询效率低');
      console.log('    3. 服务器负载高');
    } else if (totalDuration > 1000) {
      console.log('  ⚠️  任务创建时间较长 (1-3秒)');
      console.log('  建议优化 AI 处理流程');
    } else {
      console.log('  ✅ 任务创建速度正常 (<1秒)');
    }
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.log('\n可能的问题:');
    console.log('  1. 认证 token 无效或过期');
    console.log('  2. 网络连接问题');
    console.log('  3. 服务器不可用');
  }
  
  console.log('\n=====================================');
  console.log('建议: 使用快速创建模式可将时间降至 <100ms');
}

// 运行测试
testTaskCreation();