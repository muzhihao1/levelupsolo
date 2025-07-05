import { useState, useEffect } from "react";
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
import { Search, Target, CheckSquare, Repeat, Zap } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Goal, Task } from "@shared/schema";

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
}

export default function TaskSelector({ isOpen, onClose }: TaskSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTaskType, setSelectedTaskType] = useState<'all' | 'goal' | 'task' | 'habit'>('all');
  const [, setLocation] = useLocation();

  // Fetch all available tasks from the unified API
  const { data: availableTasks, isLoading } = useQuery({
    queryKey: ['pomodoro-available-tasks'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/pomodoro/available-tasks');
      if (!response.ok) {
        throw new Error('Failed to fetch available tasks');
      }
      return response.json();
    },
    enabled: isOpen,
  });

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
      // Start pomodoro session for the selected task
      const endpoint = task.type === 'habit' 
        ? `/api/habits/${task.id}/start-pomodoro`
        : `/api/tasks/${task.id}/start-pomodoro`;
      
      const response = await apiRequest('POST', endpoint);
      if (response.ok) {
        // Navigate to the pomodoro timer
        setLocation(`/pomodoro?type=${task.type}&id=${task.id}`);
        onClose();
      }
    } catch (error) {
      console.error('Failed to start pomodoro:', error);
    }
  };

  const getTaskIcon = (type: UnifiedTask['type']) => {
    switch (type) {
      case 'goal':
        return <Target className="h-4 w-4" />;
      case 'task':
        return <CheckSquare className="h-4 w-4" />;
      case 'habit':
        return <Repeat className="h-4 w-4" />;
    }
  };

  const getTaskTypeLabel = (type: UnifiedTask['type']) => {
    switch (type) {
      case 'goal':
        return '主线任务';
      case 'task':
        return '支线任务';
      case 'habit':
        return '习惯';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>选择要挑战的任务</DialogTitle>
          <DialogDescription>
            选择一个任务开始25分钟的专注战斗
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索任务..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Type Filter */}
          <Tabs value={selectedTaskType} onValueChange={(v) => setSelectedTaskType(v as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value="goal">主线任务</TabsTrigger>
              <TabsTrigger value="task">支线任务</TabsTrigger>
              <TabsTrigger value="habit">习惯</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Task List */}
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-muted-foreground">加载中...</p>
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  没有找到可用的任务
                </div>
              ) : (
                filteredTasks.map((task) => (
                  <Card
                    key={`${task.type}-${task.id}`}
                    className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => handleTaskSelect(task)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          {getTaskIcon(task.type)}
                          <span className="text-sm">{getTaskTypeLabel(task.type)}</span>
                        </div>
                        <h3 className="font-medium flex-1">{task.title}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {task.energyBalls && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            {task.energyBalls}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}