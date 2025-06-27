import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Task, InsertTask } from "@shared/schema";

export function useTasks() {
  return useQuery<Task[]>({
    queryKey: ['/api/data?type=tasks'],
  });
}

export function useTaskMutations() {
  const { toast } = useToast();

  const createTaskMutation = useMutation({
    mutationFn: async (task: InsertTask) => {
      const response = await apiRequest('POST', '/api/tasks', task);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/skills'] });
      toast({
        title: "任务已添加",
        description: "新任务已成功创建",
      });
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, ...task }: Partial<Task> & { id: number }) => {
      const response = await apiRequest('PATCH', `/api/tasks/${id}`, task);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/skills'] });
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: "任务已删除",
        description: "任务已成功删除",
      });
    }
  });

  return {
    createTaskMutation,
    updateTaskMutation,
    deleteTaskMutation
  };
}