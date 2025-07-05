# Battle Report 500 Error Fix

## Problem
The `/api/battle-reports/daily` endpoint was returning a 500 error in production.

## Root Cause
The `daily_battle_reports` table didn't exist in the production database. The migration file `0002_battle_reports_and_pomodoro_tracking.sql` had not been executed.

## Additional Issue
There was a type mismatch between the migration file and schema.ts:
- Migration: `date DATE NOT NULL`
- Schema: `date: timestamp("date").notNull()`

## Solution

### 1. Quick Fix (Immediate)
Run the fix script to create the missing tables:

```bash
# On Railway deployment
npx tsx scripts/fix-battle-reports.ts
```

### 2. Proper Fix (Long-term)
Run all migrations:

```bash
# Run all pending migrations
node scripts/run-migrations.js
```

### 3. Prevention
- Ensure migrations are run automatically on deployment
- Add migration checks to the startup process
- Consider using Drizzle's migration system instead of custom scripts

## Files Modified
- Created: `scripts/fix-battle-reports-table.sql` - SQL to create the tables
- Created: `scripts/fix-battle-reports.ts` - TypeScript script to execute the fix
- The SQL script uses TIMESTAMP instead of DATE to match the schema.ts definition

## Verification
After running the fix, verify:
1. Tables exist: `daily_battle_reports` and `pomodoro_sessions`
2. API endpoint `/api/battle-reports/daily` returns 200
3. Battle report data displays correctly in the UI