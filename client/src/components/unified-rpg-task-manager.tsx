import { useState, useEffect, useRef, memo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Plus, CheckCircle, Circle, Zap, Flame, Target, Trash2, Clock, Play, Pause, RotateCcw, Brain, Crown, X, Battery, Trophy } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useFilteredTasks } from "@/hooks/use-filtered-tasks";
import { useBatchDataWithSelectors } from "@/hooks/use-batch-data";
import type { Task, InsertTask, Skill } from "@shared/schema";

interface MicroTask {
  id: number;
  taskId: number;
  title: string;
  description?: string;
  completed: boolean;
  duration: number;
  expReward: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

// 任务分类和类型定义
const TASK_CATEGORIES = {
  goal: { name: "目标", icon: "🎯", color: "blue", description: "长期主线目标任务" },
  todo: { name: "待办", icon: "✅", color: "purple", description: "一次性任务，完成后消除" },
  habit: { name: "习惯", icon: "🔄", color: "green", description: "可重复完成，建立长期习惯" }
};

const DIFFICULTY_LEVELS = {
  trivial: { name: "微不足道", xp: 1, color: "gray" },
  easy: { name: "简单", xp: 5, color: "green" },
  medium: { name: "中等", xp: 10, color: "yellow" },
  hard: { name: "困难", xp: 15, color: "red" }
};

// 能量状态描述函数
const getEnergyStatus = (current: number, max: number): string => {
  const percentage = (current / max) * 100;
  
  if (percentage >= 80) return "精力充沛，可以挑战任何任务！";
  if (percentage >= 60) return "状态良好，适合中等强度任务";
  if (percentage >= 40) return "稍有疲惫，建议做简单任务";
  if (percentage >= 20) return "能量不足，需要适当休息";
  if (percentage > 0) return "极度疲惫，强烈建议休息";
  return "能量耗尽，必须休息恢复";
};

interface TaskCardProps {
  task: Task;
  onComplete: (taskId: number) => void;
  onDelete: (taskId: number) => void;
  onStartPomodoro?: (taskId: number) => void;
  pomodoroState?: {
    taskId: number | null;
    isRunning: boolean;
    timeLeft: number;
    totalTime: number;
    isBreak: boolean;
  };
  onPausePomodoro?: () => void;
  onResumePomodoro?: () => void;
  onResetPomodoro?: () => void;
  formatTime?: (seconds: number) => string;
  userStats?: any;
  skills?: Skill[];
  getIconEmoji?: (fontAwesomeClass: string) => string;
}

const TaskCard = memo(function TaskCard({ 
  task, 
  onComplete, 
  onDelete, 
  onStartPomodoro,
  pomodoroState,
  onPausePomodoro,
  onResumePomodoro,
  onResetPomodoro,
  formatTime,
  userStats,
  skills,
  getIconEmoji = (icon: string) => '⭐'
}: TaskCardProps) {
  const category = TASK_CATEGORIES[task.taskCategory as keyof typeof TASK_CATEGORIES];
  const difficulty = DIFFICULTY_LEVELS[task.difficulty as keyof typeof DIFFICULTY_LEVELS];
  
  const isCurrentPomodoroTask = pomodoroState?.taskId === task.id;
  const showPomodoroControls = task.taskCategory === "todo" && !task.completed;
  
  const requiredEnergy = task.requiredEnergyBalls || 1;
  const hasEnoughEnergy = !userStats || userStats.energyBalls >= requiredEnergy;
  const canCompleteTask = task.completed || hasEnoughEnergy;
  
  return (
    <Card className="bg-card border-border hover:shadow-md transition-all">
      <CardContent className="p-4">
        {/* 顶部：完成按钮 + 任务信息 + 操作按钮 - 移动优化 */}
        <div className="flex items-start gap-3 mb-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              console.log('=== TaskCard button clicked ===', { 
                taskId: task.id, 
                title: task.title,
                canCompleteTask,
                completed: task.completed,
                hasEnoughEnergy,
                requiredEnergy,
                userStats: userStats?.energyBalls
              });
              onComplete(task.id);
            }}
            disabled={!canCompleteTask}
            className={`mt-1 h-10 w-10 p-0 rounded-full touch-manipulation ${
              task.completed 
                ? "text-green-600 bg-green-100" 
                : canCompleteTask 
                  ? "text-muted-foreground hover:text-green-600 hover:bg-green-100" 
                  : "text-gray-400 bg-gray-100 cursor-not-allowed opacity-50"
            }`}
          >
            {task.completed ? <CheckCircle className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
          </Button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className={`font-semibold text-base leading-tight ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                {task.title}
              </h3>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Badge variant="outline" className="text-primary border-primary/30 text-xs px-2 py-1">
                  {category.icon} {category.name}
                </Badge>
                {/* Micro Tasks Button - only for main tasks (goal-related) */}
                {!task.completed && task.taskCategory === "goal" && (
                  <MicroTasksButton taskId={task.id} />
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(task.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0 rounded-lg touch-manipulation"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {task.description && (
              <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{task.description}</p>
            )}
            
            {/* 关联技能显示 */}
            {task.skillId && skills && (
              <div className="flex items-center gap-2 mb-4 p-2 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200/50 dark:border-purple-700/50">
                <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                <div className="flex-1">
                  {(() => {
                    const linkedSkill = skills.find((s: Skill) => s.id === task.skillId);
                    if (linkedSkill) {
                      return (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                              {getIconEmoji(linkedSkill.icon)} {linkedSkill.name}
                            </span>
                            <span className="text-xs text-purple-600 dark:text-purple-400">
                              Lv.{linkedSkill.level}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
                            <Zap className="h-3 w-3" />
                            <span>+{task.expReward || 20} XP</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            )}
            
            {/* 技能标签 (备用显示) */}
            {(!task.skillId && task.tags && task.tags.length > 0) && (
              <div className="flex items-center gap-2 flex-wrap mb-4">
                <Brain className="h-4 w-4 text-secondary flex-shrink-0" />
                {task.tags.map((skill: string, index: number) => (
                  <Badge key={index} variant="outline" className="text-xs text-secondary border-secondary/30 bg-secondary/10">
                    {skill}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* 底部：奖励信息 + 难度 + 习惯连击 + 能量球需求 - 移动优化 */}
        <div className="flex flex-col gap-3 py-3 border-t border-border">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-primary">
              <Zap className="h-4 w-4" />
              <span className="font-medium text-sm">+{task.expReward || difficulty.xp} XP</span>
            </div>
            {/* 能量球需求显示 */}
            <div className={`flex items-center gap-1 ${
              hasEnoughEnergy ? 'text-accent' : 'text-red-500'
            }`}>
              {Array.from({ length: requiredEnergy }).map((_, i) => (
                <span key={i} className="text-sm">🔵</span>
              ))}
              <span className="font-medium text-sm ml-1">
                {requiredEnergy * 15}分钟
              </span>
              {!hasEnoughEnergy && (
                <span className="text-xs text-red-500 ml-1">
                  (能量不足)
                </span>
              )}
            </div>
            {/* 习惯连击显示 */}
            {task.taskCategory === "habit" && (task.habitStreak || 0) > 0 && (
              <div className="flex items-center gap-2 text-secondary">
                <Flame className="h-4 w-4" />
                <span className="font-medium text-sm">{task.habitStreak}连击</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {task.taskCategory === "habit" && (
              <Badge variant="outline" className="bg-secondary/20 text-secondary border-secondary/30 text-xs px-2 py-1">
                🔄 每日习惯
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs px-2 py-1">
              {difficulty.name}
            </Badge>
          </div>
        </div>

        {/* 番茄钟启动按钮 - 移动优化 */}
        {showPomodoroControls && !isCurrentPomodoroTask && (
          <div className="pt-3 mt-3 border-t border-border">
            <Button 
              size="sm" 
              onClick={() => onStartPomodoro?.(task.id)}
              className="w-full h-11 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700 text-white border-0 transition-all touch-manipulation shadow-md"
              style={{ backgroundColor: '#1d4ed8' }}
            >
              <div className="flex items-center gap-2">
                <div className="text-base">⚔️</div>
                <div className="text-left">
                  <div className="text-sm font-bold text-white">挑战Boss</div>
                  <div className="text-xs font-medium text-blue-100">25分钟专注战斗</div>
                </div>
              </div>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default function UnifiedRPGTaskManager() {
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    category: "todo" as keyof typeof TASK_CATEGORIES,
    difficulty: "medium" as keyof typeof DIFFICULTY_LEVELS
  });
  const [activeTab, setActiveTab] = useState("side"); // Default to side quests tab
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 判断任务是否是今天完成的
  const isCompletedToday = (task: Task): boolean => {
    if (!task.completed || !task.completedAt) return false;
    const completedDate = new Date(task.completedAt);
    const today = new Date();
    return completedDate.toDateString() === today.toDateString();
  };

  // 将Font Awesome图标类名转换为emoji
  const getIconEmoji = (fontAwesomeClass: string): string => {
    const iconMap: { [key: string]: string } = {
      'fas fa-target': '🎯',
      'fas fa-star': '⭐',
      'fas fa-book-open': '📖',
      'fas fa-glasses': '👓',
      'fas fa-brain': '🧠',
      'fas fa-lightbulb': '💡',
      'fas fa-search': '🔍',
      'fas fa-flask': '🧪',
      'fas fa-chart-line': '📈',
      'fas fa-microscope': '🔬',
      'fas fa-edit': '✏️',
      'fas fa-pen': '🖊️',
      'fas fa-file-alt': '📄',
      'fas fa-book': '📚',
      'fas fa-palette': '🎨',
      'fas fa-paint-brush': '🖌️',
      'fas fa-magic': '✨',
      'fas fa-image': '🖼️',
      'fas fa-code': '💻',
      'fas fa-laptop': '💻',
      'fas fa-bug': '🐛',
      'fas fa-cogs': '⚙️',
      'fas fa-users': '👥',
      'fas fa-crown': '👑',
      'fas fa-calendar': '📅',
      'fas fa-clipboard': '📋',
      'fas fa-comments': '💬',
      'fas fa-microphone': '🎤',
      'fas fa-heart': '❤️',
      'fas fa-handshake': '🤝',
      'fas fa-graduation-cap': '🎓',
      'fas fa-university': '🏛️',
      'fas fa-atom': '⚛️',
      'fas fa-tools': '🔧'
    };
    
    return iconMap[fontAwesomeClass] || '⭐';
  };
  
  // 番茄钟状态
  const [pomodoro, setPomodoro] = useState({
    taskId: null as number | null,
    isRunning: false,
    timeLeft: 25 * 60, // 25分钟
    totalTime: 25 * 60,
    isBreak: false
  });

  const [isPomodoroDialogOpen, setIsPomodoroDialogOpen] = useState(false);


  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Use batch data hook to fetch all data in a single request
  const { 
    tasks, 
    skills, 
    goals, 
    stats: userStats, 
    isLoading, 
    isError, 
    error,
    errors 
  } = useBatchDataWithSelectors(['tasks', 'skills', 'goals', 'stats']);
  
  // Helper function to invalidate all data queries
  const invalidateAllData = () => {
    // Invalidate both batch and individual endpoints for compatibility
    queryClient.invalidateQueries({ queryKey: ['/api/data/batch'] });
    queryClient.invalidateQueries({ queryKey: ['/api/data?type=tasks'] });
    queryClient.invalidateQueries({ queryKey: ['/api/data?type=stats'] });
    queryClient.invalidateQueries({ queryKey: ['/api/data?type=skills'] });
    queryClient.invalidateQueries({ queryKey: ['/api/data?type=goals'] });
  };
  
  // Log errors only
  useEffect(() => {
    if (isError) {
      console.error('Error fetching data:', error);
    }
    if (errors) {
      console.error('Batch data errors:', errors);
    }
  }, [isError, error, errors]);

  // Silent reset mutation for automatic daily reset
  const silentResetHabitsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/tasks/reset-daily-habits");
    },
    onSuccess: () => {
      // Silently refresh data without showing notification
      queryClient.invalidateQueries({ queryKey: ["/api/data?type=tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/data?type=stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/data?type=profile"] });
    },
    onError: (error) => {
      console.error("Silent habit reset failed:", error);
    },
  });

  // Silent daily habit reset
  useEffect(() => {
    const lastResetDate = localStorage.getItem('lastHabitReset');
    const today = new Date().toDateString();
    
    if (lastResetDate !== today) {
      // Silently reset habits for new day without showing toast
      silentResetHabitsMutation.mutate();
      localStorage.setItem('lastHabitReset', today);
    }
  }, [silentResetHabitsMutation]);

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: Omit<InsertTask, 'userId'>) => {
      const difficulty = DIFFICULTY_LEVELS[taskData.difficulty as keyof typeof DIFFICULTY_LEVELS];
      const response = await apiRequest("POST", "/api/tasks", {
        ...taskData,
        expReward: difficulty.xp,
        requiredEnergyBalls: Math.ceil((taskData.estimatedDuration || 25) / 15), // 15 minutes per energy ball
        taskCategory: taskData.taskCategory || "todo"
      });
      const result = await response.json();
      console.log('=== Task creation API response ===');
      console.log('Created task:', result);
      return result;
    },
    onMutate: async (taskData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/data?type=tasks"] });
      
      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData(["/api/data?type=tasks"]);
      
      // Optimistically update to the new value
      const difficulty = DIFFICULTY_LEVELS[taskData.difficulty as keyof typeof DIFFICULTY_LEVELS];
      const optimisticTask = {
        id: Date.now(), // Temporary ID
        userId: "temp",
        title: taskData.title,
        description: taskData.description || null,
        completed: false,
        taskCategory: taskData.taskCategory || "todo",
        difficulty: taskData.difficulty,
        expReward: difficulty.xp,
        requiredEnergyBalls: Math.ceil((taskData.estimatedDuration || 25) / 15),
        estimatedDuration: taskData.estimatedDuration || 25,
        skillId: null,
        order: 0,
        tags: [],
        skills: [],
        habitStreak: 0,
        habitValue: 0
      };
      
      queryClient.setQueryData(["/api/data?type=tasks"], (old: any[]) => 
        old ? [...old, optimisticTask] : [optimisticTask]
      );
      
      // Clear form immediately
      setNewTask({ title: "", description: "", category: "todo", difficulty: "medium" });
      
      return { previousTasks };
    },
    onError: (err, taskData, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(["/api/data?type=tasks"], context.previousTasks);
      }
      // Restore form data
      setNewTask({
        title: taskData.title,
        description: taskData.description || "",
        category: (taskData.taskCategory as "todo" | "goal" | "habit") || "todo",
        difficulty: (taskData.difficulty as "medium" | "trivial" | "easy" | "hard") || "medium"
      });
      // Show error message
      console.error("Task creation error:", err);
      toast({
        title: "创建任务失败",
        description: "无法创建任务，请检查网络连接后重试",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "任务创建成功",
        description: "新任务已添加到您的任务列表",
      });
    },
    onSettled: (data, error, variables, context) => {
      console.log('=== Task creation settled ===');
      console.log('Success:', !!data && !error);
      console.log('Response data:', data);
      console.log('Error:', error);
      
      // Always refetch after error or success
      console.log('Invalidating tasks query...');
      queryClient.invalidateQueries({ 
        queryKey: ["/api/data?type=tasks"],
        refetchType: 'all' // Force refetch all matching queries
      }).then(() => {
        console.log('Tasks query invalidation complete');
      }).catch((err) => {
        console.error('Failed to invalidate tasks query:', err);
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Task> }) => {
      return apiRequest("PATCH", `/api/tasks/${id}`, updates);
    },
    onMutate: async ({ id, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/data?type=tasks"] });
      await queryClient.cancelQueries({ queryKey: ["/api/data?type=stats"] });
      
      // Snapshot the previous values
      const previousTasks = queryClient.getQueryData(["/api/data?type=tasks"]);
      const previousStats = queryClient.getQueryData(["/api/data?type=stats"]);
      
      // Optimistically update task
      queryClient.setQueryData(["/api/data?type=tasks"], (old: Task[]) => 
        old ? old.map(task => 
          task.id === id ? { ...task, ...updates } : task
        ) : []
      );
      
      // Note: We no longer do optimistic updates for user stats (energy balls, experience)
      // The backend will handle energy consumption and experience rewards properly
      
      return { previousTasks, previousStats };
    },
    onError: (err, { id, updates }, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(["/api/data?type=tasks"], context.previousTasks);
      }
      if (context?.previousStats) {
        queryClient.setQueryData(["/api/data?type=stats"], context.previousStats);
      }
    },
    onSuccess: (data, { id, updates }) => {
      // Show success toast with energy ball info when completing tasks
      if (updates.completed) {
        const task = tasks.find(t => t.id === id);
        if (task) {
          const energyCost = task.requiredEnergyBalls || 1;
          toast({
            title: "任务完成！",
            description: `获得 ${task.expReward || 20} 经验值，消耗 ${energyCost} 个能量球`,
          });
        }
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ["/api/data?type=tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/data?type=stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-logs"] }); // Refresh activity logs
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/data?type=tasks"] });
      
      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData(["/api/data?type=tasks"]);
      
      // Optimistically remove the task
      queryClient.setQueryData(["/api/data?type=tasks"], (old: Task[]) => 
        old ? old.filter(task => task.id !== id) : []
      );
      
      return { previousTasks };
    },
    onError: (err, id, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(["/api/data?type=tasks"], context.previousTasks);
      }
      toast({
        title: "删除失败",
        description: "任务删除失败，请重试",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      // Only invalidate on success to avoid flicker
      queryClient.invalidateQueries({ queryKey: ["/api/data?type=tasks"] });
      toast({
        title: "任务已删除",
        description: "任务已成功删除",
      });
    },
  });

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) return;
    
    setIsAnalyzing(true);
    
    try {
      console.log("Sending AI task creation request with:", { description: newTask.title });
      
      const response = await apiRequest("POST", "/api/tasks/intelligent-create", {
        description: newTask.title
      });
      
      console.log("AI task creation response:", response);
      
      // The response should already be parsed by apiRequest
      const result = response;
      
      if (result.task) {
        
        // Clear form
        setNewTask({ title: "", description: "", category: "todo", difficulty: "medium" });
        
        // Show success toast with category info
        const categoryName = TASK_CATEGORIES[result.task.taskCategory as keyof typeof TASK_CATEGORIES]?.name || result.task.taskCategory;
        toast({
          title: "任务创建成功",
          description: `已创建${categoryName}：${result.task.title}`,
        });
        
        // Switch to the correct tab if needed
        if (result.task.taskCategory === 'todo' && activeTab !== 'side') {
          setActiveTab('side');
        } else if (result.task.taskCategory === 'habit' && activeTab !== 'habit') {
          setActiveTab('habit');
        } else if (result.task.taskCategory === 'goal' && activeTab !== 'main') {
          setActiveTab('main');
        }
        
        // Optimized cache update - just invalidate to trigger background refetch
        await queryClient.invalidateQueries({ 
          queryKey: ["/api/data?type=tasks"],
          refetchType: 'active' // Only refetch if the query is actively being used
        });
      }
    } catch (error: any) {
      console.error("Error creating intelligent task:", error);
      
      // Extract error message from response if available
      let errorMessage = "任务创建失败，请重试";
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "创建失败",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleToggleComplete = async (taskId: number) => {
    console.log('=== handleToggleComplete called ===', { taskId });
    
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      console.log('Task not found:', taskId);
      return;
    }
    
    console.log('Task found:', { 
      id: task.id, 
      title: task.title, 
      category: task.taskCategory, 
      completed: task.completed,
      requiredEnergyBalls: task.requiredEnergyBalls
    });
    
    // 检查能量球是否足够（仅在完成任务时检查）
    if (!task.completed && userStats) {
      const requiredEnergy = task.requiredEnergyBalls || 1;
      if (userStats.energyBalls < requiredEnergy) {
        console.log('Not enough energy:', { required: requiredEnergy, current: userStats.energyBalls });
        toast({
          title: "能量不足",
          description: `完成此任务需要 ${requiredEnergy} 个能量球，但您只有 ${userStats.energyBalls} 个`,
          variant: "destructive",
        });
        return;
      }
    }
    
    // For habits, use the simple-complete endpoint directly
    if (task.taskCategory === 'habit' && !task.completed) {
      console.log('Processing habit completion...');
      try {
        // Use the simple-complete endpoint directly for habits
        console.log('Calling simple-complete endpoint...');
        const result = await apiRequest('POST', `/api/tasks/${taskId}/simple-complete`);
        console.log('Simple-complete response:', result);
        
        // Check if the response indicates success
        if (result && result.success) {
          console.log('Habit completed successfully, refreshing data...');
          
          // Update the task in the cache immediately
          queryClient.setQueryData(["/api/data?type=tasks"], (oldData: Task[] | undefined) => {
            if (!oldData) return oldData;
            return oldData.map(t => 
              t.id === taskId ? { ...t, completed: true, completedAt: new Date().toISOString() } : t
            );
          });
          
          // Invalidate only affected queries - habits don't directly affect skills
          queryClient.invalidateQueries({ queryKey: ["/api/data?type=tasks"] });
          queryClient.invalidateQueries({ queryKey: ["/api/data?type=stats"] });
          
          console.log('Data refresh complete');
          
          toast({
            title: "习惯完成！",
            description: `获得 ${task.expReward || 20} 经验值`,
          });
        } else {
          console.error('Unexpected response format:', result);
          throw new Error('Invalid response from server');
        }
      } catch (error: any) {
        console.error('Simple-complete endpoint failed:', error);
        
        // Try smart-complete as fallback
        try {
          console.log('Trying smart-complete endpoint as fallback...');
          const smartResult = await apiRequest('POST', `/api/tasks/${taskId}/smart-complete`);
          console.log('Smart-complete response:', smartResult);
          
          if (smartResult.debug) {
            console.log('Smart complete debug info:', smartResult.debug);
          }
          
          // Update the task in the cache immediately
          queryClient.setQueryData(["/api/data?type=tasks"], (oldData: Task[] | undefined) => {
            if (!oldData) return oldData;
            return oldData.map(t => 
              t.id === taskId ? { ...t, completed: true, completedAt: new Date().toISOString() } : t
            );
          });
          
          // Invalidate only affected queries - habits don't directly affect skills
          queryClient.invalidateQueries({ queryKey: ["/api/data?type=tasks"] });
          queryClient.invalidateQueries({ queryKey: ["/api/data?type=stats"] });
          
          console.log('Data refresh complete (smart mode)');
          
          toast({
            title: "习惯完成！",
            description: `获得 ${task.expReward || 20} 经验值（智能模式）`,
          });
        } catch (smartError) {
          console.error('All endpoints failed:', smartError);
          toast({
            title: "完成失败",
            description: "无法完成习惯，请检查数据库连接",
            variant: "destructive",
          });
        }
      }
    } else {
      console.log('Processing non-habit task or uncompleting...');
      // For non-habits or uncompleting, use normal mutation
      updateTaskMutation.mutate({
        id: taskId,
        updates: { 
          completed: !task.completed,
          completedAt: !task.completed ? new Date() : null
        }
      });
    }
  };

  const handleDeleteTask = (taskId: number) => {
    deleteTaskMutation.mutate(taskId);
  };

  // Manual reset mutation with notification
  const resetHabitsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/tasks/reset-daily-habits");
    },
    onSuccess: (data: any) => {
      toast({
        title: "每日重置完成",
        description: data.energyBallsRestored ? 
          `已重置 ${data.resetCount} 个习惯任务，能量球已恢复` : 
          `已重置 ${data.resetCount} 个习惯任务`,
      });
      // 刷新所有相关数据
      queryClient.invalidateQueries({ queryKey: ["/api/data?type=tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/data?type=stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/data?type=profile"] });
    },
    onError: () => {
      toast({
        title: "重置失败",
        description: "每日重置失败，请稍后重试",
        variant: "destructive",
      });
    },
  });

  const resetHabits = () => {
    resetHabitsMutation.mutate();
  };

  // Restore energy balls mutation
  const restoreEnergyMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/debug/restore-energy");
    },
    onSuccess: (data: any) => {
      console.log('Energy restored:', data);
      // Refresh all data
      queryClient.refetchQueries({ queryKey: ["/api/data?type=stats"] });
      queryClient.refetchQueries({ queryKey: ["/api/data?type=tasks"] });
      
      toast({
        title: "能量已恢复！",
        description: data.message || `能量球已恢复到 ${data.currentEnergy || 18}`,
      });
    },
    onError: (error) => {
      console.error('Failed to restore energy:', error);
      toast({
        title: "恢复失败",
        description: "无法恢复能量球，请稍后重试",
        variant: "destructive",
      });
    },
  });

  // 关闭番茄钟弹窗但保持状态
;



  // 专注森林番茄钟功能 - 基于时间戳的精确计时
  const timerStartRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!pomodoro.isRunning) {
      timerStartRef.current = null;
      return;
    }
    
    // 开始计时时记录时间戳
    if (!timerStartRef.current) {
      timerStartRef.current = Date.now();
      pausedTimeRef.current = pomodoro.totalTime - pomodoro.timeLeft; // 已经消耗的时间
    }
    
    const updateTimer = () => {
      if (!timerStartRef.current) return;
      
      const now = Date.now();
      const runningElapsed = Math.floor((now - timerStartRef.current) / 1000);
      const totalElapsed = pausedTimeRef.current + runningElapsed;
      const newTimeLeft = Math.max(0, pomodoro.totalTime - totalElapsed);
      
      setPomodoro(prev => {
        if (newTimeLeft !== prev.timeLeft) {
          if (newTimeLeft <= 0 && prev.timeLeft > 0) {
            // 计时器完成，处理结束逻辑
            if (!prev.isBreak && prev.taskId) {
              // 检查是否是目标任务，如果是则发放奖励
              const isGoalTask = goals.some(goal => goal.id === prev.taskId);
              
              if (isGoalTask) {
                // 目标番茄钟完成，发放奖励
                apiRequest("POST", `/api/goals/${prev.taskId}/pomodoro-complete`)
                  .then((reward: any) => {
                    console.log("🎉 主线任务番茄钟完成！", reward);
                    // 显示奖励提示
                    if (reward.expGained) {
                      console.log(`💎 获得奖励: +${reward.expGained} EXP`);
                    }
                    // 刷新用户数据
                    queryClient.invalidateQueries({ queryKey: ["/api/data?type=stats"] });
                    queryClient.invalidateQueries({ queryKey: ["/api/data?type=skills"] });
                  })
                  .catch(error => console.error("发放目标番茄钟奖励失败:", error));
              }
              
              // 显示Boss击败完成提示
              const completionMessage = "👑 恭喜！成功击败Boss！获得额外经验值和战利品！";
              console.log(completionMessage);
            }
            
            // 重置计时器引用
            timerStartRef.current = null;
            pausedTimeRef.current = 0;
            
            // 返回新状态：停止计时器并切换到休息/工作状态
            return {
              ...prev,
              isRunning: false,
              isBreak: !prev.isBreak,
              timeLeft: prev.isBreak ? 25 * 60 : 5 * 60,
              totalTime: prev.isBreak ? 25 * 60 : 5 * 60
            };
          }
          
          return {
            ...prev,
            timeLeft: newTimeLeft
          };
        }
        return prev;
      });
    };
    
    const interval = setInterval(updateTimer, 100); // 更频繁更新以确保精确度
    
    return () => clearInterval(interval);
  }, [pomodoro.isRunning, pomodoro.totalTime, goals, queryClient]);

  const startPomodoro = (taskId: number) => {
    setPomodoro({
      taskId,
      isRunning: true,
      timeLeft: 25 * 60,
      totalTime: 25 * 60,
      isBreak: false
    });
    setIsPomodoroDialogOpen(true);
  };

  const pausePomodoro = () => {
    // 暂停时保存已消耗的时间
    if (timerStartRef.current) {
      const now = Date.now();
      const runningElapsed = Math.floor((now - timerStartRef.current) / 1000);
      pausedTimeRef.current += runningElapsed;
      timerStartRef.current = null;
    }
    setPomodoro(prev => ({ ...prev, isRunning: false }));
  };

  const resumePomodoro = () => {
    setPomodoro(prev => ({ ...prev, isRunning: true }));
  };

  const closePomodoroDialog = () => {
    setIsPomodoroDialogOpen(false);
  };

  const resetPomodoro = () => {
    // 重置计时器引用
    timerStartRef.current = null;
    pausedTimeRef.current = 0;
    
    setPomodoro({
      taskId: null,
      isRunning: false,
      timeLeft: 25 * 60,
      totalTime: 25 * 60,
      isBreak: false
    });
    setIsPomodoroDialogOpen(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 使用优化的任务过滤Hook
  const { filteredTasks: goalTasks } = useFilteredTasks({
    tasks,
    activeTab: 'main',
    searchQuery: ''
  });

  const { filteredTasks: sideTasks } = useFilteredTasks({
    tasks,
    activeTab: 'side',
    searchQuery: ''
  });

  const { filteredTasks: habitTasks } = useFilteredTasks({
    tasks,
    activeTab: 'habit',
    searchQuery: ''
  });

  const { filteredTasks: allTasks, taskStats } = useFilteredTasks({
    tasks,
    activeTab: activeTab === 'all' ? 'all' : activeTab,
    searchQuery: ''
  });
  

  // Special handling for habits - reset completed habits from previous days
  const habits = habitTasks.map(habit => {
    const today = new Date().toDateString();
    // Use completedAt instead of non-existent lastCompletedDate
    const completedDate = habit.completedAt ? new Date(habit.completedAt).toDateString() : null;
    
    // If habit was completed on a previous day, it should be available again today
    if (habit.completed && completedDate && completedDate !== today) {
      return {
        ...habit,
        completed: false
      };
    }
    
    return habit;
  });
  
  const todos = sideTasks; // Side tasks are equivalent to todos
  const allFilteredTasks = allTasks;
  const completedToday = allFilteredTasks.filter(task => 
    task.completed && task.completedAt && 
    new Date(task.completedAt).toDateString() === new Date().toDateString()
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background space-y-3 md:space-y-6 px-4 md:px-6 py-6">
      {/* 标题和统计 - 移动优化 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <span className="text-xl md:text-2xl">⚔️</span>
            RPG任务冒险
          </h2>
          <p className="text-sm md:text-base text-muted-foreground">完成任务获得经验值，培养积极习惯，保持每日连击！</p>
        </div>
        <div className="flex items-center justify-center gap-6 md:gap-4">
          <div className="text-center">
            <div className="text-xl md:text-lg font-bold text-green-600">{completedToday.length}</div>
            <div className="text-sm md:text-xs text-muted-foreground">今日完成</div>
          </div>
          <div className="text-center">
            <div className="text-xl md:text-lg font-bold text-primary">{tasks.filter(t => !t.completed).length}</div>
            <div className="text-sm md:text-xs text-muted-foreground">待完成</div>
          </div>
        </div>
      </div>

      {/* 能量球状态显示区域 - 优化版本 */}
      {userStats && (
        <Card className={`transition-all duration-200 ${
          userStats.energyBalls <= 3 ? 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border-red-200 dark:border-red-700 shadow-red-100' :
          userStats.energyBalls <= 8 ? 'bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-950/30 dark:to-yellow-900/20 border-amber-200 dark:border-amber-700 shadow-amber-100' :
          'bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/30 dark:to-indigo-900/20 border-blue-200 dark:border-blue-700 shadow-blue-100'
        } shadow-lg`}>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* 左侧信息 */}
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${
                  userStats.energyBalls <= 3 ? 'bg-red-100 dark:bg-red-900/30' :
                  userStats.energyBalls <= 8 ? 'bg-amber-100 dark:bg-amber-900/30' :
                  'bg-blue-100 dark:bg-blue-900/30'
                }`}>
                  <Battery className={`h-6 w-6 ${
                    userStats.energyBalls <= 3 ? 'text-red-600 dark:text-red-400' :
                    userStats.energyBalls <= 8 ? 'text-amber-600 dark:text-amber-400' :
                    'text-blue-600 dark:text-blue-400'
                  }`} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-1">能量状态</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {getEnergyStatus(userStats.energyBalls, userStats.maxEnergyBalls)}
                  </p>
                </div>
              </div>
              
              {/* 右侧能量球和数据 */}
              <div className="flex items-center gap-6">
                {/* 能量球可视化 - 只显示实际拥有的数量 */}
                <div className="flex items-center gap-1.5 flex-wrap max-w-[300px]">
                  {Array.from({ length: userStats.energyBalls }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-sm transition-all duration-200 hover:scale-110 ${
                        userStats.energyBalls <= 3 ? 'bg-red-500 shadow-red-300' :
                        userStats.energyBalls <= 8 ? 'bg-amber-500 shadow-amber-300' :
                        'bg-blue-500 shadow-blue-300'
                      } shadow-md`}
                    >
                      ⚡
                    </div>
                  ))}
                  {/* 空的能量球插槽 */}
                  {Array.from({ length: userStats.maxEnergyBalls - userStats.energyBalls }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 opacity-50"
                    />
                  ))}
                </div>
                
                {/* 数字显示 */}
                <div className="text-center min-w-[80px]">
                  <div className={`text-3xl font-bold mb-1 ${
                    userStats.energyBalls <= 3 ? 'text-red-600 dark:text-red-400' :
                    userStats.energyBalls <= 8 ? 'text-amber-600 dark:text-amber-400' :
                    'text-blue-600 dark:text-blue-400'
                  }`}>
                    {userStats.energyBalls}
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">
                    /{userStats.maxEnergyBalls}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {userStats.energyBalls * 15}分钟可用
                  </div>
                  {userStats.energyBalls === 0 && (
                    <div className="space-y-2 mt-2">
                      <div className="text-xs text-red-500 font-medium bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded-full">
                        需要休息恢复
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => restoreEnergyMutation.mutate()}
                        disabled={restoreEnergyMutation.isPending}
                        className="w-full h-7 text-xs border-blue-500 text-blue-600 hover:bg-blue-50"
                      >
                        {restoreEnergyMutation.isPending ? (
                          <span className="flex items-center gap-1">
                            <span className="animate-spin">⚡</span> 恢复中...
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Battery className="h-3 w-3" /> 立即恢复能量
                          </span>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      



      {/* 创建新任务 - 移动优化 */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3 px-4 pt-4">
          <CardTitle className="flex items-center gap-2 text-foreground text-base">
            <Plus className="h-4 w-4" />
            AI 智能创建
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-4">
          
          <Input
            placeholder="输入任务描述"
            value={newTask.title}
            onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
            className="bg-background border-border text-foreground h-10 text-sm px-3"
          />

          <Button 
            onClick={() => handleCreateTask()}
            disabled={!newTask.title.trim() || isAnalyzing}
            className="w-full h-10 bg-purple-700 hover:bg-purple-800 text-sm font-medium text-white border-0 disabled:opacity-50"
            style={{ backgroundColor: '#7c3aed', color: '#ffffff', fontWeight: '600', border: 'none' }}
          >
            {isAnalyzing ? (
              <>
                <Brain className="w-4 h-4 mr-2 animate-pulse" />
                AI 分析中...
              </>
            ) : (
              "AI 智能创建"
            )}
          </Button>
          <div className="text-xs text-muted-foreground text-center">
            AI 将自动识别任务类型（习惯 vs 支线任务）
          </div>
        </CardContent>
      </Card>

      {/* 任务列表 - 移动优化 */}
      <div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 bg-muted h-12">
            <TabsTrigger value="main" className="data-[state=active]:bg-background text-xs py-3">
              主线任务 ({goals.filter(g => !g.completed).length})
            </TabsTrigger>
            <TabsTrigger value="side" className="data-[state=active]:bg-background text-xs py-3">
              支线任务 ({todos.filter(t => !t.completed).length})
            </TabsTrigger>
            <TabsTrigger value="habit" className="data-[state=active]:bg-background text-xs py-3">
              习惯 ({habits.filter(h => !h.completed).length})
            </TabsTrigger>
          </TabsList>



        <TabsContent value="main" className="space-y-3">
          <div className="mb-4 p-4 bg-primary/10 rounded-lg border border-primary/30">
            <h3 className="font-medium text-primary mb-2">🎯 主线任务 (Main Quests)</h3>
            <p className="text-sm text-muted-foreground">长期主线目标任务</p>
          </div>
          {goals.filter(goal => !goal.completed).length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="p-8 text-center">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">暂无目标</h3>
                <p className="text-muted-foreground">前往目标页面创建您的第一个目标！</p>
              </CardContent>
            </Card>
          ) : (
            goals.filter(goal => !goal.completed).map((goal) => (
              <Card key={goal.id} className="bg-card border-border hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-foreground mb-2">{goal.title}</h3>
                      <p className="text-muted-foreground text-sm mb-3">{goal.description}</p>
                      
                      {/* 进度条 */}
                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">总体进度</span>
                          <span className="text-primary">{Math.round((goal.progress || 0) * 100)}%</span>
                        </div>
                        <Progress value={(goal.progress || 0) * 100} className="h-2" />
                      </div>

                      {/* 番茄钟奖励 */}
                      {(goal.pomodoroExpReward || goal.pomodoroGoldReward) && (
                        <div className="mb-3">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-primary" />
                            <span className="text-foreground">番茄钟奖励:</span>
                            {goal.pomodoroExpReward && (
                              <Badge className="bg-primary text-primary-foreground text-xs">
                                +{goal.pomodoroExpReward} EXP
                              </Badge>
                            )}
                            {goal.pomodoroGoldReward && (
                              <Badge className="bg-accent text-accent-foreground text-xs">
                                +{goal.pomodoroGoldReward} 金币
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 里程碑显示 */}
                      {goal.milestones && goal.milestones.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-foreground">里程碑总数</h4>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="text-xs">
                              {goal.milestones.length} 里程碑总数
                            </Badge>
                            <Badge variant="outline" className="text-xs text-accent">
                              {goal.milestones.filter((m: any) => m.completed).length} 已完成
                            </Badge>
                            <Badge variant="outline" className="text-xs text-primary">
                              {goal.milestones.filter((m: any) => !m.completed).length} 待完成
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* 热身任务按钮 */}
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Flame className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium text-foreground">热身准备</span>
                      </div>
                      <MicroTasksButton taskId={goal.id} />
                    </div>

                    {/* 主线任务专用番茄钟 */}
                    <div className="bg-gradient-to-br from-accent/10 to-primary/10 rounded-lg p-3 border border-accent/20">
                      <div className="flex items-center gap-2 mb-3">
                        <Crown className="h-4 w-4 text-accent" />
                        <span className="text-accent font-medium text-sm">主线任务专注</span>
                        <Badge className="bg-accent/20 text-accent text-xs">增强奖励</Badge>
                      </div>
                      
                      {pomodoro.taskId === goal.id ? (
                        <div className="space-y-3">
                          {/* 当前番茄钟状态 */}
                          <div className="bg-muted rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="text-xl">
                                  {pomodoro.isBreak ? '☕' : 
                                   (() => {
                                     const progress = ((pomodoro.totalTime - pomodoro.timeLeft) / pomodoro.totalTime) * 100;
                                     if (progress < 25) return "⚔️";
                                     if (progress < 50) return "🛡️";  
                                     if (progress < 75) return "💎";
                                     return "👑";
                                   })()}
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-accent">
                                    {pomodoro.isBreak ? '休息时间' : '专注挑战'}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-mono font-bold text-accent">
                                  {formatTime(pomodoro.timeLeft)}
                                </div>
                              </div>
                            </div>
                            
                            {/* 进度条 */}
                            {!pomodoro.isBreak && (
                              <div className="mb-2">
                                <Progress 
                                  value={((pomodoro.totalTime - pomodoro.timeLeft) / pomodoro.totalTime) * 100}
                                  className="h-2"
                                />
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse"></div>
                                {pomodoro.isRunning ? '专注中' : '已暂停'}
                              </div>
                              <div className="flex gap-1">
                                {pomodoro.isRunning ? (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={pausePomodoro}
                                    className="h-7 px-2 border-accent/30 text-accent hover:bg-accent/10"
                                  >
                                    <Pause className="h-3 w-3" />
                                  </Button>
                                ) : (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={resumePomodoro}
                                    className="h-7 px-2 border-primary/30 text-primary hover:bg-primary/10"
                                  >
                                    <Play className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={resetPomodoro}
                                  className="h-7 px-2 border-destructive/30 text-destructive hover:bg-destructive/10"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          
                          {/* 完成任务按钮 */}
                          <Button 
                            onClick={() => handleToggleComplete(goal.id)}
                            className="w-full h-8 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium text-sm"
                          >
                            <Crown className="h-3 w-3 mr-1" />
                            击败最终Boss - 完成主线
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          onClick={() => startPomodoro(goal.id)}
                          className="w-full h-9 bg-gradient-to-r from-orange-700 to-red-600 hover:from-orange-800 hover:to-red-700 text-white font-medium shadow-lg border-0"
                          style={{ backgroundColor: '#dc2626' }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base">⚔️</span>
                            <div className="text-left">
                              <div className="text-sm font-bold text-white" style={{ color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>开始主线挑战</div>
                              <div className="text-xs font-medium" style={{ color: '#fee2e2', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>25分钟挑战</div>
                            </div>
                          </div>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
          
          {/* 已完成的目标 */}
          {goals.filter(goal => goal.completed).length > 0 && (
            <div className="mt-6 space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground px-2 border-t border-border pt-4">
                已完成的主线任务 ({goals.filter(goal => goal.completed).length})
              </h4>
              {goals.filter(goal => goal.completed).map((goal) => (
                <Card key={goal.id} className="bg-card border-border opacity-60">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <h3 className="font-medium text-foreground line-through">{goal.title}</h3>
                      </div>
                      <p className="text-muted-foreground text-sm">{goal.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Trophy className="h-3 w-3" />
                        <span>已完成</span>
                        {goal.completedAt && (
                          <>
                            <span>•</span>
                            <span>{new Date(goal.completedAt).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="habit" className="space-y-3">
          <div className="mb-4 p-4 bg-secondary/20 rounded-lg border border-secondary/30">
            <h3 className="font-medium text-secondary mb-2">🔄 习惯 (Habits)</h3>
            <p className="text-sm text-muted-foreground">可重复完成，建立长期习惯</p>
          </div>
          
          {/* 未完成的习惯 */}
          {habits.filter(task => !task.completed).length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground px-2">今日待完成 ({habits.filter(task => !task.completed).length})</h4>
              {habits.filter(task => !task.completed).map((task) => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onComplete={handleToggleComplete}
                  onDelete={handleDeleteTask}
                  onStartPomodoro={startPomodoro}
                  pomodoroState={pomodoro}
                  onPausePomodoro={pausePomodoro}
                  onResumePomodoro={resumePomodoro}
                  onResetPomodoro={resetPomodoro}
                  formatTime={formatTime}
                  userStats={userStats}
                  skills={skills}
                  getIconEmoji={getIconEmoji}
                />
              ))}
            </div>
          )}

          {/* 已完成的习惯 */}
          {habits.filter(task => task.completed).length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground px-2 border-t border-border pt-4">今日已完成 ({habits.filter(task => task.completed).length})</h4>
              {habits.filter(task => task.completed).map((task) => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onComplete={handleToggleComplete}
                  onDelete={handleDeleteTask}
                  onStartPomodoro={startPomodoro}
                  pomodoroState={pomodoro}
                  onPausePomodoro={pausePomodoro}
                  onResumePomodoro={resumePomodoro}
                  onResetPomodoro={resetPomodoro}
                  formatTime={formatTime}
                  userStats={userStats}
                  skills={skills}
                  getIconEmoji={getIconEmoji}
                />
              ))}
            </div>
          )}

          {habits.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p>还没有习惯任务，创建你的第一个习惯开始培养好习惯吧！</p>
            </div>
          )}
        </TabsContent>



        <TabsContent value="side" className="space-y-3">
          <div className="mb-4 p-4 bg-primary/20 rounded-lg border border-primary/30">
            <h3 className="font-medium text-primary mb-2">✅ 支线任务 (Side Quests)</h3>
            <p className="text-sm text-muted-foreground">一次性任务，完成后消除</p>
          </div>
          
          {/* 未完成的支线任务 */}
          {todos.filter(task => !task.completed).length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground px-2">未完成 ({todos.filter(task => !task.completed).length})</h4>
              {todos.filter(task => !task.completed).map((task) => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onComplete={handleToggleComplete}
                  onDelete={handleDeleteTask}
                  onStartPomodoro={startPomodoro}
                  pomodoroState={pomodoro}
                  onPausePomodoro={pausePomodoro}
                  onResumePomodoro={resumePomodoro}
                  onResetPomodoro={resetPomodoro}
                  formatTime={formatTime}
                  userStats={userStats}
                  skills={skills}
                  getIconEmoji={getIconEmoji}
                />
              ))}
            </div>
          )}

          {/* 今日已完成的支线任务 */}
          {todos.filter(isCompletedToday).length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground px-2 border-t border-border pt-4">今日已完成 ({todos.filter(isCompletedToday).length})</h4>
              {todos.filter(isCompletedToday).map((task) => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onComplete={handleToggleComplete}
                  onDelete={handleDeleteTask}
                  onStartPomodoro={startPomodoro}
                  pomodoroState={pomodoro}
                  onPausePomodoro={pausePomodoro}
                  onResumePomodoro={resumePomodoro}
                  onResetPomodoro={resetPomodoro}
                  formatTime={formatTime}
                  userStats={userStats}
                  skills={skills}
                  getIconEmoji={getIconEmoji}
                />
              ))}
            </div>
          )}

          {todos.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p>还没有支线任务，创建你的第一个任务开始升级吧！</p>
              <p className="text-xs mt-2">当前共有 {tasks.length} 个任务</p>
            </div>
          )}
        </TabsContent>
        </Tabs>
      </div>

      {/* Floating Timer Widget - 圆形迷你版本 */}
      {pomodoro.taskId && !isPomodoroDialogOpen && (
        <div 
          className={`fixed right-4 top-1/2 -translate-y-1/2 text-white rounded-full shadow-xl border-2 border-white cursor-pointer hover:scale-110 transition-all duration-200 group ${
            pomodoro.isRunning 
              ? 'bg-gradient-to-br from-red-500 to-orange-500' 
              : 'bg-gradient-to-br from-gray-500 to-gray-600'
          }`}
          style={{ 
            position: 'fixed',
            right: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 999999,
            width: '80px',
            height: '80px'
          }}
          onClick={() => setIsPomodoroDialogOpen(true)}
        >
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-lg mb-1">🍅</div>
            <div className="text-xs font-bold leading-tight">
              {formatTime(pomodoro.timeLeft)}
            </div>
          </div>
          {pomodoro.isRunning && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
          )}
          {!pomodoro.isRunning && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full"></div>
          )}
          
          {/* 悬停提示 */}
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-black text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {tasks.find(t => t.id === pomodoro.taskId)?.title || "任务"} 
            {pomodoro.isRunning ? " (进行中)" : " (已暂停)"}
          </div>
        </div>
      )}

      {/* 番茄钟弹出模态窗口 */}
      {pomodoro.taskId && isPomodoroDialogOpen && (
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogContent className="w-[95vw] max-w-4xl h-[95vh] sm:h-[80vh] bg-card border-2 border-primary/30 p-0 overflow-hidden [&>.absolute.right-4.top-4]:!hidden">
            <DialogHeader className="sr-only">
              <DialogTitle>番茄钟挑战</DialogTitle>
              <DialogDescription>正在进行番茄钟专注学习，挑战Boss任务</DialogDescription>
            </DialogHeader>
            <div className="h-full flex flex-col">
              {/* 顶部任务信息 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 border-b border-border gap-3 sm:gap-4">
                <div className="flex items-center gap-3">
                  <Circle className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  <h2 className="text-lg sm:text-xl font-bold text-foreground truncate">
                    {tasks.find(t => t.id === pomodoro.taskId)?.title || "任务"}
                  </h2>
                </div>
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-4">
                  <Badge variant="outline" className="bg-accent/20 text-accent border-accent/30 text-xs">
                    <Battery className="h-2 w-2 sm:h-3 sm:w-3 mr-1" />
                    -{tasks.find(t => t.id === pomodoro.taskId)?.requiredEnergyBalls || 1} 能量球
                  </Badge>
                  <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 text-xs">
                    <Zap className="h-2 w-2 sm:h-3 sm:w-3 mr-1" />
                    +{tasks.find(t => t.id === pomodoro.taskId)?.expReward || 20} XP
                  </Badge>
                  <Badge variant="secondary" className="bg-secondary/20 text-secondary border-secondary/30 text-xs">
                    中等
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={closePomodoroDialog}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* 主战斗区域 */}
              <div className="flex-1 p-4 sm:p-8 overflow-y-auto">
                <div className="max-w-2xl mx-auto text-center">
                  {/* Boss战斗标题 */}
                  <div className="mb-6 sm:mb-8">
                    <div className="flex items-center justify-center gap-2 sm:gap-4 mb-4">
                      <div className="text-2xl sm:text-4xl">
                        {(() => {
                          const progress = ((pomodoro.totalTime - pomodoro.timeLeft) / pomodoro.totalTime) * 100;
                          if (progress < 25) return "⚔️"; // 开始战斗
                          if (progress < 50) return "🛡️"; // 激战中  
                          if (progress < 75) return "💎"; // 即将胜利
                          return "👑"; // 胜利Boss
                        })()}
                      </div>
                      <h1 className="text-xl sm:text-3xl font-bold text-foreground">挑战Boss中...</h1>
                    </div>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      {(() => {
                        const progress = ((pomodoro.totalTime - pomodoro.timeLeft) / pomodoro.totalTime) * 100;
                        if (progress < 25) return "开始挑战Boss";
                        if (progress < 50) return "激烈战斗中";
                        if (progress < 75) return "Boss血量告急";
                        return "即将击败Boss";
                      })()}
                    </p>
                  </div>

                  {/* 倒计时显示 */}
                  <div className="mb-6 sm:mb-8">
                    <div className="text-4xl sm:text-6xl font-mono font-bold text-primary mb-2">
                      {formatTime(pomodoro.timeLeft)}
                    </div>
                    <div className="text-sm sm:text-base text-muted-foreground">
                      {pomodoro.isBreak ? '💤 回城休息' : '⚔️ 战斗时间'}
                    </div>
                  </div>

                  {/* Boss血条 */}
                  <div className="mb-6 sm:mb-8">
                    <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground mb-2">
                      <span>Boss血量</span>
                      <span>{Math.round(100 - ((pomodoro.totalTime - pomodoro.timeLeft) / pomodoro.totalTime) * 100)}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-4 sm:h-6 border border-red-300 dark:border-red-700">
                      <div 
                        className="bg-gradient-to-r from-red-600 to-red-500 h-4 sm:h-6 rounded-full transition-all duration-1000 flex items-center justify-center text-white text-xs sm:text-sm font-bold drop-shadow-lg"
                        style={{ 
                          width: `${100 - ((pomodoro.totalTime - pomodoro.timeLeft) / pomodoro.totalTime) * 100}%` 
                        }}
                      >
                        {100 - Math.round(((pomodoro.totalTime - pomodoro.timeLeft) / pomodoro.totalTime) * 100) > 15 && (
                          <span className="text-white font-bold drop-shadow-md">DarkBoss</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 战斗状态 */}
                  <div className="mb-6 sm:mb-8">
                    <div className="flex items-center justify-center gap-2 text-sm sm:text-base text-muted-foreground mb-4">
                      <div className="w-2 h-2 sm:w-3 sm:h-3 bg-primary rounded-full animate-pulse"></div>
                      {pomodoro.isRunning ? '正在战斗，请勿打扰' : '战斗暂停'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 底部控制区域 */}
              <div className="p-4 sm:p-6 border-t border-border">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                  {pomodoro.isRunning ? (
                    <Button 
                      size="lg" 
                      variant="outline" 
                      onClick={pausePomodoro} 
                      className="w-full sm:w-auto border-accent/30 text-accent hover:bg-accent/10 h-12"
                    >
                      <Pause className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      暂停战斗
                    </Button>
                  ) : (
                    <Button 
                      size="lg" 
                      variant="outline" 
                      onClick={resumePomodoro} 
                      className="w-full sm:w-auto border-primary/30 text-primary hover:bg-primary/10 h-12"
                    >
                      <Play className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      继续战斗
                    </Button>
                  )}
                  
                  <Button 
                    size="lg" 
                    variant="outline" 
                    onClick={resetPomodoro} 
                    className="w-full sm:w-auto border-destructive/30 text-destructive hover:bg-destructive/10 h-12"
                  >
                    <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    重置战斗
                  </Button>
                  
                  {/* 完成任务按钮 */}
                  <Button 
                    size="lg" 
                    onClick={() => {
                      if (pomodoro.taskId) {
                        handleToggleComplete(pomodoro.taskId);
                        resetPomodoro();
                      }
                    }}
                    className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium px-4 sm:px-8 h-12"
                  >
                    <Crown className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    击败Boss
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function MicroTasksButton({ taskId }: { taskId: number }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [microTasks, setMicroTasks] = useState<MicroTask[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const generateMicroTasks = async () => {
    try {
      setIsGenerating(true);
      
      // First check if micro tasks already exist
      const existingResponse = await apiRequest('GET', `/api/tasks/${taskId}/micro-tasks`);
      const existingTasks = await existingResponse.json();
      
      if (existingTasks.length > 0) {
        setMicroTasks(existingTasks);
        setIsDialogOpen(true);
        return;
      }

      // Generate new micro tasks if none exist
      const newResponse = await apiRequest('POST', `/api/tasks/${taskId}/generate-micro-tasks`, {});
      const newMicroTasks = await newResponse.json();
      setMicroTasks(newMicroTasks);
      setIsDialogOpen(true);
    } catch (error) {
      console.error('Error generating micro tasks:', error);
      toast({
        title: "生成失败",
        description: "无法生成微任务，请重试",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const completeMicroTask = async (microTaskId: number) => {
    try {
      await apiRequest('PATCH', `/api/micro-tasks/${microTaskId}`, { completed: true });
      setMicroTasks(prev => 
        prev.map(task => 
          task.id === microTaskId ? { ...task, completed: true } : task
        )
      );
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=tasks'] });
      toast({
        title: "微任务完成",
        description: "获得经验奖励！",
      });
    } catch (error) {
      console.error('Error completing micro task:', error);
      toast({
        title: "更新失败",
        description: "无法更新任务状态",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={generateMicroTasks}
        disabled={isGenerating}
        className="text-xs px-2 py-1 h-7 bg-blue-500/10 border-blue-500/30 text-blue-600 hover:bg-blue-500/20"
      >
        {isGenerating ? (
          <div className="animate-spin w-3 h-3 border border-blue-500 border-t-transparent rounded-full"></div>
        ) : (
          "微任务"
        )}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              分解微任务
            </DialogTitle>
            <DialogDescription>
              将主线任务分解为小步骤，逐步完成获得经验奖励
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-3 mt-4">
            {microTasks.map((microTask) => (
              <Card 
                key={microTask.id} 
                className={`cursor-pointer transition-all ${
                  microTask.completed 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : 'hover:border-blue-400/50 hover:bg-blue-500/5'
                }`}
                onClick={() => !microTask.completed && completeMicroTask(microTask.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className={`font-medium text-sm ${
                        microTask.completed ? 'text-muted-foreground line-through' : 'text-foreground'
                      }`}>
                        {microTask.title}
                      </h4>
                      {microTask.description && (
                        <p className="text-xs text-muted-foreground mt-1">{microTask.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {microTask.duration}分钟
                        </span>
                        <span className="text-blue-600 flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          +{microTask.expReward} EXP
                        </span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            microTask.difficulty === 'easy' ? 'border-green-500/30 text-green-600' :
                            microTask.difficulty === 'medium' ? 'border-yellow-500/30 text-yellow-600' :
                            'border-red-500/30 text-red-600'
                          }`}
                        >
                          {microTask.difficulty === 'easy' ? '简单' : 
                           microTask.difficulty === 'medium' ? '中等' : '困难'}
                        </Badge>
                      </div>
                    </div>
                    {microTask.completed && (
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
            >
              关闭
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}