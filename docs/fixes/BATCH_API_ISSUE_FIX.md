# Batch API Issue Fix

> Last Updated: 2025-07-04
> Version: 1.0

## Problem Description

After implementing the batch API endpoint for performance optimization:
- Tasks stopped showing in the UI
- AI task creation showed success but tasks were not visible
- Even previously existing tasks disappeared
- Task counter showed "0 tasks"

## Root Cause

The batch API endpoint `/api/data/batch` was added in the latest deployment but:
1. Railway might not have deployed it yet (deployment lag)
2. Or there was an issue with the endpoint implementation
3. The frontend immediately started using it, causing data fetching to fail

## Immediate Fix (Deployed)

Temporarily reverted to individual API queries:
- Removed batch API usage
- Restored original individual queries for tasks, skills, goals, stats
- This immediately restored task visibility

## Long-term Solution

Created `useSmartBatchData` hook that:
1. Checks if batch endpoint is available
2. Uses batch API if available (for performance)
3. Falls back to individual queries if not
4. Caches the availability check for 5 minutes

## Benefits

- **Immediate**: Tasks are visible again
- **Future-proof**: Will automatically use batch API when available
- **Graceful degradation**: Works even if batch endpoint fails
- **Performance**: Still gets optimization benefits when possible

## Implementation Details

### Temporary Fix (Current)
```typescript
// Directly use individual queries
const tasksQuery = useQuery<Task[]>({
  queryKey: ["/api/data?type=tasks"],
  staleTime: 0,
  gcTime: 5 * 60 * 1000,
});
```

### Smart Solution (For Future)
```typescript
// Check batch endpoint availability first
const { tasks, skills, goals, stats, usingBatch } = useSmartBatchData();
// Automatically uses best available method
```

## Verification Steps

1. Tasks should now be visible in the UI
2. AI task creation should work properly
3. Check console for "Batch endpoint is available" message
4. Monitor performance once batch endpoint is confirmed working

## Related Files

- `/client/src/components/unified-rpg-task-manager.tsx` - Temporary fix
- `/client/src/hooks/use-smart-batch-data.ts` - Smart solution
- `/server/routes.ts` - Batch endpoint implementation

## Notes

- The batch endpoint reduces API calls from 4 to 1
- Performance improvement is significant when available
- Current fix ensures functionality while maintaining future optimization path