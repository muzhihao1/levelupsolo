#!/usr/bin/env tsx

/**
 * 路由健康检查脚本
 * 防止AI路由未挂载和认证失败问题
 * 在构建和部署前自动运行
 */

import { spawn } from 'child_process';
import fetch from 'node-fetch';

interface RouteCheck {
  path: string;
  method: 'GET' | 'POST';
  expectedStatus: number[];
  requiresAuth: boolean;
  description: string;
}

// 关键路由检查清单
const CRITICAL_ROUTES: RouteCheck[] = [
  {
    path: '/api/health',
    method: 'GET',
    expectedStatus: [200],
    requiresAuth: false,
    description: '健康检查端点'
  },
  {
    path: '/api/ai/parse-input',
    method: 'POST',
    expectedStatus: [401, 400], // 401 if no auth, 400 if no body
    requiresAuth: true,
    description: 'AI解析端点 - 必须挂载且需要认证'
  },
  {
    path: '/api/ai/chat',
    method: 'POST',
    expectedStatus: [401, 400],
    requiresAuth: true,
    description: 'AI聊天端点'
  },
  {
    path: '/api/crud?resource=tasks',
    method: 'POST',
    expectedStatus: [401, 400],
    requiresAuth: true,
    description: '任务CRUD端点'
  },
  {
    path: '/api/data?type=tasks',
    method: 'GET',
    expectedStatus: [401],
    requiresAuth: true,
    description: '数据获取端点'
  }
];

/**
 * 启动临时服务器进行测试
 */
async function startTestServer(): Promise<{ kill: () => void }> {
  return new Promise((resolve, reject) => {
    const serverProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'test' }
    });

    let serverReady = false;
    
    serverProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Server is running') && !serverReady) {
        serverReady = true;
        resolve({ kill: () => serverProcess.kill() });
      }
    });

    serverProcess.on('error', reject);
    
    // 超时保护
    setTimeout(() => {
      if (!serverReady) {
        serverProcess.kill();
        reject(new Error('Server startup timeout'));
      }
    }, 30000);
  });
}

/**
 * 检查单个路由
 */
async function checkRoute(route: RouteCheck, baseUrl: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const url = `${baseUrl}${route.path}`;
    const options: any = {
      method: route.method,
      headers: { 'Content-Type': 'application/json' }
    };

    if (route.method === 'POST') {
      options.body = JSON.stringify({ test: 'data' });
    }

    const response = await fetch(url, options);
    
    if (route.expectedStatus.includes(response.status)) {
      return { success: true };
    } else {
      return { 
        success: false, 
        error: `Expected status ${route.expectedStatus.join(' or ')}, got ${response.status}`
      };
    }
  } catch (error) {
    return { 
      success: false, 
      error: `Request failed: ${error.message}`
    };
  }
}

/**
 * 检查路由是否在代码中正确挂载
 */
async function checkRouteMounting(): Promise<{ success: boolean; issues: string[] }> {
  const fs = await import('fs/promises');
  const issues: string[] = [];
  
  try {
    // 检查routes.ts中的AI路由挂载
    const routesContent = await fs.readFile('server/routes.ts', 'utf-8');
    
    if (!routesContent.includes("app.use('/api/ai'")) {
      issues.push('❌ AI路由未在routes.ts中挂载');
    }
    
    if (!routesContent.includes('isAuthenticated')) {
      issues.push('❌ 认证中间件未正确导入');
    }
    
    // 检查AI路由文件是否存在
    try {
      await fs.access('server/ai.ts');
    } catch {
      issues.push('❌ AI路由文件 server/ai.ts 不存在');
    }
    
    // 检查重复路由定义
    const aiRouteMatches = routesContent.match(/app\.(get|post|put|delete)\s*\(\s*['"]\/api\/ai/g);
    if (aiRouteMatches && aiRouteMatches.length > 0) {
      issues.push('⚠️  发现重复的AI路由定义，可能导致冲突');
    }
    
    return { success: issues.length === 0, issues };
  } catch (error) {
    issues.push(`❌ 代码分析失败: ${error.message}`);
    return { success: false, issues };
  }
}

/**
 * 主检查函数
 */
async function runHealthCheck(): Promise<void> {
  console.log('🔍 开始路由健康检查...\n');
  
  // 1. 静态代码检查
  console.log('📁 检查路由挂载状态...');
  const mountCheck = await checkRouteMounting();
  
  if (!mountCheck.success) {
    console.log('❌ 路由挂载检查失败:');
    mountCheck.issues.forEach(issue => console.log(`   ${issue}`));
    process.exit(1);
  } else {
    console.log('✅ 路由挂载检查通过');
  }
  
  // 2. 运行时检查
  console.log('\n🚀 启动测试服务器...');
  let server: { kill: () => void } | null = null;
  
  try {
    server = await startTestServer();
    console.log('✅ 测试服务器启动成功');
    
    // 等待服务器完全启动
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n🔗 检查关键路由...');
    const baseUrl = 'http://localhost:3000';
    let allPassed = true;
    
    for (const route of CRITICAL_ROUTES) {
      const result = await checkRoute(route, baseUrl);
      
      if (result.success) {
        console.log(`✅ ${route.description}: ${route.method} ${route.path}`);
      } else {
        console.log(`❌ ${route.description}: ${route.method} ${route.path}`);
        console.log(`   错误: ${result.error}`);
        allPassed = false;
      }
    }
    
    if (allPassed) {
      console.log('\n🎉 所有路由检查通过！');
      process.exit(0);
    } else {
      console.log('\n💥 部分路由检查失败，请修复后重试');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ 健康检查失败:', error.message);
    process.exit(1);
  } finally {
    if (server) {
      server.kill();
      console.log('🛑 测试服务器已关闭');
    }
  }
}

// 运行检查
if (require.main === module) {
  runHealthCheck().catch(console.error);
}

export { runHealthCheck, checkRouteMounting, CRITICAL_ROUTES };