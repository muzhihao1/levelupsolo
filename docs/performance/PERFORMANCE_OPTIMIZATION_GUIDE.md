# Performance Optimization Guide

> Last Updated: 2025-07-04
> Version: 1.0

## Current Performance Issues

### 1. Habit Completion Latency
- **Problem**: Takes several seconds to respond when completing habits
- **Root Causes**:
  - Awaiting multiple query invalidations sequentially
  - Refetching all data types (tasks, stats, skills) on each mutation
  - Default React Query settings not optimized for this use case

### 2. API Request Optimization

#### Current Issues:
- Multiple parallel API calls on component mount
- Each mutation triggers 3-4 query invalidations
- No request batching or deduplication

#### Implemented Solutions:

1. **Remove Await from Query Invalidations** ✅
   ```typescript
   // Before - Blocking UI updates
   await Promise.all([
     queryClient.invalidateQueries({ queryKey: ["/api/data?type=tasks"] }),
     queryClient.refetchQueries({ queryKey: ["/api/data?type=tasks"] })
   ]);

   // After - Non-blocking background updates
   queryClient.invalidateQueries({ queryKey: ["/api/data?type=tasks"] });
   queryClient.invalidateQueries({ queryKey: ["/api/data?type=stats"] });
   ```

2. **Optimistic Updates** ✅
   - Immediately update UI without waiting for server response
   - Rollback on error
   - Better perceived performance

3. **Cache Configuration** ✅
   - Tasks: `staleTime: 0` (always fresh)
   - Skills/Goals: `staleTime: 30 minutes` (rarely change)
   - Stats: `staleTime: 10 minutes` (moderate changes)

## Additional Optimization Opportunities

### 1. Request Batching
Combine multiple API calls into single request:
```typescript
// Instead of:
/api/data?type=tasks
/api/data?type=skills
/api/data?type=stats
/api/data?type=goals

// Use:
/api/data?types=tasks,skills,stats,goals
```

### 2. Selective Query Invalidation
Only invalidate queries that actually changed:
```typescript
// For habit completion, only invalidate:
- tasks (habit status changed)
- stats (energy balls consumed)
// Skip invalidating skills/goals (unchanged)
```

### 3. Virtual Scrolling
For large task lists, implement virtual scrolling:
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';
```

### 4. Code Splitting
Lazy load heavy components:
```typescript
const GoalsView = lazy(() => import('./goals-view'));
const SkillsView = lazy(() => import('./skills-view'));
```

### 5. Database Query Optimization
- Add indexes on frequently queried columns
- Use pagination for large datasets
- Implement cursor-based pagination

### 6. Network Optimization
- Enable HTTP/2 on Railway
- Implement response compression (gzip/brotli)
- Use CDN for static assets
- Optimize bundle size with tree shaking

### 7. React Performance
- Memoize expensive calculations
- Use React.memo for pure components
- Implement useCallback for event handlers
- Use useMemo for filtered/sorted lists

### 8. Monitoring
Add performance monitoring:
```typescript
// Track API response times
const startTime = performance.now();
const response = await apiRequest(...);
const duration = performance.now() - startTime;
console.log(`API call took ${duration}ms`);
```

## Immediate Action Items

1. **Implement Request Batching** (High Priority)
   - Reduce number of API calls by 75%
   - Single request for all initial data

2. **Add Response Compression** (High Priority)
   - Enable gzip in Express
   - Reduce payload size by 60-80%

3. **Optimize Bundle Size** (Medium Priority)
   - Analyze with webpack-bundle-analyzer
   - Remove unused dependencies
   - Enable tree shaking

4. **Database Indexes** (Medium Priority)
   - Add index on tasks.userId
   - Add index on tasks.completed
   - Add composite index on (userId, taskCategory)

5. **Implement Lazy Loading** (Low Priority)
   - Split routes into separate bundles
   - Load components on demand

## Measurement

Track these metrics:
- Time to Interactive (TTI)
- First Contentful Paint (FCP)
- API Response Times
- Bundle Size
- Database Query Times

Use tools:
- Chrome DevTools Performance tab
- React DevTools Profiler
- Lighthouse
- WebPageTest