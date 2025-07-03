# Railway Column Name Error Fix

## Problem Analysis

The Railway logs show a PostgreSQL error:
```
code: '42703' (undefined column)
routine: 'transformUpdateTargetList'
```

The error indicates that column `last_completed_at` doesn't exist in the `tasks` table.

## Root Cause

Based on the schema definition and production database inspection, the issue appears to be a **case sensitivity problem** in PostgreSQL.

### Schema Definition (shared/schema.ts)
```typescript
lastCompletedAt: timestamp("last_completed_at"),
completionCount: integer("completion_count").notNull().default(0),
```

### Possible Scenarios

1. **Columns created with quotes**: If the table was created with quoted identifiers like `"lastCompletedAt"`, PostgreSQL treats them as case-sensitive.

2. **Migration mismatch**: The production database might have different column names than expected.

3. **Column doesn't exist**: The column might not have been created in production.

## Immediate Solution

### Check Actual Column Names

Add this debug endpoint to verify the actual column names in production:

```typescript
app.get('/api/debug/check-columns', async (req, res) => {
  try {
    const { sql } = require('drizzle-orm');
    const { db } = require('./db');
    
    const columns = await db.execute(sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'tasks'
      ORDER BY ordinal_position
    `);
    
    res.json({
      columns: columns.rows || columns,
      note: "These are the actual column names in the database"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Fix Options

#### Option 1: Use Quoted Identifiers (If columns are camelCase)
```sql
UPDATE tasks 
SET 
  "lastCompletedAt" = NOW(),
  "completionCount" = COALESCE("completionCount", 0) + 1,
  "updatedAt" = NOW()
WHERE 
  id = $1 
  AND "userId" = $2
  AND "taskCategory" = 'habit'
```

#### Option 2: Use Unquoted Identifiers (If columns are snake_case)
```sql
UPDATE tasks 
SET 
  last_completed_at = NOW(),
  completion_count = COALESCE(completion_count, 0) + 1,
  updated_at = NOW()
WHERE 
  id = $1 
  AND user_id = $2
  AND task_category = 'habit'
```

#### Option 3: Add Missing Columns
If columns don't exist, add them:
```sql
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS last_completed_at TIMESTAMP;

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS completion_count INTEGER DEFAULT 0;
```

## Testing Strategy

1. Deploy the debug endpoint
2. Check actual column names in production
3. Update SQL queries based on findings
4. Test habit completion

## Long-term Solution

1. **Standardize naming**: Ensure all database operations use consistent naming
2. **Use ORM consistently**: Avoid mixing raw SQL with ORM operations
3. **Add database tests**: Verify schema matches expectations
4. **Document conventions**: Clear guidelines for column naming

## Quick Fix Script

Run this in the database to ensure columns exist:

```sql
-- Check if columns exist
SELECT 
  column_name,
  CASE 
    WHEN column_name IN ('last_completed_at', 'lastCompletedAt', '"lastCompletedAt"') THEN 'EXISTS'
    ELSE 'MISSING'
  END as status
FROM information_schema.columns
WHERE table_name = 'tasks'
  AND column_name ILIKE '%complet%';

-- Add columns if missing (adjust based on findings)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' 
    AND column_name IN ('last_completed_at', 'lastCompletedAt')
  ) THEN
    ALTER TABLE tasks ADD COLUMN last_completed_at TIMESTAMP;
    ALTER TABLE tasks ADD COLUMN completion_count INTEGER DEFAULT 0;
  END IF;
END $$;
```