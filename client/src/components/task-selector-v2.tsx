import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import EnhancedPomodoroDialog from "./enhanced-pomodoro-dialog";

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
  const [selectedTask, setSelectedTask] = useState<UnifiedTask | null>(null);
  const [showPomodoro, setShowPomodoro] = useState(false);

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
      // Set selected task and show pomodoro dialog
      setSelectedTask(task);
      setShowPomodoro(true);
      // Close task selector dialog
      onClose();
    } catch (error) {
      console.error('Failed to start pomodoro:', error);
    }
  };

  const handlePomodoroClose = () => {
    setShowPomodoro(false);
    setSelectedTask(null);
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
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-20 h-20 bg-gradient-to-br from-muted to-muted/50 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
        <AlertCircle className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-3">
        没有找到可用的任务
      </h3>
      <p className="text-base text-muted-foreground text-center max-w-md">
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
          "p-4 sm:p-6 cursor-pointer border-2 transition-all duration-200 group",
          TASK_BG_COLORS[task.type],
          "hover:shadow-xl hover:scale-[1.01] sm:hover:scale-[1.02] hover:-translate-y-0.5"
        )}
        onClick={() => handleTaskSelect(task)}
      >
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className={cn(
            "w-12 sm:w-14 h-12 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110",
            TASK_BG_COLORS[task.type].replace('hover:', '').replace('border-', 'bg-')
          )}>
            <Icon className={cn("h-5 sm:h-7 w-5 sm:w-7", TASK_COLORS[task.type])} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base sm:text-lg lg:text-xl text-foreground mb-1 sm:mb-2 line-clamp-1">
              {task.title}
            </h3>
            <div className="flex items-center gap-3">
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs sm:text-sm font-medium px-2 sm:px-3 py-0.5 sm:py-1 border sm:border-2",
                  task.type === 'goal' ? 'border-blue-500/30 text-blue-600 bg-blue-500/5' :
                  task.type === 'task' ? 'border-purple-500/30 text-purple-600 bg-purple-500/5' :
                  'border-green-500/30 text-green-600 bg-green-500/5'
                )}
              >
                {getTaskTypeLabel(task.type)}
              </Badge>
              {task.difficulty && (
                <Badge 
                  variant="outline"
                  className={cn(
                    "text-xs sm:text-sm font-medium px-2 sm:px-3 py-0.5 sm:py-1 border sm:border-2",
                    task.difficulty === 'easy' ? 'border-green-500/30 text-green-600 bg-green-500/5' :
                    task.difficulty === 'medium' ? 'border-yellow-500/30 text-yellow-600 bg-yellow-500/5' :
                    'border-red-500/30 text-red-600 bg-red-500/5'
                  )}
                >
                  {task.difficulty === 'easy' ? '简单' : 
                   task.difficulty === 'medium' ? '中等' : '困难'}
                </Badge>
              )}
            </div>
          </div>

          {/* Energy balls */}
          {task.energyBalls && (
            <div className="flex items-center gap-1 sm:gap-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-3 border sm:border-2 border-yellow-500/30">
              <Zap className="h-4 sm:h-6 w-4 sm:w-6 text-yellow-500" />
              <span className="font-bold text-sm sm:text-lg text-yellow-600">{task.energyBalls}</span>
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
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] sm:h-[85vh] p-0 bg-background overflow-hidden flex flex-col">
        <DialogHeader className="px-6 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6 border-b bg-gradient-to-b from-background to-muted/20 flex-shrink-0">
          <div className="flex items-center gap-5">
            <div className="w-12 sm:w-16 h-12 sm:h-16 bg-gradient-to-br from-primary to-accent rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Swords className="h-6 sm:h-8 w-6 sm:w-8 text-white" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight">选择要挑战的任务</DialogTitle>
              <DialogDescription className="text-sm sm:text-base mt-1 sm:mt-2 text-muted-foreground">
                选择一个任务开始25分钟的专注战斗
              </DialogDescription>
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-6">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="搜索任务..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 sm:pl-12 h-12 sm:h-14 bg-background border-2 text-base sm:text-lg placeholder:text-muted-foreground/60 focus:border-primary/50"
            />
          </div>
        </DialogHeader>

        {/* Type Filter */}
        <div className="px-6 sm:px-8 pt-2 flex-shrink-0">
          <Tabs value={selectedTaskType} onValueChange={(v) => setSelectedTaskType(v as any)}>
            <TabsList className="grid w-full grid-cols-4 h-12 sm:h-14 bg-muted/30 p-1">
              <TabsTrigger value="all" className="data-[state=active]:bg-background data-[state=active]:shadow-sm h-full text-sm sm:text-base font-medium">
                <span className="flex items-center gap-1 sm:gap-2">
                  <span>全部</span>
                  {tabCounts.all > 0 && <span className="text-xs sm:text-sm font-normal text-muted-foreground">({tabCounts.all})</span>}
                </span>
              </TabsTrigger>
              <TabsTrigger value="goal" className="data-[state=active]:bg-background data-[state=active]:shadow-sm h-full text-sm sm:text-base font-medium">
                <span className="flex items-center gap-1 sm:gap-2">
                  <span>主线</span>
                  {tabCounts.goal > 0 && <span className="text-xs sm:text-sm font-normal text-muted-foreground">({tabCounts.goal})</span>}
                </span>
              </TabsTrigger>
              <TabsTrigger value="task" className="data-[state=active]:bg-background data-[state=active]:shadow-sm h-full text-sm sm:text-base font-medium">
                <span className="flex items-center gap-1 sm:gap-2">
                  <span>支线</span>
                  {tabCounts.task > 0 && <span className="text-xs sm:text-sm font-normal text-muted-foreground">({tabCounts.task})</span>}
                </span>
              </TabsTrigger>
              <TabsTrigger value="habit" className="data-[state=active]:bg-background data-[state=active]:shadow-sm h-full text-sm sm:text-base font-medium">
                <span className="flex items-center gap-1 sm:gap-2">
                  <span>习惯</span>
                  {tabCounts.habit > 0 && <span className="text-xs sm:text-sm font-normal text-muted-foreground">({tabCounts.habit})</span>}
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Task List */}
        <ScrollArea className="flex-1 px-6 sm:px-8 py-4 sm:py-6 overflow-y-auto">
          <div className="space-y-3">
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
          <div className="border-t bg-gradient-to-r from-muted/40 to-muted/20 px-6 sm:px-8 py-3 sm:py-5 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <span className="flex items-center gap-2 text-base">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Trophy className="h-4 w-4 text-blue-500" />
                  </div>
                  <span className="font-medium">{tabCounts.goal}</span>
                  <span className="text-muted-foreground">主线</span>
                </span>
                <span className="flex items-center gap-2 text-base">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Target className="h-4 w-4 text-purple-500" />
                  </div>
                  <span className="font-medium">{tabCounts.task}</span>
                  <span className="text-muted-foreground">支线</span>
                </span>
                <span className="flex items-center gap-2 text-base">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Repeat className="h-4 w-4 text-green-500" />
                  </div>
                  <span className="font-medium">{tabCounts.habit}</span>
                  <span className="text-muted-foreground">习惯</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-base bg-primary/10 rounded-lg px-4 py-2">
                <Clock className="h-5 w-5 text-primary" />
                <span className="font-medium text-primary">25分钟</span>
                <span className="text-muted-foreground">专注时间</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

      {/* Enhanced Pomodoro Dialog */}
      <EnhancedPomodoroDialog
        task={selectedTask}
        isOpen={showPomodoro}
        onClose={handlePomodoroClose}
      />
    </>
  );
}