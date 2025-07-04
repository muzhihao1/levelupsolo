import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Task } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

/**
 * 优化的 AI 任务创建 Hook
 * 使用乐观更新让用户感觉更快
 */
export function useAITaskOptimistic() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [stage, setStage] = useState<string>("");

  return useMutation({
    mutationFn: async (description: string) => {
      // 模拟进度更新
      setStage("正在分析任务...");
      
      const response = await apiRequest("POST", "/api/tasks/intelligent-create", {
        description
      });
      
      return response;
    },
    
    // 乐观更新 - 立即显示临时任务
    onMutate: async (description) => {
      setStage("准备创建任务...");
      
      // 取消正在进行的查询
      await queryClient.cancelQueries({ queryKey: ["/api/data?type=tasks"] });
      
      // 保存当前数据快照
      const previousTasks = queryClient.getQueryData<Task[]>(["/api/data?type=tasks"]);
      
      // 创建乐观任务（带特殊标记）
      const optimisticTask: Task = {
        id: -Date.now(), // 负数ID表示临时
        title: description.substring(0, 50) + "...",
        description: "🤖 AI 正在智能分析中...",
        taskCategory: "todo",
        taskType: "simple",
        estimatedDuration: 30,
        difficulty: "medium",
        expReward: 0, // 显示为待定
        requiredEnergyBalls: 2,
        completed: false,
        userId: "temp",
        skillId: null,
        completedAt: null,
        parentGoalId: null,
        parentTaskId: null,
        createdAt: new Date(),
        dueDate: null,
        tags: ["AI处理中"],
        order: -1, // 显示在最前面
        lastCompletedAt: null,
        recurrencePattern: null,
        nextDueDate: null
      } as Task;
      
      // 立即更新UI
      queryClient.setQueryData<Task[]>(["/api/data?type=tasks"], (old) => {
        if (!old) return [optimisticTask];
        return [optimisticTask, ...old];
      });
      
      // 显示进度通知
      toast({
        title: "🤖 AI 正在分析",
        description: "任务已创建，正在智能分类...",
        duration: 2000,
      });
      
      return { previousTasks, tempId: optimisticTask.id };
    },
    
    // 成功后替换临时任务
    onSuccess: (data, description, context) => {
      setStage("");
      
      if (data.task) {
        // 替换临时任务为真实任务
        queryClient.setQueryData<Task[]>(["/api/data?type=tasks"], (old) => {
          if (!old) return [data.task];
          
          // 移除临时任务，添加真实任务
          return old.map(task => 
            task.id === context?.tempId ? data.task : task
          );
        });
        
        // 显示成功通知（带分析结果）
        const { aiAnalysis } = data;
        toast({
          title: "✅ 任务创建成功",
          description: (
            <div className="space-y-1">
              <p>{data.task.title}</p>
              {aiAnalysis && (
                <p className="text-xs opacity-80">
                  类型: {getCategoryName(aiAnalysis.category)} | 
                  技能: {aiAnalysis.skill || "通用"} | 
                  难度: {getDifficultyName(aiAnalysis.difficulty)}
                </p>
              )}
            </div>
          ),
          duration: 3000,
        });
      }
    },
    
    // 错误时回滚
    onError: (error, description, context) => {
      setStage("");
      
      // 回滚到之前的状态
      if (context?.previousTasks) {
        queryClient.setQueryData(["/api/data?type=tasks"], context.previousTasks);
      }
      
      toast({
        title: "❌ 创建失败",
        description: error.message || "AI 分析失败，请重试",
        variant: "destructive",
      });
    },
    
    // 完成后刷新数据
    onSettled: () => {
      // 后台静默刷新，确保数据一致性
      queryClient.invalidateQueries({ 
        queryKey: ["/api/data?type=tasks"],
        refetchType: "active"
      });
    }
  });
}

// 辅助函数
function getCategoryName(category: string): string {
  const names: Record<string, string> = {
    goal: "主线任务",
    todo: "支线任务",
    habit: "每日习惯"
  };
  return names[category] || category;
}

function getDifficultyName(difficulty: string): string {
  const names: Record<string, string> = {
    easy: "简单",
    medium: "中等",
    hard: "困难"
  };
  return names[difficulty] || difficulty;
}

/**
 * 使用示例：
 * 
 * const createTask = useAITaskOptimistic();
 * 
 * const handleCreate = () => {
 *   createTask.mutate("学习 React 新特性");
 * };
 * 
 * // UI 会立即显示临时任务，用户无需等待
 */