import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Goal, InsertGoal } from "@shared/schema";

export function useGoals() {
  return useQuery<Goal[]>({
    queryKey: ['/api/goals'],
  });
}

export function useGoalMutations() {
  const { toast } = useToast();

  const createGoalMutation = useMutation({
    mutationFn: async (goal: InsertGoal) => {
      const response = await apiRequest('POST', '/api/goals', goal);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/skills'] });
      toast({
        title: "目标已创建",
        description: "新目标已成功添加到您的成长计划中",
      });
    }
  });

  const updateGoalMutation = useMutation({
    mutationFn: async ({ id, ...goal }: Partial<Goal> & { id: number }) => {
      const response = await apiRequest('PATCH', `/api/goals/${id}`, goal);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/skills'] });
    }
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/goals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
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