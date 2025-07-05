import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  Target, 
  CheckSquare, 
  Repeat, 
  Zap, 
  Swords, 
  AlertCircle,
  Clock,
  Trophy,
  Flame,
  Loader2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface TaskSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UnifiedTask {
  id: number;
  title: string;
  type: 'goal' | 'task' | 'habit';
  energyBalls?: number;
  skillId?: number;
  completed?: boolean;
  category?: string;
  description?: string;
  difficulty?: string;
}

const TASK_ICONS = {
  goal: Target,
  task: CheckSquare,
  habit: Repeat,
};

const TASK_COLORS = {
  goal: "text-blue-500",
  task: "text-purple-500",
  habit: "text-green-500",
};

const TASK_BG_COLORS = {
  goal: "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20",
  task: "bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20",
  habit: "bg-green-500/10 hover:bg-green-500/20 border-green-500/20",
};

const DIFFICULTY_COLORS = {
  easy: "bg-green-500/10 text-green-700 border-green-500/20",
  medium: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  hard: "bg-red-500/10 text-red-700 border-red-500/20",
};

export default function TaskSelector({ isOpen, onClose }: TaskSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTaskType, setSelectedTaskType] = useState<'all' | 'goal' | 'task' | 'habit'>('all');
  const [, setLocation] = useLocation();

  // Fetch all available tasks from the unified API
  const { data: availableTasks, isLoading, error } = useQuery({
    queryKey: ['pomodoro-available-tasks'],
    queryFn: async () => {
      try {
        const data = await apiRequest('GET', '/api/pomodoro/available-tasks');
        console.log('Available tasks data:', data);
        return data;
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
        throw new Error(error.message || 'Failed to fetch available tasks');
      }
    },
    enabled: isOpen,
  });

  // Debug log
  console.log('Raw available tasks:', availableTasks);
  console.log('Goals:', availableTasks?.goals);
  console.log('Tasks:', availableTasks?.tasks);
  console.log('Habits:', availableTasks?.habits);

  // Unify all tasks into a single format
  const allTasks: UnifiedTask[] = [
    ...(availableTasks?.goals || []),
    ...(availableTasks?.tasks || []),
    ...(availableTasks?.habits || []),
  ];

  // Filter tasks based on search and type
  const filteredTasks = allTasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedTaskType === 'all' || task.type === selectedTaskType;
    return matchesSearch && matchesType;
  });

  const handleTaskSelect = async (task: UnifiedTask) => {
    try {
      // Navigate to the pomodoro timer
      setLocation(`/pomodoro?type=${task.type}&id=${task.id}`);
      onClose();
    } catch (error) {
      console.error('Failed to start pomodoro:', error);
    }
  };

  const getTaskTypeLabel = (type: UnifiedTask['type']) => {
    switch (type) {
      case 'goal':
        return '主线任务';
      case 'task':
        return '支线任务';
      case 'habit':
        return '日常习惯';
    }
  };

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        没有找到可用的任务
      </h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        {searchTerm ? 
          `没有找到包含 "${searchTerm}" 的任务` : 
          '创建一些任务来开始你的专注之旅'
        }
      </p>
    </div>
  );

  const renderTaskCard = (task: UnifiedTask) => {
    const Icon = TASK_ICONS[task.type];
    
    return (
      <Card
        key={`${task.type}-${task.id}`}
        className={cn(
          "p-4 cursor-pointer border transition-all duration-200",
          TASK_BG_COLORS[task.type],
          "hover:shadow-md hover:scale-[1.02]"
        )}
        onClick={() => handleTaskSelect(task)}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
            TASK_BG_COLORS[task.type].replace('hover:', '')
          )}>
            <Icon className={cn("h-5 w-5", TASK_COLORS[task.type])} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs",
                  TASK_COLORS[task.type],
                  "border-current"
                )}
              >
                {getTaskTypeLabel(task.type)}
              </Badge>
              {task.difficulty && (
                <Badge 
                  variant="outline"
                  className={cn("text-xs", DIFFICULTY_COLORS[task.difficulty])}
                >
                  {task.difficulty === 'easy' ? '简单' : 
                   task.difficulty === 'medium' ? '中等' : '困难'}
                </Badge>
              )}
            </div>
            <h3 className="font-medium text-foreground truncate">
              {task.title}
            </h3>
            {task.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {task.description}
              </p>
            )}
          </div>

          {/* Energy balls */}
          {task.energyBalls && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">{task.energyBalls}</span>
            </div>
          )}
        </div>
      </Card>
    );
  };

  const tabCounts = {
    all: allTasks.length,
    goal: availableTasks?.goals?.length || 0,
    task: availableTasks?.tasks?.length || 0,
    habit: availableTasks?.habits?.length || 0,
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <Swords className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold">选择要挑战的任务</DialogTitle>
              <DialogDescription>
                选择一个任务开始25分钟的专注战斗
              </DialogDescription>
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="搜索任务..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-muted/50"
            />
          </div>
        </DialogHeader>

        {/* Type Filter */}
        <div className="px-6">
          <Tabs value={selectedTaskType} onValueChange={(v) => setSelectedTaskType(v as any)}>
            <TabsList className="grid w-full grid-cols-4 bg-muted/50">
              <TabsTrigger value="all" className="data-[state=active]:bg-background">
                全部 {tabCounts.all > 0 && <span className="ml-1 text-xs">({tabCounts.all})</span>}
              </TabsTrigger>
              <TabsTrigger value="goal" className="data-[state=active]:bg-background">
                主线 {tabCounts.goal > 0 && <span className="ml-1 text-xs">({tabCounts.goal})</span>}
              </TabsTrigger>
              <TabsTrigger value="task" className="data-[state=active]:bg-background">
                支线 {tabCounts.task > 0 && <span className="ml-1 text-xs">({tabCounts.task})</span>}
              </TabsTrigger>
              <TabsTrigger value="habit" className="data-[state=active]:bg-background">
                习惯 {tabCounts.habit > 0 && <span className="ml-1 text-xs">({tabCounts.habit})</span>}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Task List */}
        <ScrollArea className="flex-1 px-6 pb-6">
          <div className="space-y-3 mt-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                <p className="text-muted-foreground">加载任务中...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  加载任务失败
                </h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
                  {error.message}
                </p>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  重新加载
                </Button>
              </div>
            ) : filteredTasks.length === 0 ? (
              renderEmptyState()
            ) : (
              filteredTasks.map(renderTaskCard)
            )}
          </div>
        </ScrollArea>

        {/* Stats Footer */}
        {!isLoading && !error && allTasks.length > 0 && (
          <div className="border-t bg-muted/30 px-6 py-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Trophy className="h-4 w-4" />
                  {tabCounts.goal} 主线任务
                </span>
                <span className="flex items-center gap-1">
                  <Target className="h-4 w-4" />
                  {tabCounts.task} 支线任务
                </span>
                <span className="flex items-center gap-1">
                  <Repeat className="h-4 w-4" />
                  {tabCounts.habit} 习惯养成
                </span>
              </div>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                25分钟专注时间
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}