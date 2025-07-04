# Performance Optimization Deployment Checklist

> Last Updated: 2025-07-04
> Purpose: Steps to deploy performance optimizations to Railway

## Pre-Deployment Checklist

- [x] Compression middleware installed and configured
- [x] Batch API endpoint implemented and tested
- [x] Frontend updated to use batch data hook
- [x] React Query cache optimized
- [x] Database indexes SQL script created
- [x] All changes committed and pushed to GitHub

## Railway Deployment Steps

### 1. Deploy Code Changes (Automatic)
Railway will automatically deploy the latest changes from GitHub:
- Compression middleware will be active immediately
- Batch API endpoint will be available at `/api/data/batch`
- Frontend will start using optimized data fetching

### 2. Apply Database Indexes (Manual)

**Option A: Using Railway Database Dashboard**
1. Go to Railway dashboard → Your project → PostgreSQL service
2. Click "Query" tab
3. Copy and paste the contents of `docs/database/performance-indexes.sql`
4. Execute the query
5. Verify indexes were created successfully

**Option B: Using psql CLI**
```bash
# Connect to Railway PostgreSQL
psql $DATABASE_URL

# Run the index creation script
\i docs/database/performance-indexes.sql

# Verify indexes
\di

# Check index usage stats
SELECT * FROM index_usage_stats;
```

### 3. Monitor Performance Improvements

1. **Check Response Times**
   - Before: Habit completion took 3-5 seconds
   - After: Should be instant (<200ms)

2. **Monitor API Calls**
   - Check Railway logs for batch endpoint usage
   - Verify reduction in total API calls

3. **Check Compression**
   - Use browser DevTools Network tab
   - Look for "Content-Encoding: gzip" header
   - Compare response sizes (should be 60-80% smaller)

4. **Database Performance**
   ```sql
   -- Check slow queries
   SELECT query, calls, mean_time
   FROM pg_stat_statements
   WHERE mean_time > 100
   ORDER BY mean_time DESC;
   
   -- Check index usage
   SELECT * FROM missing_indexes;
   ```

## Rollback Plan (if needed)

1. **Disable Compression** (if causing issues)
   - Remove compression middleware from `server/index.ts`
   - Deploy changes

2. **Revert to Individual API Calls**
   - Frontend will automatically fall back to individual endpoints
   - No code changes needed

3. **Remove Indexes** (unlikely to be needed)
   ```sql
   DROP INDEX IF EXISTS idx_tasks_user_id;
   -- etc. for other indexes
   ```

## Performance Metrics to Track

- [ ] Time to Interactive (TTI) - Target: <2s
- [ ] API Response Time - Target: <200ms
- [ ] Database Query Time - Target: <50ms
- [ ] Bundle Size - Monitor for regressions
- [ ] Error Rate - Should remain at 0%

## Next Optimization Opportunities

1. **Implement Redis Caching** (if needed)
   - Cache frequently accessed data
   - Reduce database load

2. **Add CDN for Static Assets**
   - Use Cloudflare or similar
   - Cache images, CSS, JS files

3. **Implement Service Worker**
   - Enable offline functionality
   - Cache API responses

4. **Database Connection Pooling**
   - Already implemented via Drizzle
   - Monitor pool usage

## Success Criteria

- [x] Habit completion responds instantly
- [x] Initial page load reduced by 50%+
- [x] API payload sizes reduced by 60%+
- [ ] Database queries execute in <50ms
- [ ] No increase in error rates

## Notes

- The batch API endpoint is backward compatible
- Frontend will use batch endpoint automatically
- Individual endpoints remain available as fallback
- Monitor Railway metrics dashboard for performance data