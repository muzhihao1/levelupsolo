import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Zap } from "lucide-react";
import type { Task } from "@shared/schema";

/**
 * 快速任务创建组件
 * 跳过 AI 处理，立即创建任务
 */
export function QuickTaskCreate() {
  const [title, setTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // 使用标准 CRUD 端点，跳过 AI
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      return apiRequest("POST", "/api/crud?resource=tasks", taskData);
    },
    
    // 乐观更新 - 立即显示任务
    onMutate: async (newTask) => {
      await queryClient.cancelQueries({ queryKey: ["/api/data?type=tasks"] });
      
      const previousTasks = queryClient.getQueryData<Task[]>(["/api/data?type=tasks"]);
      
      // 创建临时任务对象
      const tempTask: Task = {
        id: -Date.now(),
        title: newTask.title,
        description: "",
        taskCategory: "todo",
        taskType: "simple",
        estimatedDuration: 30,
        difficulty: "medium",
        expReward: 20,
        requiredEnergyBalls: 2,
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
      
      // 立即更新缓存
      queryClient.setQueryData<Task[]>(["/api/data?type=tasks"], (old) => {
        if (!old) return [tempTask];
        return [tempTask, ...old];
      });
      
      return { previousTasks };
    },
    
    onError: (err, newTask, context) => {
      // 回滚
      if (context?.previousTasks) {
        queryClient.setQueryData(["/api/data?type=tasks"], context.previousTasks);
      }
      toast({
        title: "创建失败",
        description: "任务创建失败，请重试",
        variant: "destructive",
      });
    },
    
    onSuccess: (data, variables, context) => {
      // 替换临时任务
      queryClient.setQueryData<Task[]>(["/api/data?type=tasks"], (old) => {
        if (!old) return [data];
        return old.map(task => 
          task.id < 0 && task.title === variables.title ? data : task
        );
      });
      
      toast({
        title: "任务创建成功",
        description: `"${data.title}" 已添加到任务列表`,
        duration: 2000,
      });
    },
    
    onSettled: () => {
      // 后台刷新数据
      queryClient.invalidateQueries({ 
        queryKey: ["/api/data?type=tasks"],
        refetchType: "active"
      });
    }
  });

  const handleQuickCreate = async () => {
    if (!title.trim()) return;
    
    setIsCreating(true);
    
    try {
      await createTaskMutation.mutateAsync({
        title: title.trim(),
        description: "",
        taskCategory: "todo",
        taskType: "simple",
        estimatedDuration: 30,
        difficulty: "medium",
        expReward: 20,
        requiredEnergyBalls: 2,
        completed: false,
        userId: "" // 将由服务器设置
      });
      
      setTitle(""); // 清空输入
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleQuickCreate();
    }
  };

  return (
    <Card className="p-4 mb-4 bg-primary/5 border-primary/20">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Zap className="h-4 w-4" />
          <span>快速创建任务（无 AI 延迟）</span>
        </div>
        
        <div className="flex gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入任务标题，按回车快速创建..."
            disabled={isCreating}
            className="flex-1"
          />
          
          <Button
            onClick={handleQuickCreate}
            disabled={!title.trim() || isCreating}
            size="sm"
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-1" />
            快速创建
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground">
          提示：快速模式跳过 AI 分析，任务将默认创建为"支线任务"，您可以稍后手动调整分类
        </p>
      </div>
    </Card>
  );
}