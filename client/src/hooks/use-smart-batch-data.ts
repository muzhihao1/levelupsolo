import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { Task, Skill } from '@shared/schema';

// Check if batch endpoint is available
let batchEndpointAvailable: boolean | null = null;

async function checkBatchEndpoint() {
  if (batchEndpointAvailable !== null) {
    return batchEndpointAvailable;
  }
  
  try {
    // Try a minimal batch request
    await apiRequest('GET', '/api/data/batch?types=stats');
    batchEndpointAvailable = true;
    console.log('Batch endpoint is available');
  } catch (error: any) {
    if (error.message?.includes('404')) {
      batchEndpointAvailable = false;
      console.log('Batch endpoint not available, using individual queries');
    } else {
      // Other errors - assume endpoint exists but has issues
      batchEndpointAvailable = false;
      console.error('Batch endpoint error:', error);
    }
  }
  
  return batchEndpointAvailable;
}

interface SmartDataOptions {
  useBatch?: boolean;
}

export function useSmartBatchData({ useBatch = true }: SmartDataOptions = {}) {
  // Check if batch endpoint is available
  const batchCheckQuery = useQuery({
    queryKey: ['batch-endpoint-check'],
    queryFn: checkBatchEndpoint,
    staleTime: 5 * 60 * 1000, // Check every 5 minutes
    gcTime: 10 * 60 * 1000,
  });
  
  const shouldUseBatch = useBatch && batchCheckQuery.data === true;
  
  // Batch query
  const batchQuery = useQuery({
    queryKey: ['/api/data/batch?types=tasks,skills,goals,stats'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/data/batch?types=tasks,skills,goals,stats');
      return response;
    },
    enabled: shouldUseBatch,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });
  
  // Individual queries (as fallback)
  const tasksQuery = useQuery<Task[]>({
    queryKey: ["/api/data?type=tasks"],
    enabled: !shouldUseBatch || batchQuery.isError,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });
  
  const skillsQuery = useQuery<Skill[]>({
    queryKey: ["/api/data?type=skills"],
    enabled: !shouldUseBatch || batchQuery.isError,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
  
  const goalsQuery = useQuery<any[]>({
    queryKey: ["/api/data?type=goals"],
    enabled: !shouldUseBatch || batchQuery.isError,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
  
  const statsQuery = useQuery<any>({
    queryKey: ["/api/data?type=stats"],
    enabled: !shouldUseBatch || batchQuery.isError,
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
  });
  
  // Use batch data if available, otherwise use individual queries
  const useBatchData = shouldUseBatch && batchQuery.isSuccess && batchQuery.data?.data;
  
  return {
    tasks: useBatchData ? batchQuery.data.data.tasks : (tasksQuery.data || []),
    skills: useBatchData ? batchQuery.data.data.skills : (skillsQuery.data || []),
    goals: useBatchData ? batchQuery.data.data.goals : (goalsQuery.data || []),
    stats: useBatchData ? batchQuery.data.data.stats : (statsQuery.data || null),
    isLoading: shouldUseBatch 
      ? batchQuery.isLoading 
      : (tasksQuery.isLoading || skillsQuery.isLoading || goalsQuery.isLoading || statsQuery.isLoading),
    isError: shouldUseBatch
      ? batchQuery.isError && (tasksQuery.isError || skillsQuery.isError || goalsQuery.isError || statsQuery.isError)
      : (tasksQuery.isError || skillsQuery.isError || goalsQuery.isError || statsQuery.isError),
    error: batchQuery.error || tasksQuery.error || skillsQuery.error || goalsQuery.error || statsQuery.error,
    usingBatch: useBatchData,
  };
}