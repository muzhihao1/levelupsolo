import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Task } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface CreateTaskInput {
  title: string;
  description?: string;
  taskCategory?: "goal" | "todo" | "habit";
  estimatedDuration?: number;
  difficulty?: "easy" | "medium" | "hard";
  expReward?: number;
}

/**
 * Optimized hook for fast task creation
 * Uses optimistic updates and quick creation endpoint
 */
export function useOptimizedTaskCreation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      // Use quick creation endpoint if available
      try {
        const response = await apiRequest("POST", "/api/tasks/quick-create", input);
        return response.task;
      } catch (error) {
        // Fallback to regular endpoint
        return apiRequest("POST", "/api/crud?resource=tasks", {
          ...input,
          completed: false,
          userId: "", // Will be set by server
          requiredEnergyBalls: Math.ceil((input.estimatedDuration || 30) / 15)
        });
      }
    },
    
    // Optimistic update - show task immediately
    onMutate: async (newTask) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/data?type=tasks"] });

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData<Task[]>(["/api/data?type=tasks"]);

      // Create optimistic task with temporary ID
      const optimisticTask: Task = {
        id: -Date.now(), // Temporary negative ID
        title: newTask.title,
        description: newTask.description || "",
        taskCategory: newTask.taskCategory || "todo",
        taskType: "simple",
        estimatedDuration: newTask.estimatedDuration || 30,
        difficulty: newTask.difficulty || "medium",
        expReward: newTask.expReward || 20,
        requiredEnergyBalls: Math.ceil((newTask.estimatedDuration || 30) / 15),
        completed: false,
        userId: "temp",
        skillId: null,
        completedAt: null,
        parentGoalId: null,
        parentTaskId: null,
        createdAt: new Date(),
        dueDate: null,
        tags: null,
        order: 0,
        lastCompletedAt: null,
        recurrencePattern: null,
        nextDueDate: null
      } as Task;

      // Optimistically update cache
      queryClient.setQueryData<Task[]>(["/api/data?type=tasks"], (old) => {
        if (!old) return [optimisticTask];
        return [optimisticTask, ...old];
      });

      // Return context for rollback
      return { previousTasks };
    },
    
    // Replace optimistic task with real one
    onSuccess: (data, variables, context) => {
      queryClient.setQueryData<Task[]>(["/api/data?type=tasks"], (old) => {
        if (!old) return [data];
        
        // Replace temporary task with real one
        return old.map(task => 
          task.id < 0 && task.title === variables.title ? data : task
        );
      });

      toast({
        title: "任务创建成功",
        description: `"${data.title}" 已添加到任务列表`,
        duration: 2000
      });
    },
    
    // Rollback on error
    onError: (err, newTask, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(["/api/data?type=tasks"], context.previousTasks);
      }
      
      toast({
        title: "创建失败",
        description: "无法创建任务，请重试",
        variant: "destructive"
      });
    },
    
    // Always refetch after mutation
    onSettled: () => {
      // Refetch in background to ensure consistency
      queryClient.invalidateQueries({ 
        queryKey: ["/api/data?type=tasks"],
        refetchType: "active" // Only refetch if query is active
      });
    }
  });
}

/**
 * Hook for batch task creation
 */
export function useBatchTaskCreation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (tasks: CreateTaskInput[]) => {
      return apiRequest("POST", "/api/tasks/batch-create", { tasks });
    },
    
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/data?type=tasks"] });
      
      toast({
        title: "批量创建成功",
        description: `成功创建 ${data.count} 个任务`,
        duration: 2000
      });
    },
    
    onError: () => {
      toast({
        title: "批量创建失败",
        description: "无法创建任务，请重试",
        variant: "destructive"
      });
    }
  });
}