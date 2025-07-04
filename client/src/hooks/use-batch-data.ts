import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface BatchDataOptions {
  types: string[];
  enabled?: boolean;
}

interface BatchDataResponse {
  data: {
    tasks?: any[];
    skills?: any[];
    goals?: any[];
    stats?: any;
    profile?: any;
  };
  errors?: Record<string, string>;
}

export function useBatchData({ types, enabled = true }: BatchDataOptions) {
  return useQuery<BatchDataResponse>({
    queryKey: [`/api/data/batch?types=${types.join(',')}`],
    queryFn: async () => {
      return await apiRequest('GET', `/api/data/batch?types=${types.join(',')}`);
    },
    enabled,
    staleTime: 0, // Always fetch fresh data
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

// Helper hook to extract specific data types
export function useBatchDataWithSelectors(types: string[]) {
  const { data, isLoading, isError, error } = useBatchData({ types });
  
  return {
    tasks: data?.data?.tasks || [],
    skills: data?.data?.skills || [],
    goals: data?.data?.goals || [],
    stats: data?.data?.stats || null,
    profile: data?.data?.profile || null,
    isLoading,
    isError,
    error,
    errors: data?.errors
  };
}