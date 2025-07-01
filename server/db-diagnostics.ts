/**
 * Database diagnostics module for troubleshooting connection issues
 */
import { db, sql } from "./db";
import postgres from "postgres";
import { users } from "@shared/schema";
import { count } from "drizzle-orm";

interface DiagnosticResult {
  check: string;
  status: 'pass' | 'fail' | 'warning' | 'info';
  message: string;
  details?: any;
}

interface DatabaseDiagnostics {
  timestamp: string;
  environment: string;
  checks: DiagnosticResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  recommendations: string[];
}

export async function runDatabaseDiagnostics(): Promise<DatabaseDiagnostics> {
  const results: DiagnosticResult[] = [];
  const recommendations: string[] = [];
  
  // 1. Check environment variables
  results.push({
    check: 'Environment Variables',
    status: process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL ? 'pass' : 'fail',
    message: process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL 
      ? 'Database URL is configured' 
      : 'No database URL configured',
    details: {
      hasDatabase: !!process.env.DATABASE_URL,
      hasSupabase: !!process.env.SUPABASE_DATABASE_URL,
      hasJWT: !!process.env.JWT_SECRET,
      hasJWTRefresh: !!process.env.JWT_REFRESH_SECRET,
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT || '3000'
    }
  });
  
  if (!process.env.JWT_REFRESH_SECRET) {
    results.push({
      check: 'JWT Refresh Secret',
      status: 'warning',
      message: 'JWT_REFRESH_SECRET not set - using insecure default',
      details: { recommendation: 'Set JWT_REFRESH_SECRET in Railway environment variables' }
    });
    recommendations.push('Add JWT_REFRESH_SECRET to Railway environment variables');
  }
  
  // 2. Check database connection URL format
  const dbUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
  if (dbUrl) {
    try {
      const urlObj = new URL(dbUrl);
      const isIPv6 = urlObj.hostname.includes(':');
      const hasSSL = urlObj.searchParams.has('sslmode') || 
                     urlObj.searchParams.has('ssl') ||
                     dbUrl.includes('sslmode=');
      
      results.push({
        check: 'Database URL Format',
        status: isIPv6 ? 'warning' : 'pass',
        message: isIPv6 
          ? 'Database URL contains IPv6 address which may cause issues' 
          : 'Database URL format is valid',
        details: {
          host: urlObj.hostname,
          port: urlObj.port || '5432',
          database: urlObj.pathname.slice(1),
          isIPv6,
          hasSSL,
          protocol: urlObj.protocol
        }
      });
      
      if (!hasSSL && process.env.NODE_ENV === 'production') {
        results.push({
          check: 'SSL Configuration',
          status: 'warning',
          message: 'SSL not explicitly configured for production',
          details: { 
            recommendation: 'Add ?sslmode=require to DATABASE_URL for Railway PostgreSQL' 
          }
        });
        recommendations.push('Add ?sslmode=require to your DATABASE_URL');
      }
    } catch (error) {
      results.push({
        check: 'Database URL Format',
        status: 'fail',
        message: 'Invalid database URL format',
        details: { error: (error as any).message }
      });
    }
  }
  
  // 3. Check database initialization
  const isInitialized = db !== null && db !== undefined;
  results.push({
    check: 'Database Initialization',
    status: isInitialized ? 'pass' : 'fail',
    message: isInitialized 
      ? 'Database client initialized' 
      : 'Database client not initialized',
    details: { 
      dbExists: !!db,
      connectionPool: process.env.USE_CONNECTION_POOL !== 'false' && process.env.NODE_ENV === 'production'
    }
  });
  
  // 4. Test database connection
  if (db && dbUrl) {
    try {
      // Create a test connection directly
      const testSql = postgres(dbUrl, {
        connect_timeout: 5,
        max: 1,
        ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
        prepare: false
      });
      
      const testResult = await testSql`SELECT version(), current_database(), current_user`;
      await testSql.end();
      
      results.push({
        check: 'Database Connection',
        status: 'pass',
        message: 'Successfully connected to database',
        details: {
          version: testResult[0].version,
          database: testResult[0].current_database,
          user: testResult[0].current_user
        }
      });
    } catch (error) {
      results.push({
        check: 'Database Connection',
        status: 'fail',
        message: 'Failed to connect to database',
        details: {
          error: (error as any).message,
          code: (error as any).code,
          hint: (error as any).hint || 'Check database URL and network connectivity'
        }
      });
      recommendations.push('Verify DATABASE_URL is correct and includes necessary parameters');
    }
  }
  
  // 5. Check table existence
  if (db) {
    try {
      const userCount = await db.select({ count: count() }).from(users);
      results.push({
        check: 'Tables Exist',
        status: 'pass',
        message: 'Database tables are created',
        details: { userCount: userCount[0].count }
      });
    } catch (error) {
      const errorMessage = (error as any).message;
      if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
        results.push({
          check: 'Tables Exist',
          status: 'fail',
          message: 'Database tables not created',
          details: { 
            error: 'Tables do not exist',
            recommendation: 'Run npm run db:push to create tables'
          }
        });
        recommendations.push('Run "npm run db:push" to create database tables');
      } else {
        results.push({
          check: 'Tables Exist',
          status: 'fail',
          message: 'Error checking tables',
          details: { error: errorMessage }
        });
      }
    }
  }
  
  // 6. Test write operation
  if (db) {
    try {
      // Try to read a user (non-destructive test)
      await db.select().from(users).limit(1);
      results.push({
        check: 'Database Operations',
        status: 'pass',
        message: 'Database queries working correctly',
        details: { canRead: true }
      });
    } catch (error) {
      results.push({
        check: 'Database Operations',
        status: 'fail',
        message: 'Database operations failing',
        details: { error: (error as any).message }
      });
    }
  }
  
  // Calculate summary
  const summary = {
    total: results.length,
    passed: results.filter(r => r.status === 'pass').length,
    failed: results.filter(r => r.status === 'fail').length,
    warnings: results.filter(r => r.status === 'warning').length
  };
  
  // Add general recommendations
  if (summary.failed > 0) {
    if (!dbUrl) {
      recommendations.unshift('Set DATABASE_URL or SUPABASE_DATABASE_URL in Railway environment variables');
    }
    if (process.env.NODE_ENV === 'production' && !process.env.USE_CONNECTION_POOL) {
      recommendations.push('Consider enabling connection pooling for production');
    }
  }
  
  return {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    checks: results,
    summary,
    recommendations: [...new Set(recommendations)] // Remove duplicates
  };
}

export async function testDatabaseConnection(connectionString: string): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    const testSql = postgres(connectionString, {
      connect_timeout: 5,
      max: 1,
      ssl: 'require',
      prepare: false
    });
    
    const result = await testSql`SELECT 1 as test`;
    await testSql.end();
    
    return {
      success: true,
      message: 'Connection successful',
      details: { test: result[0].test }
    };
  } catch (error) {
    return {
      success: false,
      message: 'Connection failed',
      details: {
        error: (error as any).message,
        code: (error as any).code,
        hint: (error as any).hint
      }
    };
  }
}