import postgres from 'postgres';
import { readFileSync } from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.supabase' });

const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ No database URL found in environment variables');
  process.exit(1);
}

async function runSqlFile(filePath: string) {
  const sql = postgres(databaseUrl);
  
  try {
    const sqlContent = readFileSync(filePath, 'utf8');
    console.log(`📄 Running SQL from: ${filePath}`);
    
    await sql.unsafe(sqlContent);
    
    console.log('✅ SQL executed successfully!');
  } catch (error) {
    console.error('❌ Error executing SQL:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Get SQL file path from command line argument
const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error('❌ Please provide a SQL file path as argument');
  console.log('Usage: tsx scripts/run-sql.ts <sql-file>');
  process.exit(1);
}

const sqlFilePath = path.resolve(sqlFile);
runSqlFile(sqlFilePath);