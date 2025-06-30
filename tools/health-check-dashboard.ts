#!/usr/bin/env tsx
/**
 * Project Health Check Dashboard
 * 项目健康状态检查仪表板
 * 
 * 实时监控项目各个组件的健康状态
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// =====================================================
// Types - 类型定义
// =====================================================

interface HealthCheckResult {
  name: string;
  category: string;
  status: 'healthy' | 'warning' | 'error' | 'checking';
  message: string;
  details?: any;
  timestamp: Date;
}

interface ProjectHealth {
  overall: 'healthy' | 'warning' | 'error';
  checks: HealthCheckResult[];
  lastUpdated: Date;
  summary: {
    total: number;
    healthy: number;
    warning: number;
    error: number;
  };
}

// =====================================================
// Health Checks - 健康检查
// =====================================================

class HealthChecker {
  private checks: HealthCheckResult[] = [];

  async runAllChecks(): Promise<ProjectHealth> {
    console.log('🔍 Running health checks...\n');
    this.checks = [];

    // Run all checks in parallel for efficiency
    await Promise.all([
      this.checkEnvironment(),
      this.checkDatabase(),
      this.checkDependencies(),
      this.checkTypeScript(),
      this.checkTests(),
      this.checkBuildStatus(),
      this.checkSecurity(),
      this.checkGitStatus(),
      this.checkDiskSpace(),
      this.checkAPIEndpoints(),
    ]);

    return this.generateReport();
  }

  private addCheck(result: Omit<HealthCheckResult, 'timestamp'>) {
    this.checks.push({
      ...result,
      timestamp: new Date()
    });
  }

  // Check 1: Environment Variables
  private async checkEnvironment() {
    try {
      const envPath = path.join(process.cwd(), '.env');
      const envExists = await fs.access(envPath).then(() => true).catch(() => false);
      
      const requiredVars = [
        'DATABASE_URL',
        'SESSION_SECRET',
        'JWT_SECRET',
        'OPENAI_API_KEY'
      ];

      const missing = requiredVars.filter(v => !process.env[v]);

      if (missing.length === 0) {
        this.addCheck({
          name: 'Environment Variables',
          category: 'Configuration',
          status: 'healthy',
          message: 'All required environment variables are set',
          details: { envFileExists: envExists }
        });
      } else {
        this.addCheck({
          name: 'Environment Variables',
          category: 'Configuration',
          status: 'error',
          message: `Missing ${missing.length} required variables`,
          details: { missing }
        });
      }
    } catch (error) {
      this.addCheck({
        name: 'Environment Variables',
        category: 'Configuration',
        status: 'error',
        message: 'Failed to check environment variables',
        details: { error: error.message }
      });
    }
  }

  // Check 2: Database Connection
  private async checkDatabase() {
    try {
      if (!process.env.DATABASE_URL) {
        this.addCheck({
          name: 'Database Connection',
          category: 'Infrastructure',
          status: 'error',
          message: 'DATABASE_URL not configured'
        });
        return;
      }

      // Try to connect using pg
      const { default: postgres } = await import('postgres');
      const sql = postgres(process.env.DATABASE_URL);
      
      const result = await sql`SELECT NOW() as time, current_database() as db`;
      await sql.end();

      this.addCheck({
        name: 'Database Connection',
        category: 'Infrastructure',
        status: 'healthy',
        message: `Connected to ${result[0].db}`,
        details: { 
          database: result[0].db,
          serverTime: result[0].time 
        }
      });
    } catch (error) {
      this.addCheck({
        name: 'Database Connection',
        category: 'Infrastructure',
        status: 'error',
        message: 'Cannot connect to database',
        details: { error: error.message }
      });
    }
  }

  // Check 3: Dependencies
  private async checkDependencies() {
    try {
      const { stdout } = await execAsync('npm outdated --json || true');
      const outdated = stdout ? JSON.parse(stdout) : {};
      const outdatedCount = Object.keys(outdated).length;

      if (outdatedCount === 0) {
        this.addCheck({
          name: 'Dependencies',
          category: 'Code Quality',
          status: 'healthy',
          message: 'All dependencies are up to date'
        });
      } else {
        const majorUpdates = Object.entries(outdated).filter(([_, info]: [string, any]) => {
          const current = info.current?.split('.')[0];
          const latest = info.latest?.split('.')[0];
          return current && latest && current !== latest;
        });

        this.addCheck({
          name: 'Dependencies',
          category: 'Code Quality',
          status: majorUpdates.length > 0 ? 'warning' : 'healthy',
          message: `${outdatedCount} packages can be updated`,
          details: { 
            outdatedCount,
            majorUpdates: majorUpdates.length,
            packages: Object.keys(outdated).slice(0, 5)
          }
        });
      }
    } catch (error) {
      this.addCheck({
        name: 'Dependencies',
        category: 'Code Quality',
        status: 'warning',
        message: 'Could not check dependencies',
        details: { error: error.message }
      });
    }
  }

  // Check 4: TypeScript
  private async checkTypeScript() {
    try {
      const { stdout, stderr } = await execAsync('npm run check', { 
        cwd: process.cwd() 
      });

      if (stderr && stderr.includes('error')) {
        const errorCount = (stderr.match(/error TS/g) || []).length;
        this.addCheck({
          name: 'TypeScript',
          category: 'Code Quality',
          status: 'error',
          message: `Found ${errorCount} TypeScript errors`,
          details: { errorCount }
        });
      } else {
        this.addCheck({
          name: 'TypeScript',
          category: 'Code Quality',
          status: 'healthy',
          message: 'No TypeScript errors found'
        });
      }
    } catch (error) {
      this.addCheck({
        name: 'TypeScript',
        category: 'Code Quality',
        status: 'error',
        message: 'TypeScript check failed',
        details: { error: error.message }
      });
    }
  }

  // Check 5: Tests
  private async checkTests() {
    try {
      const { stdout } = await execAsync('npm run test:run -- --reporter=json', {
        cwd: process.cwd(),
        timeout: 30000
      });

      const results = JSON.parse(stdout);
      const { numTotalTests, numPassedTests, numFailedTests } = results;

      if (numFailedTests === 0) {
        this.addCheck({
          name: 'Tests',
          category: 'Code Quality',
          status: 'healthy',
          message: `All ${numTotalTests} tests passing`,
          details: { 
            total: numTotalTests,
            passed: numPassedTests,
            failed: numFailedTests
          }
        });
      } else {
        this.addCheck({
          name: 'Tests',
          category: 'Code Quality',
          status: 'error',
          message: `${numFailedTests} of ${numTotalTests} tests failing`,
          details: { 
            total: numTotalTests,
            passed: numPassedTests,
            failed: numFailedTests
          }
        });
      }
    } catch (error) {
      this.addCheck({
        name: 'Tests',
        category: 'Code Quality',
        status: 'warning',
        message: 'Could not run tests',
        details: { error: error.message }
      });
    }
  }

  // Check 6: Build Status
  private async checkBuildStatus() {
    try {
      const distPath = path.join(process.cwd(), 'dist');
      const distExists = await fs.access(distPath).then(() => true).catch(() => false);

      if (!distExists) {
        this.addCheck({
          name: 'Build Status',
          category: 'Deployment',
          status: 'warning',
          message: 'No production build found',
          details: { suggestion: 'Run npm run build' }
        });
        return;
      }

      const stats = await fs.stat(distPath);
      const hoursSinceLastBuild = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastBuild < 24) {
        this.addCheck({
          name: 'Build Status',
          category: 'Deployment',
          status: 'healthy',
          message: 'Production build is recent',
          details: { 
            lastBuild: stats.mtime,
            hoursAgo: Math.round(hoursSinceLastBuild)
          }
        });
      } else {
        this.addCheck({
          name: 'Build Status',
          category: 'Deployment',
          status: 'warning',
          message: `Build is ${Math.round(hoursSinceLastBuild)} hours old`,
          details: { 
            lastBuild: stats.mtime,
            hoursAgo: Math.round(hoursSinceLastBuild)
          }
        });
      }
    } catch (error) {
      this.addCheck({
        name: 'Build Status',
        category: 'Deployment',
        status: 'error',
        message: 'Failed to check build status',
        details: { error: error.message }
      });
    }
  }

  // Check 7: Security
  private async checkSecurity() {
    try {
      const { stdout } = await execAsync('npm audit --json', {
        cwd: process.cwd()
      });

      const audit = JSON.parse(stdout);
      const { vulnerabilities } = audit.metadata;

      if (vulnerabilities.total === 0) {
        this.addCheck({
          name: 'Security',
          category: 'Security',
          status: 'healthy',
          message: 'No known vulnerabilities'
        });
      } else {
        const status = vulnerabilities.high > 0 || vulnerabilities.critical > 0 
          ? 'error' 
          : 'warning';

        this.addCheck({
          name: 'Security',
          category: 'Security',
          status,
          message: `Found ${vulnerabilities.total} vulnerabilities`,
          details: {
            critical: vulnerabilities.critical,
            high: vulnerabilities.high,
            moderate: vulnerabilities.moderate,
            low: vulnerabilities.low
          }
        });
      }
    } catch (error) {
      this.addCheck({
        name: 'Security',
        category: 'Security',
        status: 'warning',
        message: 'Could not run security audit',
        details: { error: error.message }
      });
    }
  }

  // Check 8: Git Status
  private async checkGitStatus() {
    try {
      const { stdout: statusOut } = await execAsync('git status --porcelain');
      const { stdout: branchOut } = await execAsync('git branch --show-current');
      
      const uncommittedFiles = statusOut.split('\n').filter(line => line.trim()).length;
      const currentBranch = branchOut.trim();

      if (uncommittedFiles === 0) {
        this.addCheck({
          name: 'Git Status',
          category: 'Version Control',
          status: 'healthy',
          message: 'Working directory clean',
          details: { branch: currentBranch }
        });
      } else {
        this.addCheck({
          name: 'Git Status',
          category: 'Version Control',
          status: 'warning',
          message: `${uncommittedFiles} uncommitted changes`,
          details: { 
            branch: currentBranch,
            uncommittedFiles 
          }
        });
      }
    } catch (error) {
      this.addCheck({
        name: 'Git Status',
        category: 'Version Control',
        status: 'warning',
        message: 'Could not check git status',
        details: { error: error.message }
      });
    }
  }

  // Check 9: Disk Space
  private async checkDiskSpace() {
    try {
      const { stdout } = await execAsync('df -h .');
      const lines = stdout.split('\n');
      const dataLine = lines[1];
      const parts = dataLine.split(/\s+/);
      const usePercent = parseInt(parts[4]);

      if (usePercent < 80) {
        this.addCheck({
          name: 'Disk Space',
          category: 'Infrastructure',
          status: 'healthy',
          message: `${100 - usePercent}% disk space available`,
          details: { 
            used: parts[2],
            available: parts[3],
            usePercent: `${usePercent}%`
          }
        });
      } else {
        this.addCheck({
          name: 'Disk Space',
          category: 'Infrastructure',
          status: usePercent > 90 ? 'error' : 'warning',
          message: `Only ${100 - usePercent}% disk space left`,
          details: { 
            used: parts[2],
            available: parts[3],
            usePercent: `${usePercent}%`
          }
        });
      }
    } catch (error) {
      this.addCheck({
        name: 'Disk Space',
        category: 'Infrastructure',
        status: 'warning',
        message: 'Could not check disk space',
        details: { error: error.message }
      });
    }
  }

  // Check 10: API Endpoints
  private async checkAPIEndpoints() {
    try {
      // Check if server is running on expected port
      const serverUrl = process.env.NODE_ENV === 'production' 
        ? 'https://www.levelupsolo.net'
        : 'http://localhost:5000';

      const response = await fetch(`${serverUrl}/api/health`).catch(() => null);

      if (response && response.ok) {
        this.addCheck({
          name: 'API Server',
          category: 'Infrastructure',
          status: 'healthy',
          message: 'API server is responding',
          details: { url: serverUrl }
        });
      } else {
        this.addCheck({
          name: 'API Server',
          category: 'Infrastructure',
          status: 'warning',
          message: 'API server not reachable',
          details: { 
            url: serverUrl,
            suggestion: 'Make sure server is running' 
          }
        });
      }
    } catch (error) {
      this.addCheck({
        name: 'API Server',
        category: 'Infrastructure',
        status: 'error',
        message: 'Failed to check API status',
        details: { error: error.message }
      });
    }
  }

  // Generate overall health report
  private generateReport(): ProjectHealth {
    const summary = {
      total: this.checks.length,
      healthy: this.checks.filter(c => c.status === 'healthy').length,
      warning: this.checks.filter(c => c.status === 'warning').length,
      error: this.checks.filter(c => c.status === 'error').length
    };

    let overall: 'healthy' | 'warning' | 'error' = 'healthy';
    if (summary.error > 0) overall = 'error';
    else if (summary.warning > 0) overall = 'warning';

    return {
      overall,
      checks: this.checks,
      lastUpdated: new Date(),
      summary
    };
  }
}

// =====================================================
// Dashboard Server - 仪表板服务器
// =====================================================

async function startDashboard() {
  const port = process.env.HEALTH_PORT || 3001;
  const checker = new HealthChecker();
  let latestHealth: ProjectHealth | null = null;

  // Create HTTP server
  const server = createServer(async (req, res) => {
    if (req.url === '/') {
      // Serve dashboard HTML
      const html = generateDashboardHTML();
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } else if (req.url === '/api/health') {
      // Return health data as JSON
      if (!latestHealth) {
        latestHealth = await checker.runAllChecks();
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(latestHealth));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  // Create WebSocket server for real-time updates
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log('📱 Dashboard client connected');
    
    // Send initial health data
    if (latestHealth) {
      ws.send(JSON.stringify(latestHealth));
    }

    ws.on('message', async (message) => {
      if (message.toString() === 'refresh') {
        latestHealth = await checker.runAllChecks();
        // Broadcast to all connected clients
        wss.clients.forEach(client => {
          if (client.readyState === 1) {
            client.send(JSON.stringify(latestHealth));
          }
        });
      }
    });

    ws.on('close', () => {
      console.log('📱 Dashboard client disconnected');
    });
  });

  // Run initial check
  latestHealth = await checker.runAllChecks();

  // Auto-refresh every 30 seconds
  setInterval(async () => {
    latestHealth = await checker.runAllChecks();
    wss.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify(latestHealth));
      }
    });
  }, 30000);

  server.listen(port, () => {
    console.log(`\n🚀 Health Check Dashboard running at:`);
    console.log(`   http://localhost:${port}`);
    console.log(`\n📊 Features:`);
    console.log(`   - Real-time health monitoring`);
    console.log(`   - WebSocket live updates`);
    console.log(`   - 10 comprehensive health checks`);
    console.log(`   - Auto-refresh every 30 seconds`);
    console.log(`\n🛑 Press Ctrl+C to stop the dashboard\n`);
  });
}

// =====================================================
// Dashboard HTML - 仪表板 HTML
// =====================================================

function generateDashboardHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Level Up Solo - Health Dashboard</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #e0e0e0;
      padding: 20px;
      line-height: 1.6;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 1px solid #333;
    }

    h1 {
      font-size: 2rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .status-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }

    .status-dot.healthy { background: #10b981; }
    .status-dot.warning { background: #f59e0b; }
    .status-dot.error { background: #ef4444; }

    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .summary-card {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
    }

    .summary-card h3 {
      font-size: 2rem;
      margin-bottom: 5px;
    }

    .summary-card.healthy h3 { color: #10b981; }
    .summary-card.warning h3 { color: #f59e0b; }
    .summary-card.error h3 { color: #ef4444; }

    .checks-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }

    .check-card {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 20px;
      transition: all 0.3s ease;
    }

    .check-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }

    .check-card.healthy { border-left: 4px solid #10b981; }
    .check-card.warning { border-left: 4px solid #f59e0b; }
    .check-card.error { border-left: 4px solid #ef4444; }

    .check-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .check-name {
      font-weight: 600;
      font-size: 1.1rem;
    }

    .check-status {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.8rem;
      text-transform: uppercase;
      font-weight: 600;
    }

    .check-status.healthy { 
      background: #10b98120; 
      color: #10b981;
    }
    .check-status.warning { 
      background: #f59e0b20; 
      color: #f59e0b;
    }
    .check-status.error { 
      background: #ef444420; 
      color: #ef4444;
    }

    .check-category {
      font-size: 0.85rem;
      color: #888;
      margin-bottom: 8px;
    }

    .check-message {
      color: #ccc;
      margin-bottom: 10px;
    }

    .check-details {
      font-size: 0.85rem;
      color: #888;
      background: #0a0a0a;
      padding: 10px;
      border-radius: 4px;
      font-family: monospace;
    }

    .refresh-button {
      background: #667eea;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1rem;
      transition: background 0.3s ease;
    }

    .refresh-button:hover {
      background: #764ba2;
    }

    .refresh-button:disabled {
      background: #444;
      cursor: not-allowed;
    }

    .last-updated {
      color: #888;
      font-size: 0.9rem;
    }

    .loading {
      text-align: center;
      padding: 40px;
      font-size: 1.2rem;
      color: #888;
    }

    .connection-status {
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 10px 20px;
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 6px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .connection-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
    }

    .connection-dot.disconnected {
      background: #ef4444;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>Level Up Solo Health Dashboard</h1>
        <p class="last-updated">Last updated: <span id="lastUpdated">Loading...</span></p>
      </div>
      <div class="status-indicator">
        <div id="overallStatus" class="status-dot"></div>
        <span id="overallText">Checking...</span>
        <button id="refreshButton" class="refresh-button" onclick="refreshHealth()">
          Refresh Now
        </button>
      </div>
    </header>

    <div class="summary" id="summary">
      <div class="loading">Initializing health checks...</div>
    </div>

    <div class="checks-grid" id="checksGrid">
      <!-- Health checks will be inserted here -->
    </div>
  </div>

  <div class="connection-status">
    <div id="connectionDot" class="connection-dot"></div>
    <span id="connectionText">Connecting...</span>
  </div>

  <script>
    let ws;
    let isRefreshing = false;

    function connectWebSocket() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(\`\${protocol}//\${window.location.host}\`);

      ws.onopen = () => {
        console.log('Connected to health dashboard');
        updateConnectionStatus(true);
        // Request initial data
        fetchHealthData();
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        updateDashboard(data);
        isRefreshing = false;
        document.getElementById('refreshButton').disabled = false;
      };

      ws.onclose = () => {
        console.log('Disconnected from health dashboard');
        updateConnectionStatus(false);
        // Reconnect after 5 seconds
        setTimeout(connectWebSocket, 5000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    }

    function updateConnectionStatus(connected) {
      const dot = document.getElementById('connectionDot');
      const text = document.getElementById('connectionText');
      
      if (connected) {
        dot.classList.remove('disconnected');
        text.textContent = 'Connected';
      } else {
        dot.classList.add('disconnected');
        text.textContent = 'Disconnected';
      }
    }

    async function fetchHealthData() {
      try {
        const response = await fetch('/api/health');
        const data = await response.json();
        updateDashboard(data);
      } catch (error) {
        console.error('Failed to fetch health data:', error);
      }
    }

    function refreshHealth() {
      if (!isRefreshing && ws && ws.readyState === WebSocket.OPEN) {
        isRefreshing = true;
        document.getElementById('refreshButton').disabled = true;
        ws.send('refresh');
      }
    }

    function updateDashboard(data) {
      // Update overall status
      const overallStatus = document.getElementById('overallStatus');
      const overallText = document.getElementById('overallText');
      overallStatus.className = \`status-dot \${data.overall}\`;
      overallText.textContent = data.overall.charAt(0).toUpperCase() + data.overall.slice(1);

      // Update last updated time
      const lastUpdated = document.getElementById('lastUpdated');
      lastUpdated.textContent = new Date(data.lastUpdated).toLocaleString();

      // Update summary
      const summaryHtml = \`
        <div class="summary-card healthy">
          <h3>\${data.summary.healthy}</h3>
          <p>Healthy</p>
        </div>
        <div class="summary-card warning">
          <h3>\${data.summary.warning}</h3>
          <p>Warnings</p>
        </div>
        <div class="summary-card error">
          <h3>\${data.summary.error}</h3>
          <p>Errors</p>
        </div>
        <div class="summary-card">
          <h3>\${data.summary.total}</h3>
          <p>Total Checks</p>
        </div>
      \`;
      document.getElementById('summary').innerHTML = summaryHtml;

      // Update checks grid
      const checksHtml = data.checks.map(check => \`
        <div class="check-card \${check.status}">
          <div class="check-header">
            <div class="check-name">\${check.name}</div>
            <div class="check-status \${check.status}">\${check.status}</div>
          </div>
          <div class="check-category">\${check.category}</div>
          <div class="check-message">\${check.message}</div>
          \${check.details ? \`
            <div class="check-details">
              \${JSON.stringify(check.details, null, 2)}
            </div>
          \` : ''}
        </div>
      \`).join('');
      document.getElementById('checksGrid').innerHTML = checksHtml;
    }

    // Initialize
    connectWebSocket();
  </script>
</body>
</html>`;
}

// =====================================================
// CLI Mode - 命令行模式
// =====================================================

async function runCLI() {
  const checker = new HealthChecker();
  const health = await checker.runAllChecks();

  console.log('\n📊 Project Health Report');
  console.log('=' .repeat(50));
  console.log(`Overall Status: ${getStatusEmoji(health.overall)} ${health.overall.toUpperCase()}`);
  console.log(`Last Updated: ${health.lastUpdated.toLocaleString()}`);
  console.log(`\nSummary:`);
  console.log(`  ✅ Healthy: ${health.summary.healthy}`);
  console.log(`  ⚠️  Warning: ${health.summary.warning}`);
  console.log(`  ❌ Error: ${health.summary.error}`);
  console.log(`  📋 Total: ${health.summary.total}`);

  console.log('\nDetailed Results:');
  console.log('-' .repeat(50));

  // Group by category
  const byCategory = health.checks.reduce((acc, check) => {
    if (!acc[check.category]) acc[check.category] = [];
    acc[check.category].push(check);
    return acc;
  }, {} as Record<string, HealthCheckResult[]>);

  Object.entries(byCategory).forEach(([category, checks]) => {
    console.log(`\n${category}:`);
    checks.forEach(check => {
      console.log(`  ${getStatusEmoji(check.status)} ${check.name}: ${check.message}`);
      if (check.details && process.argv.includes('--verbose')) {
        console.log(`     Details: ${JSON.stringify(check.details)}`);
      }
    });
  });

  console.log('\n');
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case 'healthy': return '✅';
    case 'warning': return '⚠️';
    case 'error': return '❌';
    default: return '🔍';
  }
}

// =====================================================
// Main - 主函数
// =====================================================

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--dashboard') || args.includes('-d')) {
    // Start dashboard server
    await startDashboard();
  } else {
    // Run CLI mode
    await runCLI();
    
    if (!args.includes('--watch')) {
      process.exit(0);
    } else {
      // Watch mode
      console.log('Running in watch mode. Press Ctrl+C to exit.\n');
      setInterval(async () => {
        console.clear();
        await runCLI();
      }, 30000);
    }
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { HealthChecker, type ProjectHealth, type HealthCheckResult };