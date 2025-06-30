#!/usr/bin/env tsx
/**
 * Environment Configuration Check Script
 * 环境变量配置检查脚本
 * 
 * 用于诊断部署环境的配置问题，特别是Railway部署
 * 
 * 使用方法:
 * npm run check:env
 * 或
 * tsx scripts/check-env-config.ts
 */

import { config } from 'dotenv';
import chalk from 'chalk';
import { createHash } from 'crypto';

// Load environment variables
config();

interface EnvCheck {
  name: string;
  key: string;
  required: boolean;
  validator?: (value: string) => boolean | string;
  description: string;
  example?: string;
}

interface CheckResult {
  key: string;
  status: 'ok' | 'missing' | 'invalid';
  message: string;
  value?: string;
}

// Define all environment variables that need to be checked
const ENV_CHECKS: EnvCheck[] = [
  // Database
  {
    name: 'Database URL',
    key: 'DATABASE_URL',
    required: true,
    validator: (value) => {
      // PostgreSQL URL format: postgresql://user:password@host:port/database
      const pgRegex = /^postgres(ql)?:\/\/[^:]+:[^@]+@[^:]+:\d+\/\w+/;
      return pgRegex.test(value) || 'Invalid PostgreSQL connection string format';
    },
    description: 'PostgreSQL database connection string',
    example: 'postgresql://user:password@host:5432/database'
  },
  
  // Authentication
  {
    name: 'Session Secret',
    key: 'SESSION_SECRET',
    required: true,
    validator: (value) => {
      return value.length >= 32 || 'Session secret must be at least 32 characters';
    },
    description: 'Secret key for session encryption',
    example: 'your-very-long-random-session-secret-key'
  },
  
  {
    name: 'JWT Secret',
    key: 'JWT_SECRET',
    required: true,
    validator: (value) => {
      return value.length >= 32 || 'JWT secret must be at least 32 characters';
    },
    description: 'Secret key for JWT token signing',
    example: 'your-very-long-random-jwt-secret-key'
  },
  
  // OpenAI
  {
    name: 'OpenAI API Key',
    key: 'OPENAI_API_KEY',
    required: false,
    validator: (value) => {
      return value.startsWith('sk-') || 'OpenAI API key should start with "sk-"';
    },
    description: 'OpenAI API key for AI features',
    example: 'sk-...'
  },
  
  // Environment
  {
    name: 'Node Environment',
    key: 'NODE_ENV',
    required: true,
    validator: (value) => {
      const validEnvs = ['development', 'production', 'test'];
      return validEnvs.includes(value) || `Must be one of: ${validEnvs.join(', ')}`;
    },
    description: 'Application environment',
    example: 'production'
  },
  
  // Port
  {
    name: 'Port',
    key: 'PORT',
    required: false,
    validator: (value) => {
      const port = parseInt(value);
      return (!isNaN(port) && port > 0 && port < 65536) || 'Invalid port number';
    },
    description: 'Server port number',
    example: '3000'
  },
  
  // Application URL
  {
    name: 'App URL',
    key: 'APP_URL',
    required: false,
    validator: (value) => {
      try {
        new URL(value);
        return true;
      } catch {
        return 'Invalid URL format';
      }
    },
    description: 'Application base URL',
    example: 'https://www.levelupsolo.net'
  }
];

// Additional Railway-specific checks
const RAILWAY_CHECKS: EnvCheck[] = [
  {
    name: 'Railway Environment',
    key: 'RAILWAY_ENVIRONMENT',
    required: false,
    description: 'Railway environment name'
  },
  {
    name: 'Railway Static URL',
    key: 'RAILWAY_STATIC_URL',
    required: false,
    description: 'Railway static files URL'
  },
  {
    name: 'Railway Project ID',
    key: 'RAILWAY_PROJECT_ID',
    required: false,
    description: 'Railway project identifier'
  }
];

async function checkEnvironmentVariables(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  
  // Check main environment variables
  for (const check of ENV_CHECKS) {
    const value = process.env[check.key];
    
    if (!value) {
      results.push({
        key: check.key,
        status: check.required ? 'missing' : 'ok',
        message: check.required ? 'Required variable missing' : 'Optional variable not set',
        value: undefined
      });
      continue;
    }
    
    // Validate if validator exists
    if (check.validator) {
      const validationResult = check.validator(value);
      if (validationResult !== true) {
        results.push({
          key: check.key,
          status: 'invalid',
          message: typeof validationResult === 'string' ? validationResult : 'Validation failed',
          value: maskSensitiveValue(check.key, value)
        });
        continue;
      }
    }
    
    results.push({
      key: check.key,
      status: 'ok',
      message: 'Variable is set and valid',
      value: maskSensitiveValue(check.key, value)
    });
  }
  
  return results;
}

function maskSensitiveValue(key: string, value: string): string {
  const sensitiveKeys = ['PASSWORD', 'SECRET', 'KEY', 'TOKEN'];
  const shouldMask = sensitiveKeys.some(sensitive => key.includes(sensitive));
  
  if (!shouldMask) {
    return value;
  }
  
  // Show first 4 and last 4 characters
  if (value.length > 8) {
    return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
  }
  
  return '***';
}

async function testDatabaseConnection(): Promise<boolean> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return false;
  }
  
  console.log('\n🔍 Testing database connection...');
  
  try {
    // Dynamic import to avoid loading DB modules if not needed
    const { db } = await import('../server/db');
    await db.execute('SELECT 1');
    console.log(chalk.green('✅ Database connection successful'));
    return true;
  } catch (error) {
    console.log(chalk.red('❌ Database connection failed'));
    console.log(chalk.gray(`   Error: ${(error as Error).message}`));
    return false;
  }
}

function generateSecureSecret(): string {
  return createHash('sha256')
    .update(Math.random().toString())
    .update(Date.now().toString())
    .digest('hex');
}

function printResults(results: CheckResult[]) {
  console.log('\n' + chalk.bold('Environment Variable Check Results:'));
  console.log('=' .repeat(60));
  
  const grouped = {
    ok: results.filter(r => r.status === 'ok'),
    missing: results.filter(r => r.status === 'missing'),
    invalid: results.filter(r => r.status === 'invalid')
  };
  
  // Print OK variables
  if (grouped.ok.length > 0) {
    console.log('\n' + chalk.green('✅ Valid Variables:'));
    grouped.ok.forEach(result => {
      const check = ENV_CHECKS.find(c => c.key === result.key);
      console.log(chalk.green(`   ✓ ${check?.name || result.key}: ${result.value || 'Set'}`));
    });
  }
  
  // Print missing variables
  if (grouped.missing.length > 0) {
    console.log('\n' + chalk.red('❌ Missing Variables:'));
    grouped.missing.forEach(result => {
      const check = ENV_CHECKS.find(c => c.key === result.key);
      console.log(chalk.red(`   ✗ ${check?.name || result.key}`));
      if (check?.description) {
        console.log(chalk.gray(`     Description: ${check.description}`));
      }
      if (check?.example) {
        console.log(chalk.gray(`     Example: ${check.example}`));
      }
    });
  }
  
  // Print invalid variables
  if (grouped.invalid.length > 0) {
    console.log('\n' + chalk.yellow('⚠️  Invalid Variables:'));
    grouped.invalid.forEach(result => {
      const check = ENV_CHECKS.find(c => c.key === result.key);
      console.log(chalk.yellow(`   ! ${check?.name || result.key}: ${result.message}`));
      console.log(chalk.gray(`     Current value: ${result.value}`));
      if (check?.example) {
        console.log(chalk.gray(`     Example: ${check.example}`));
      }
    });
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(chalk.bold('Summary:'));
  console.log(`   Total checks: ${results.length}`);
  console.log(chalk.green(`   ✅ Valid: ${grouped.ok.length}`));
  console.log(chalk.red(`   ❌ Missing: ${grouped.missing.length}`));
  console.log(chalk.yellow(`   ⚠️  Invalid: ${grouped.invalid.length}`));
}

function checkRailwayEnvironment() {
  console.log('\n' + chalk.bold('Railway Platform Check:'));
  console.log('=' .repeat(60));
  
  const isRailway = process.env.RAILWAY_ENVIRONMENT !== undefined;
  
  if (isRailway) {
    console.log(chalk.green('✅ Running on Railway platform'));
    
    RAILWAY_CHECKS.forEach(check => {
      const value = process.env[check.key];
      if (value) {
        console.log(chalk.gray(`   ${check.name}: ${value}`));
      }
    });
  } else {
    console.log(chalk.yellow('⚠️  Not running on Railway platform'));
    console.log(chalk.gray('   This is expected for local development'));
  }
}

function generateExampleEnvFile() {
  console.log('\n' + chalk.bold('Example .env configuration:'));
  console.log('=' .repeat(60));
  console.log(chalk.gray('# Copy these to your .env file or Railway environment variables\n'));
  
  ENV_CHECKS.forEach(check => {
    if (check.required) {
      let exampleValue = check.example || '';
      
      // Generate secure examples for secrets
      if (check.key.includes('SECRET')) {
        exampleValue = generateSecureSecret();
      }
      
      console.log(chalk.cyan(`${check.key}=${exampleValue}`));
      console.log(chalk.gray(`# ${check.description}\n`));
    }
  });
}

async function main() {
  console.log(chalk.bold.blue('🔧 Level Up Solo - Environment Configuration Check\n'));
  
  // Check environment variables
  const results = await checkEnvironmentVariables();
  printResults(results);
  
  // Check Railway environment
  checkRailwayEnvironment();
  
  // Test database connection if configured
  if (process.env.DATABASE_URL) {
    await testDatabaseConnection();
  }
  
  // Show example configuration if there are issues
  const hasIssues = results.some(r => r.status !== 'ok');
  if (hasIssues) {
    generateExampleEnvFile();
    
    console.log('\n' + chalk.bold.yellow('⚠️  Action Required:'));
    console.log(chalk.yellow('1. Add missing environment variables to Railway'));
    console.log(chalk.yellow('2. Fix any invalid variable formats'));
    console.log(chalk.yellow('3. Re-deploy your application'));
    
    console.log('\n' + chalk.bold('📚 Railway Configuration Guide:'));
    console.log(chalk.gray('1. Go to your Railway project dashboard'));
    console.log(chalk.gray('2. Click on your service'));
    console.log(chalk.gray('3. Go to "Variables" tab'));
    console.log(chalk.gray('4. Add each missing variable'));
    console.log(chalk.gray('5. Click "Deploy" to apply changes'));
  } else {
    console.log('\n' + chalk.bold.green('✅ All checks passed! Your environment is properly configured.'));
  }
  
  process.exit(hasIssues ? 1 : 0);
}

// Run the script
main().catch(error => {
  console.error(chalk.red('Script error:'), error);
  process.exit(1);
});