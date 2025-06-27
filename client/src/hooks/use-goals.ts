import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Goal, InsertGoal } from "@shared/schema";

export function useGoals() {
  return useQuery<Goal[]>({
    queryKey: ['/api/data?type=goals'],
  });
}

export function useGoalMutations() {
  const { toast } = useToast();

  const createGoalMutation = useMutation({
    mutationFn: async (goal: InsertGoal) => {
      const response = await apiRequest('POST', '/api/crud?resource=goals', goal);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=goals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=skills'] });
      toast({
        title: "目标已创建",
        description: "新目标已成功添加到您的成长计划中",
      });
    }
  });

  const updateGoalMutation = useMutation({
    mutationFn: async ({ id, ...goal }: Partial<Goal> & { id: number }) => {
      const response = await apiRequest('PATCH', `/api/crud?resource=goals&id=${id}`, goal);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=goals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=skills'] });
    }
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/crud?resource=goals&id=${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=goals'] });
      toast({
        title: "目标已删除",
        description: "目标已成功从您的计划中移除",
      });
    }
  });

  return {
    createGoalMutation,
    updateGoalMutation,
    deleteGoalMutation
  };
}