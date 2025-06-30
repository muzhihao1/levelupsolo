#!/usr/bin/env tsx
/**
 * Code Quality Check Tool
 * 代码质量检查工具
 * 
 * 分析代码复杂度、检测重复代码、检查代码规范
 */

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { createHash } from 'crypto';
import * as ts from 'typescript';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// =====================================================
// Types - 类型定义
// =====================================================

interface QualityIssue {
  type: 'complexity' | 'duplicate' | 'style' | 'size' | 'todo' | 'import' | 'length';
  severity: 'error' | 'warning' | 'info';
  file: string;
  line?: number;
  column?: number;
  message: string;
  details?: any;
}

interface FileMetrics {
  path: string;
  lines: number;
  functions: number;
  complexity: number;
  todos: number;
  issues: QualityIssue[];
}

interface DuplicateBlock {
  hash: string;
  files: Array<{
    path: string;
    startLine: number;
    endLine: number;
    content: string;
  }>;
}

interface QualityReport {
  timestamp: Date;
  summary: {
    totalFiles: number;
    totalLines: number;
    totalIssues: number;
    issuesBySeverity: Record<string, number>;
    issuesByType: Record<string, number>;
    averageComplexity: number;
    duplicateBlocks: number;
  };
  files: FileMetrics[];
  duplicates: DuplicateBlock[];
  topIssues: QualityIssue[];
}

interface QualityConfig {
  include: string[];
  exclude: string[];
  maxComplexity: number;
  maxFileLines: number;
  maxFunctionLines: number;
  minDuplicateLines: number;
  checkTodos: boolean;
  checkImports: boolean;
}

// =====================================================
// Code Quality Analyzer - 代码质量分析器
// =====================================================

class CodeQualityAnalyzer {
  private config: QualityConfig;
  private issues: QualityIssue[] = [];
  private fileMetrics: Map<string, FileMetrics> = new Map();
  private duplicates: Map<string, DuplicateBlock> = new Map();

  constructor(config?: Partial<QualityConfig>) {
    this.config = {
      include: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.next/**',
        '**/coverage/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/*.d.ts',
        '**/generated/**'
      ],
      maxComplexity: 10,
      maxFileLines: 300,
      maxFunctionLines: 50,
      minDuplicateLines: 6,
      checkTodos: true,
      checkImports: true,
      ...config
    };
  }

  async analyze(): Promise<QualityReport> {
    console.log('🔍 Starting code quality analysis...\n');

    // Get all files to analyze
    const files = await this.getFilesToAnalyze();
    console.log(`Found ${files.length} files to analyze\n`);

    // Analyze each file
    for (const file of files) {
      await this.analyzeFile(file);
    }

    // Detect duplicates across all files
    await this.detectDuplicates(files);

    // Generate report
    return this.generateReport();
  }

  private async getFilesToAnalyze(): Promise<string[]> {
    const allFiles: string[] = [];

    for (const pattern of this.config.include) {
      const files = await glob(pattern, {
        ignore: this.config.exclude,
        absolute: true
      });
      allFiles.push(...files);
    }

    return [...new Set(allFiles)]; // Remove duplicates
  }

  private async analyzeFile(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      const relativePath = path.relative(process.cwd(), filePath);

      const metrics: FileMetrics = {
        path: relativePath,
        lines: lines.length,
        functions: 0,
        complexity: 0,
        todos: 0,
        issues: []
      };

      // Check file size
      if (lines.length > this.config.maxFileLines) {
        metrics.issues.push({
          type: 'size',
          severity: 'warning',
          file: relativePath,
          message: `File has ${lines.length} lines (max: ${this.config.maxFileLines})`,
          details: { lines: lines.length, threshold: this.config.maxFileLines }
        });
      }

      // Analyze TypeScript/JavaScript
      if (filePath.match(/\.(ts|tsx|js|jsx)$/)) {
        this.analyzeTypeScriptFile(filePath, content, metrics);
      }

      // Check for TODOs and FIXMEs
      if (this.config.checkTodos) {
        this.checkTodos(lines, metrics);
      }

      // Store metrics
      this.fileMetrics.set(relativePath, metrics);
      this.issues.push(...metrics.issues);

    } catch (error) {
      console.error(`Error analyzing ${filePath}:`, error.message);
    }
  }

  private analyzeTypeScriptFile(filePath: string, content: string, metrics: FileMetrics): void {
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    const visit = (node: ts.Node) => {
      // Count functions and check their complexity
      if (ts.isFunctionDeclaration(node) || 
          ts.isMethodDeclaration(node) || 
          ts.isArrowFunction(node) ||
          ts.isFunctionExpression(node)) {
        
        metrics.functions++;
        
        const functionMetrics = this.analyzeFunctionComplexity(node, sourceFile);
        
        if (functionMetrics.complexity > this.config.maxComplexity) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          metrics.issues.push({
            type: 'complexity',
            severity: 'warning',
            file: metrics.path,
            line: line + 1,
            message: `Function has cyclomatic complexity of ${functionMetrics.complexity} (max: ${this.config.maxComplexity})`,
            details: {
              functionName: functionMetrics.name,
              complexity: functionMetrics.complexity,
              threshold: this.config.maxComplexity
            }
          });
        }

        if (functionMetrics.lines > this.config.maxFunctionLines) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          metrics.issues.push({
            type: 'length',
            severity: 'warning',
            file: metrics.path,
            line: line + 1,
            message: `Function has ${functionMetrics.lines} lines (max: ${this.config.maxFunctionLines})`,
            details: {
              functionName: functionMetrics.name,
              lines: functionMetrics.lines,
              threshold: this.config.maxFunctionLines
            }
          });
        }

        metrics.complexity = Math.max(metrics.complexity, functionMetrics.complexity);
      }

      // Check imports for circular dependencies
      if (this.config.checkImports && ts.isImportDeclaration(node)) {
        this.checkImport(node, sourceFile, metrics);
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  private analyzeFunctionComplexity(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction | ts.FunctionExpression,
    sourceFile: ts.SourceFile
  ): { name: string; complexity: number; lines: number } {
    let complexity = 1; // Base complexity
    let name = 'anonymous';

    // Get function name
    if ('name' in node && node.name) {
      name = node.name.getText();
    } else if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      const parent = node.parent;
      if (ts.isVariableDeclaration(parent) && parent.name) {
        name = parent.name.getText();
      } else if (ts.isPropertyAssignment(parent) && parent.name) {
        name = parent.name.getText();
      }
    }

    // Calculate complexity
    const visitComplexity = (node: ts.Node) => {
      // Increment complexity for control flow statements
      if (ts.isIfStatement(node) ||
          ts.isConditionalExpression(node) ||
          ts.isCaseClause(node) ||
          ts.isDefaultClause(node)) {
        complexity++;
      } else if (ts.isForStatement(node) ||
                 ts.isForInStatement(node) ||
                 ts.isForOfStatement(node) ||
                 ts.isWhileStatement(node) ||
                 ts.isDoStatement(node)) {
        complexity++;
      } else if (ts.isCatchClause(node)) {
        complexity++;
      } else if (ts.isBinaryExpression(node)) {
        const operator = node.operatorToken.kind;
        if (operator === ts.SyntaxKind.AmpersandAmpersandToken ||
            operator === ts.SyntaxKind.BarBarToken ||
            operator === ts.SyntaxKind.QuestionQuestionToken) {
          complexity++;
        }
      }

      ts.forEachChild(node, visitComplexity);
    };

    if (node.body) {
      visitComplexity(node.body);
    }

    // Calculate lines
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
    const lines = end.line - start.line + 1;

    return { name, complexity, lines };
  }

  private checkImport(
    node: ts.ImportDeclaration,
    sourceFile: ts.SourceFile,
    metrics: FileMetrics
  ): void {
    const moduleSpecifier = node.moduleSpecifier;
    if (ts.isStringLiteral(moduleSpecifier)) {
      const importPath = moduleSpecifier.text;
      
      // Check for potential circular dependencies
      if (importPath.startsWith('.')) {
        // This is a simplified check - a real implementation would build a dependency graph
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        
        // Check for suspicious patterns
        if (importPath.includes('..') && importPath.split('/').filter(p => p === '..').length > 2) {
          metrics.issues.push({
            type: 'import',
            severity: 'info',
            file: metrics.path,
            line: line + 1,
            message: `Deep relative import detected: ${importPath}`,
            details: { importPath }
          });
        }
      }
    }
  }

  private checkTodos(lines: string[], metrics: FileMetrics): void {
    const todoPatterns = [
      /TODO:/gi,
      /FIXME:/gi,
      /HACK:/gi,
      /BUG:/gi,
      /XXX:/gi,
      /OPTIMIZE:/gi,
      /REFACTOR:/gi
    ];

    lines.forEach((line, index) => {
      for (const pattern of todoPatterns) {
        if (pattern.test(line)) {
          metrics.todos++;
          metrics.issues.push({
            type: 'todo',
            severity: 'info',
            file: metrics.path,
            line: index + 1,
            message: line.trim(),
            details: { pattern: pattern.source }
          });
        }
      }
    });
  }

  private async detectDuplicates(files: string[]): Promise<void> {
    console.log('🔍 Detecting duplicate code blocks...\n');
    
    const codeBlocks: Map<string, Array<{
      file: string;
      startLine: number;
      endLine: number;
      content: string;
    }>> = new Map();

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n');
        const relativePath = path.relative(process.cwd(), file);

        // Extract code blocks of minimum size
        for (let i = 0; i < lines.length - this.config.minDuplicateLines; i++) {
          const block = lines.slice(i, i + this.config.minDuplicateLines);
          
          // Skip blocks with too many empty lines or comments
          const nonEmptyLines = block.filter(line => 
            line.trim() && !line.trim().startsWith('//') && !line.trim().startsWith('*')
          );
          
          if (nonEmptyLines.length < this.config.minDuplicateLines * 0.7) {
            continue;
          }

          // Normalize the block (remove whitespace variations)
          const normalizedBlock = block
            .map(line => line.trim())
            .filter(line => line)
            .join('\n');

          if (normalizedBlock) {
            const hash = this.hashCode(normalizedBlock);
            
            if (!codeBlocks.has(hash)) {
              codeBlocks.set(hash, []);
            }
            
            codeBlocks.get(hash)!.push({
              file: relativePath,
              startLine: i + 1,
              endLine: i + this.config.minDuplicateLines,
              content: block.join('\n')
            });
          }
        }
      } catch (error) {
        console.error(`Error processing ${file} for duplicates:`, error.message);
      }
    }

    // Filter out blocks that appear in multiple files
    for (const [hash, blocks] of codeBlocks.entries()) {
      const uniqueFiles = new Set(blocks.map(b => b.file));
      if (uniqueFiles.size > 1 || blocks.length > 1) {
        this.duplicates.set(hash, {
          hash,
          files: blocks
        });

        // Add issues for duplicates
        blocks.forEach(block => {
          const metrics = this.fileMetrics.get(block.file);
          if (metrics) {
            metrics.issues.push({
              type: 'duplicate',
              severity: 'warning',
              file: block.file,
              line: block.startLine,
              message: `Duplicate code block found (${this.config.minDuplicateLines} lines)`,
              details: {
                locations: blocks.map(b => `${b.file}:${b.startLine}-${b.endLine}`),
                hash
              }
            });
          }
        });
      }
    }
  }

  private hashCode(str: string): string {
    return createHash('md5').update(str).digest('hex').substring(0, 8);
  }

  private generateReport(): QualityReport {
    const files = Array.from(this.fileMetrics.values());
    const duplicateBlocks = Array.from(this.duplicates.values());

    // Calculate summary
    const summary = {
      totalFiles: files.length,
      totalLines: files.reduce((sum, f) => sum + f.lines, 0),
      totalIssues: this.issues.length,
      issuesBySeverity: this.groupBy(this.issues, 'severity'),
      issuesByType: this.groupBy(this.issues, 'type'),
      averageComplexity: files.length > 0 
        ? files.reduce((sum, f) => sum + f.complexity, 0) / files.length 
        : 0,
      duplicateBlocks: duplicateBlocks.length
    };

    // Get top issues
    const topIssues = this.issues
      .sort((a, b) => {
        const severityOrder = { error: 0, warning: 1, info: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      })
      .slice(0, 20);

    return {
      timestamp: new Date(),
      summary,
      files: files.sort((a, b) => b.issues.length - a.issues.length),
      duplicates: duplicateBlocks,
      topIssues
    };
  }

  private groupBy<T>(items: T[], key: keyof T): Record<string, number> {
    return items.reduce((acc, item) => {
      const value = String(item[key]);
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}

// =====================================================
// Report Formatters - 报告格式化器
// =====================================================

class ReportFormatter {
  static formatConsole(report: QualityReport): void {
    console.log('\n📊 Code Quality Report');
    console.log('=' .repeat(60));
    console.log(`Generated: ${report.timestamp.toLocaleString()}`);
    
    // Summary
    console.log('\n📈 Summary:');
    console.log(`  Total Files: ${report.summary.totalFiles}`);
    console.log(`  Total Lines: ${report.summary.totalLines.toLocaleString()}`);
    console.log(`  Total Issues: ${report.summary.totalIssues}`);
    console.log(`  Average Complexity: ${report.summary.averageComplexity.toFixed(2)}`);
    console.log(`  Duplicate Blocks: ${report.summary.duplicateBlocks}`);

    // Issues by severity
    console.log('\n🚦 Issues by Severity:');
    Object.entries(report.summary.issuesBySeverity).forEach(([severity, count]) => {
      const icon = severity === 'error' ? '❌' : severity === 'warning' ? '⚠️' : 'ℹ️';
      console.log(`  ${icon} ${severity}: ${count}`);
    });

    // Issues by type
    console.log('\n📋 Issues by Type:');
    Object.entries(report.summary.issuesByType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    // Top issues
    if (report.topIssues.length > 0) {
      console.log('\n🔍 Top Issues:');
      report.topIssues.forEach((issue, index) => {
        const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`\n${index + 1}. ${icon} [${issue.type.toUpperCase()}] ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
        console.log(`   ${issue.message}`);
      });
    }

    // Files with most issues
    const problematicFiles = report.files
      .filter(f => f.issues.length > 0)
      .slice(0, 10);

    if (problematicFiles.length > 0) {
      console.log('\n📁 Files with Most Issues:');
      problematicFiles.forEach(file => {
        console.log(`  ${file.path}: ${file.issues.length} issues`);
      });
    }

    // Duplicate code
    if (report.duplicates.length > 0) {
      console.log('\n🔁 Duplicate Code Blocks:');
      report.duplicates.slice(0, 5).forEach((dup, index) => {
        console.log(`\n${index + 1}. Found in ${dup.files.length} locations:`);
        dup.files.forEach(file => {
          console.log(`   - ${file.file}:${file.startLine}-${file.endLine}`);
        });
      });
    }

    // Recommendations
    console.log('\n💡 Recommendations:');
    if (report.summary.averageComplexity > 5) {
      console.log('  - Consider refactoring complex functions to reduce cyclomatic complexity');
    }
    if (report.summary.duplicateBlocks > 10) {
      console.log('  - Extract duplicate code into shared functions or modules');
    }
    if (report.summary.issuesBySeverity.error > 0) {
      console.log('  - Address error-level issues immediately');
    }
    if (report.summary.issuesByType.todo > 20) {
      console.log('  - Review and prioritize TODO items');
    }

    console.log('\n');
  }

  static async formatJSON(report: QualityReport, outputPath: string): Promise<void> {
    await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
    console.log(`📄 JSON report saved to: ${outputPath}`);
  }

  static async formatHTML(report: QualityReport, outputPath: string): Promise<void> {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Code Quality Report - ${new Date().toLocaleDateString()}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      color: #333;
      line-height: 1.6;
      padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { 
      color: #2c3e50; 
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .timestamp { color: #7f8c8d; font-size: 0.9em; margin-bottom: 30px; }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .summary-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      text-align: center;
    }
    .summary-card h3 { 
      font-size: 2rem; 
      margin-bottom: 5px;
      color: #3498db;
    }
    .summary-card.error h3 { color: #e74c3c; }
    .summary-card.warning h3 { color: #f39c12; }
    .summary-card p { color: #7f8c8d; }
    .section {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    h2 { 
      color: #34495e; 
      margin-bottom: 15px;
      font-size: 1.5rem;
    }
    .issue {
      padding: 10px;
      margin-bottom: 10px;
      border-left: 4px solid #3498db;
      background: #f8f9fa;
      border-radius: 4px;
    }
    .issue.error { border-color: #e74c3c; }
    .issue.warning { border-color: #f39c12; }
    .issue.info { border-color: #3498db; }
    .issue-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 5px;
    }
    .issue-type {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.85em;
      font-weight: 600;
      text-transform: uppercase;
    }
    .issue-type.complexity { background: #e8f5e9; color: #2e7d32; }
    .issue-type.duplicate { background: #fff3e0; color: #e65100; }
    .issue-type.size { background: #f3e5f5; color: #6a1b9a; }
    .issue-type.todo { background: #e3f2fd; color: #1565c0; }
    .issue-type.import { background: #fce4ec; color: #c2185b; }
    .issue-type.length { background: #e0f2f1; color: #00695c; }
    .file-path { 
      font-family: monospace; 
      color: #555;
      font-size: 0.9em;
    }
    .charts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }
    .chart {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .duplicate-block {
      background: #f8f9fa;
      padding: 10px;
      margin-bottom: 10px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.9em;
    }
    .location-list {
      margin-top: 5px;
      padding-left: 20px;
    }
    .recommendations {
      background: #e8f5e9;
      padding: 15px;
      border-radius: 8px;
      margin-top: 10px;
    }
    .recommendations ul {
      margin-left: 20px;
      margin-top: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background: #f5f5f5;
      font-weight: 600;
    }
    .progress-bar {
      width: 100%;
      height: 20px;
      background: #e0e0e0;
      border-radius: 10px;
      overflow: hidden;
      margin-top: 10px;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #4caf50, #8bc34a);
      transition: width 0.3s ease;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Code Quality Report</h1>
    <p class="timestamp">Generated on ${report.timestamp.toLocaleString()}</p>

    <div class="summary">
      <div class="summary-card">
        <h3>${report.summary.totalFiles}</h3>
        <p>Total Files</p>
      </div>
      <div class="summary-card">
        <h3>${report.summary.totalLines.toLocaleString()}</h3>
        <p>Total Lines</p>
      </div>
      <div class="summary-card ${report.summary.totalIssues > 50 ? 'error' : report.summary.totalIssues > 20 ? 'warning' : ''}">
        <h3>${report.summary.totalIssues}</h3>
        <p>Total Issues</p>
      </div>
      <div class="summary-card">
        <h3>${report.summary.averageComplexity.toFixed(2)}</h3>
        <p>Avg Complexity</p>
      </div>
      <div class="summary-card ${report.summary.duplicateBlocks > 10 ? 'warning' : ''}">
        <h3>${report.summary.duplicateBlocks}</h3>
        <p>Duplicate Blocks</p>
      </div>
    </div>

    <div class="charts">
      <div class="chart">
        <h2>Issues by Severity</h2>
        ${this.generateBarChart(report.summary.issuesBySeverity)}
      </div>
      <div class="chart">
        <h2>Issues by Type</h2>
        ${this.generateBarChart(report.summary.issuesByType)}
      </div>
    </div>

    ${report.topIssues.length > 0 ? `
    <div class="section">
      <h2>🔍 Top Issues</h2>
      ${report.topIssues.map(issue => `
        <div class="issue ${issue.severity}">
          <div class="issue-header">
            <span class="file-path">${issue.file}${issue.line ? `:${issue.line}` : ''}</span>
            <span class="issue-type ${issue.type}">${issue.type}</span>
          </div>
          <div>${issue.message}</div>
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${report.duplicates.length > 0 ? `
    <div class="section">
      <h2>🔁 Duplicate Code Blocks</h2>
      ${report.duplicates.slice(0, 10).map((dup, index) => `
        <div class="duplicate-block">
          <strong>Duplicate #${index + 1}</strong> - Found in ${dup.files.length} locations:
          <ul class="location-list">
            ${dup.files.map(f => `<li>${f.file}:${f.startLine}-${f.endLine}</li>`).join('')}
          </ul>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <div class="section">
      <h2>📁 Files with Most Issues</h2>
      <table>
        <thead>
          <tr>
            <th>File</th>
            <th>Issues</th>
            <th>Lines</th>
            <th>Complexity</th>
          </tr>
        </thead>
        <tbody>
          ${report.files
            .filter(f => f.issues.length > 0)
            .slice(0, 20)
            .map(file => `
              <tr>
                <td class="file-path">${file.path}</td>
                <td>${file.issues.length}</td>
                <td>${file.lines}</td>
                <td>${file.complexity}</td>
              </tr>
            `).join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>💡 Recommendations</h2>
      <div class="recommendations">
        <ul>
          ${report.summary.averageComplexity > 5 ? '<li>Consider refactoring complex functions to reduce cyclomatic complexity</li>' : ''}
          ${report.summary.duplicateBlocks > 10 ? '<li>Extract duplicate code into shared functions or modules</li>' : ''}
          ${report.summary.issuesBySeverity.error > 0 ? '<li>Address error-level issues immediately</li>' : ''}
          ${report.summary.issuesByType.todo > 20 ? '<li>Review and prioritize TODO items</li>' : ''}
          ${report.summary.totalLines / report.summary.totalFiles > 300 ? '<li>Consider breaking up large files into smaller, more focused modules</li>' : ''}
        </ul>
      </div>
    </div>
  </div>
</body>
</html>`;

    await fs.writeFile(outputPath, html);
    console.log(`📄 HTML report saved to: ${outputPath}`);
  }

  private static generateBarChart(data: Record<string, number>): string {
    const total = Object.values(data).reduce((sum, val) => sum + val, 0);
    const colors = {
      error: '#e74c3c',
      warning: '#f39c12',
      info: '#3498db',
      complexity: '#2ecc71',
      duplicate: '#e67e22',
      size: '#9b59b6',
      todo: '#3498db',
      import: '#e91e63',
      length: '#16a085'
    };

    return Object.entries(data).map(([key, value]) => {
      const percentage = total > 0 ? (value / total) * 100 : 0;
      const color = colors[key] || '#95a5a6';
      return `
        <div style="margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>${key}</span>
            <span>${value}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${percentage}%; background: ${color};"></div>
          </div>
        </div>
      `;
    }).join('');
  }
}

// =====================================================
// CLI Interface - 命令行界面
// =====================================================

async function main() {
  const args = process.argv.slice(2);
  
  // Parse CLI arguments
  const options: Partial<QualityConfig> = {};
  let outputFormat: 'console' | 'json' | 'html' = 'console';
  let outputPath: string | null = null;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--complexity':
      case '-c':
        options.maxComplexity = parseInt(args[++i]);
        break;
      case '--file-lines':
      case '-f':
        options.maxFileLines = parseInt(args[++i]);
        break;
      case '--function-lines':
      case '-l':
        options.maxFunctionLines = parseInt(args[++i]);
        break;
      case '--min-duplicate':
      case '-d':
        options.minDuplicateLines = parseInt(args[++i]);
        break;
      case '--no-todos':
        options.checkTodos = false;
        break;
      case '--no-imports':
        options.checkImports = false;
        break;
      case '--include':
        options.include = args[++i].split(',');
        break;
      case '--exclude':
        options.exclude = args[++i].split(',');
        break;
      case '--json':
        outputFormat = 'json';
        outputPath = args[++i] || 'quality-report.json';
        break;
      case '--html':
        outputFormat = 'html';
        outputPath = args[++i] || 'quality-report.html';
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  // Run analysis
  const analyzer = new CodeQualityAnalyzer(options);
  const report = await analyzer.analyze();

  // Format output
  switch (outputFormat) {
    case 'json':
      await ReportFormatter.formatJSON(report, outputPath!);
      break;
    case 'html':
      await ReportFormatter.formatHTML(report, outputPath!);
      break;
    default:
      ReportFormatter.formatConsole(report);
  }

  // Exit with error code if issues found
  const hasErrors = report.summary.issuesBySeverity.error > 0;
  process.exit(hasErrors ? 1 : 0);
}

function printHelp() {
  console.log(`
Code Quality Check Tool

Usage: code-quality-checker [options]

Options:
  -c, --complexity <n>        Maximum cyclomatic complexity (default: 10)
  -f, --file-lines <n>        Maximum lines per file (default: 300)
  -l, --function-lines <n>    Maximum lines per function (default: 50)
  -d, --min-duplicate <n>     Minimum lines for duplicate detection (default: 6)
  --no-todos                  Disable TODO/FIXME detection
  --no-imports                Disable import analysis
  --include <patterns>        Comma-separated file patterns to include
  --exclude <patterns>        Comma-separated file patterns to exclude
  --json [file]               Output report as JSON
  --html [file]               Output report as HTML
  -h, --help                  Show this help message

Examples:
  # Basic analysis
  code-quality-checker

  # Strict complexity checking
  code-quality-checker --complexity 5 --function-lines 30

  # Generate HTML report
  code-quality-checker --html report.html

  # Custom file patterns
  code-quality-checker --include "src/**/*.ts" --exclude "**/*.test.ts"
`);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { CodeQualityAnalyzer, ReportFormatter, type QualityReport, type QualityConfig };