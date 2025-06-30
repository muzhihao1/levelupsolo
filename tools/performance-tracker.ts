#!/usr/bin/env tsx
/**
 * Performance Tracking Utility
 * 性能追踪工具
 * 
 * 简单的性能监控工具，用于快速检查应用性能
 */

import { performance } from 'perf_hooks';
import fetch from 'node-fetch';
import { promisify } from 'util';
import { exec } from 'child_process';
import postgres from 'postgres';

const execAsync = promisify(exec);

// =====================================================
// Types - 类型定义
// =====================================================

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  threshold?: number;
  status: 'good' | 'warning' | 'critical';
}

interface EndpointMetrics {
  url: string;
  method: string;
  responseTime: number;
  statusCode: number;
  contentLength: number;
  metrics: {
    dns?: number;
    tcp?: number;
    ttfb?: number;
    download?: number;
    total: number;
  };
}

interface DatabaseMetrics {
  activeConnections: number;
  idleConnections: number;
  avgQueryTime: number;
  slowQueries: number;
  cacheHitRate: number;
}

interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
}

// =====================================================
// Performance Tracker Class - 性能追踪类
// =====================================================

class PerformanceTracker {
  private apiBaseUrl: string;
  private dbUrl: string;
  private metrics: PerformanceMetric[] = [];

  constructor(config: { apiUrl?: string; dbUrl?: string } = {}) {
    this.apiBaseUrl = config.apiUrl || process.env.API_URL || 'http://localhost:5000';
    this.dbUrl = config.dbUrl || process.env.DATABASE_URL || '';
  }

  async runFullCheck(): Promise<void> {
    console.log('🚀 Starting Performance Check...\n');

    // Run all checks
    await Promise.all([
      this.checkAPIPerformance(),
      this.checkDatabasePerformance(),
      this.checkSystemResources(),
      this.checkFrontendPerformance(),
    ]);

    // Display results
    this.displayResults();
  }

  // =====================================================
  // API Performance Check
  // =====================================================

  private async checkAPIPerformance(): Promise<void> {
    console.log('📡 Checking API Performance...');

    const endpoints = [
      { method: 'GET', path: '/api/health' },
      { method: 'GET', path: '/api/tasks' },
      { method: 'GET', path: '/api/users/me' },
      { method: 'GET', path: '/api/skills' },
    ];

    for (const endpoint of endpoints) {
      try {
        const metrics = await this.measureEndpoint(endpoint);
        
        this.addMetric({
          name: `API ${endpoint.method} ${endpoint.path}`,
          value: metrics.responseTime,
          unit: 'ms',
          threshold: 500,
          status: this.getStatus(metrics.responseTime, 200, 500)
        });

        if (metrics.statusCode >= 400) {
          console.warn(`  ⚠️  ${endpoint.path} returned ${metrics.statusCode}`);
        }
      } catch (error) {
        console.error(`  ❌ ${endpoint.path} failed: ${error.message}`);
      }
    }
  }

  private async measureEndpoint(endpoint: { method: string; path: string }): Promise<EndpointMetrics> {
    const url = `${this.apiBaseUrl}${endpoint.path}`;
    const startTime = performance.now();

    const response = await fetch(url, {
      method: endpoint.method,
      headers: {
        'User-Agent': 'PerformanceTracker/1.0',
      },
      timeout: 10000,
    });

    const endTime = performance.now();
    const responseTime = endTime - startTime;

    return {
      url,
      method: endpoint.method,
      responseTime,
      statusCode: response.status,
      contentLength: parseInt(response.headers.get('content-length') || '0'),
      metrics: {
        total: responseTime,
      },
    };
  }

  // =====================================================
  // Database Performance Check
  // =====================================================

  private async checkDatabasePerformance(): Promise<void> {
    if (!this.dbUrl) {
      console.log('⏭️  Skipping database check (no DATABASE_URL)');
      return;
    }

    console.log('🗄️  Checking Database Performance...');

    try {
      const sql = postgres(this.dbUrl);
      
      // Test query performance
      const start = performance.now();
      await sql`SELECT 1`;
      const pingTime = performance.now() - start;

      this.addMetric({
        name: 'Database Ping',
        value: pingTime,
        unit: 'ms',
        threshold: 10,
        status: this.getStatus(pingTime, 5, 10)
      });

      // Get database statistics
      const stats = await sql`
        SELECT 
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle') as idle_connections,
          (SELECT avg(mean_exec_time) FROM pg_stat_statements WHERE calls > 10) as avg_query_time
      `;

      const dbStats = stats[0];

      this.addMetric({
        name: 'Active DB Connections',
        value: dbStats.active_connections,
        unit: 'connections',
        threshold: 50,
        status: this.getStatus(dbStats.active_connections, 20, 50)
      });

      this.addMetric({
        name: 'Avg Query Time',
        value: dbStats.avg_query_time || 0,
        unit: 'ms',
        threshold: 100,
        status: this.getStatus(dbStats.avg_query_time || 0, 50, 100)
      });

      await sql.end();
    } catch (error) {
      console.error('  ❌ Database check failed:', error.message);
    }
  }

  // =====================================================
  // System Resources Check
  // =====================================================

  private async checkSystemResources(): Promise<void> {
    console.log('💻 Checking System Resources...');

    try {
      // CPU Usage
      const cpuUsage = await this.getCPUUsage();
      this.addMetric({
        name: 'CPU Usage',
        value: cpuUsage,
        unit: '%',
        threshold: 80,
        status: this.getStatus(cpuUsage, 50, 80)
      });

      // Memory Usage
      const memUsage = await this.getMemoryUsage();
      this.addMetric({
        name: 'Memory Usage',
        value: memUsage,
        unit: '%',
        threshold: 80,
        status: this.getStatus(memUsage, 60, 80)
      });

      // Disk Usage
      const diskUsage = await this.getDiskUsage();
      this.addMetric({
        name: 'Disk Usage',
        value: diskUsage,
        unit: '%',
        threshold: 85,
        status: this.getStatus(diskUsage, 70, 85)
      });

    } catch (error) {
      console.error('  ❌ System check failed:', error.message);
    }
  }

  private async getCPUUsage(): Promise<number> {
    const { stdout } = await execAsync('ps aux | awk \'{s+=$3} END {print s}\'');
    return parseFloat(stdout.trim());
  }

  private async getMemoryUsage(): Promise<number> {
    const { stdout } = await execAsync('ps aux | awk \'{s+=$4} END {print s}\'');
    return parseFloat(stdout.trim());
  }

  private async getDiskUsage(): Promise<number> {
    const { stdout } = await execAsync('df -h / | awk \'NR==2 {print $5}\' | sed \'s/%//\'');
    return parseFloat(stdout.trim());
  }

  // =====================================================
  // Frontend Performance Check
  // =====================================================

  private async checkFrontendPerformance(): Promise<void> {
    console.log('🌐 Checking Frontend Performance...');

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    try {
      // Measure page load time
      const start = performance.now();
      const response = await fetch(frontendUrl);
      const loadTime = performance.now() - start;

      this.addMetric({
        name: 'Frontend Load Time',
        value: loadTime,
        unit: 'ms',
        threshold: 3000,
        status: this.getStatus(loadTime, 1000, 3000)
      });

      // Check bundle size
      const contentLength = parseInt(response.headers.get('content-length') || '0');
      const bundleSize = contentLength / 1024; // KB

      this.addMetric({
        name: 'Initial Bundle Size',
        value: bundleSize,
        unit: 'KB',
        threshold: 500,
        status: this.getStatus(bundleSize, 200, 500)
      });

    } catch (error) {
      console.error('  ❌ Frontend check failed:', error.message);
    }
  }

  // =====================================================
  // Utility Methods
  // =====================================================

  private addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
  }

  private getStatus(value: number, warningThreshold: number, criticalThreshold: number): 'good' | 'warning' | 'critical' {
    if (value >= criticalThreshold) return 'critical';
    if (value >= warningThreshold) return 'warning';
    return 'good';
  }

  private displayResults(): void {
    console.log('\n📊 Performance Report');
    console.log('=' .repeat(60));

    // Group metrics by status
    const critical = this.metrics.filter(m => m.status === 'critical');
    const warning = this.metrics.filter(m => m.status === 'warning');
    const good = this.metrics.filter(m => m.status === 'good');

    // Display summary
    console.log(`\n📈 Summary:`);
    console.log(`  ✅ Good: ${good.length}`);
    console.log(`  ⚠️  Warning: ${warning.length}`);
    console.log(`  ❌ Critical: ${critical.length}`);

    // Display detailed metrics
    console.log('\n📋 Detailed Metrics:');
    console.log('-' .repeat(60));

    for (const metric of this.metrics) {
      const icon = metric.status === 'good' ? '✅' : metric.status === 'warning' ? '⚠️ ' : '❌';
      const value = metric.value.toFixed(2);
      const threshold = metric.threshold ? ` (threshold: ${metric.threshold}${metric.unit})` : '';
      
      console.log(`${icon} ${metric.name}: ${value}${metric.unit}${threshold}`);
    }

    // Recommendations
    if (critical.length > 0 || warning.length > 0) {
      console.log('\n💡 Recommendations:');
      
      for (const metric of [...critical, ...warning]) {
        console.log(`  - ${this.getRecommendation(metric)}`);
      }
    }

    console.log('\n');
  }

  private getRecommendation(metric: PerformanceMetric): string {
    const name = metric.name.toLowerCase();
    
    if (name.includes('api')) {
      return `Optimize ${metric.name} - Consider caching, query optimization, or scaling`;
    }
    if (name.includes('database')) {
      return `Review database performance - Check slow queries and indexes`;
    }
    if (name.includes('cpu')) {
      return `High CPU usage - Profile application for performance bottlenecks`;
    }
    if (name.includes('memory')) {
      return `High memory usage - Check for memory leaks or increase resources`;
    }
    if (name.includes('disk')) {
      return `High disk usage - Clean up old files or increase storage`;
    }
    if (name.includes('frontend')) {
      return `Optimize frontend - Reduce bundle size, lazy load, or use CDN`;
    }
    
    return `Review and optimize ${metric.name}`;
  }
}

// =====================================================
// CLI Interface
// =====================================================

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Performance Tracker - Monitor application performance

Usage: performance-tracker [options]

Options:
  --api-url <url>    API base URL (default: http://localhost:5000)
  --db-url <url>     Database URL (default: from DATABASE_URL env)
  --json            Output results as JSON
  --watch           Run continuously (every 30 seconds)
  -h, --help        Show this help message

Examples:
  # Basic check
  performance-tracker

  # Check specific API
  performance-tracker --api-url https://api.levelupsolo.net

  # Continuous monitoring
  performance-tracker --watch

  # JSON output for CI/CD
  performance-tracker --json
`);
    process.exit(0);
  }

  const config: any = {};
  
  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--api-url' && args[i + 1]) {
      config.apiUrl = args[++i];
    }
    if (args[i] === '--db-url' && args[i + 1]) {
      config.dbUrl = args[++i];
    }
  }

  const tracker = new PerformanceTracker(config);

  if (args.includes('--watch')) {
    // Continuous monitoring mode
    console.log('🔄 Starting continuous monitoring (Ctrl+C to stop)...\n');
    
    const run = async () => {
      console.clear();
      await tracker.runFullCheck();
    };

    await run();
    setInterval(run, 30000); // Every 30 seconds
  } else {
    // Single run
    await tracker.runFullCheck();
    
    if (args.includes('--json')) {
      // Output JSON for programmatic use
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        metrics: tracker['metrics'], // Access private property for JSON output
        summary: {
          total: tracker['metrics'].length,
          good: tracker['metrics'].filter(m => m.status === 'good').length,
          warning: tracker['metrics'].filter(m => m.status === 'warning').length,
          critical: tracker['metrics'].filter(m => m.status === 'critical').length,
        }
      }, null, 2));
    }
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { PerformanceTracker, type PerformanceMetric };