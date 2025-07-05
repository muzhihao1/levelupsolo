# Habit Completion 500 Error - Comprehensive Debug & Solution Plan

## Problem Summary

The habit completion feature is failing with PostgreSQL error code `42703` (undefined_column), indicating a mismatch between the TypeScript model field names (camelCase) and actual database column names (snake_case).

## Root Cause Analysis

### 1. **Schema Definition Mismatch**
```typescript
// TypeScript Model (shared/schema.ts)
lastCompletedAt: timestamp("last_completed_at")  // TS: camelCase, DB: snake_case
completionCount: integer("completion_count")      // TS: camelCase, DB: snake_case
```

### 2. **Update Logic Issue**
```typescript
// routes.ts sends camelCase
updates.lastCompletedAt = now;
updates.completionCount = count + 1;

// Drizzle ORM might not be translating properly
```

### 3. **Database State Unknown**
- Columns might exist with different names
- Schema might be out of sync
- Migration history unclear

## Immediate Debugging Steps

### Step 1: Verify Database Schema
```bash
# Run the debug script to check actual column names
cd /path/to/project
node debug-db-schema.js
```

This will show:
- Whether tasks table exists
- All column names and types
- Specific problem columns status
- Database timezone settings

### Step 2: Test Drizzle ORM Behavior
```bash
# Run the Drizzle test script
npm run build
node test-drizzle-update.js
```

This will reveal:
- How Drizzle translates field names
- Which SQL syntax works
- Error details for failed updates

### Step 3: Apply Database Migration (if needed)
```bash
# Connect to production database
psql $DATABASE_URL

# Run migration script
\i fix-habit-columns.sql
```

This will:
- Ensure columns exist with correct names
- Rename any camelCase columns to snake_case
- Maintain data integrity

## Implemented Solutions

### Solution 1: Storage Layer Enhancement
Added intelligent fallback in `updateTask()`:
- First attempts standard Drizzle update
- On column error (42703), uses raw SQL with proper mapping
- Handles camelCase to snake_case translation

### Solution 2: Dedicated Habit Method
Created `updateHabitCompletion()`:
- Uses raw SQL with guaranteed snake_case columns
- Bypasses Drizzle field mapping issues
- Returns properly formatted TypeScript object

### Solution 3: Routes Layer Update
Modified habit completion logic:
- Uses dedicated method for habits
- Separates habit-specific updates from general updates
- Maintains backward compatibility

## Testing the Fix

### 1. Local Testing
```bash
# Start dev server
npm run dev

# Test habit completion
curl -X PATCH http://localhost:5000/api/tasks/[HABIT_ID] \
  -H "Content-Type: application/json" \
  -H "Cookie: [AUTH_COOKIE]" \
  -d '{"completed": true}'
```

### 2. Production Testing
```bash
# Deploy the changes
git add .
git commit -m "Fix habit completion column name mismatch"
git push

# Test on production
curl -X PATCH https://www.levelupsolo.net/api/tasks/[HABIT_ID] \
  -H "Content-Type: application/json" \
  -H "Cookie: [AUTH_COOKIE]" \
  -d '{"completed": true}'
```

## Monitoring

### Check Logs
```bash
# Railway logs
railway logs

# Look for:
# - [storage.updateHabitCompletion] messages
# - Error code 42703 occurrences
# - Successful habit updates
```

### Health Checks
```bash
# Database connection
curl https://www.levelupsolo.net/api/health/db

# Habit completion test
curl https://www.levelupsolo.net/api/debug/test-habit-update
```

## Long-term Solutions

### 1. **Standardize Naming Convention**
- Use consistent snake_case in database
- Configure Drizzle ORM properly for field mapping
- Update all table definitions

### 2. **Migration System**
- Implement proper database migration tracking
- Use tools like Drizzle Kit or Prisma Migrate
- Version control schema changes

### 3. **Better Error Handling**
- Add specific error codes for known issues
- Implement automatic retry with fallback
- Provide clear error messages to frontend

### 4. **Type Safety**
- Generate types from database schema
- Use Drizzle's type inference consistently
- Add runtime validation

## Prevention Checklist

- [ ] Always verify column names match between schema and database
- [ ] Test with both camelCase and snake_case in development
- [ ] Use database introspection tools before deployment
- [ ] Implement comprehensive error logging
- [ ] Create integration tests for critical paths
- [ ] Document any schema conventions clearly

## Emergency Fallback

If issues persist:

1. **Direct SQL Update**
```sql
UPDATE tasks 
SET last_completed_at = NOW(), 
    completion_count = COALESCE(completion_count, 0) + 1
WHERE id = ? AND user_id = ? AND task_category = 'habit';
```

2. **Temporary Frontend Bypass**
```javascript
// Use simple-complete endpoint
await fetch(`/api/tasks/${taskId}/simple-complete`, { method: 'POST' });
```

3. **Manual Database Fix**
```sql
-- Check actual column names
\d tasks

-- Rename if needed
ALTER TABLE tasks RENAME COLUMN "lastCompletedAt" TO last_completed_at;
```

## Success Criteria

- Habit completion returns 200 status
- `last_completed_at` updates correctly
- `completion_count` increments
- No 42703 errors in logs
- Response time < 2 seconds

## Related Files

- `/server/storage.ts` - Storage layer with fixes
- `/server/routes.ts` - Route handlers
- `/shared/schema.ts` - TypeScript models
- `/debug-db-schema.js` - Database inspection tool
- `/fix-habit-columns.sql` - Migration script
- `/test-drizzle-update.js` - ORM behavior test