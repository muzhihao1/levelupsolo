import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AIGeneratedLabel from "@/components/ai-generated-label";
import { 
  Play, 
  Pause, 
  CheckCircle, 
  Clock, 
  Target, 
  Zap,
  Calendar,
  Star,
  Timer,
  MoreVertical,
  Edit,
  Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Task } from "@shared/schema";

interface EnhancedTaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: number) => void;
  onStartTimer?: (task: Task) => void;
}

export default function EnhancedTaskCard({ task, onEdit, onDelete, onStartTimer }: EnhancedTaskCardProps) {
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Complete task mutation
  const completeTaskMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('PUT', `/api/tasks/${task.id}`, {
        ...task,
        completed: !task.completed
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=stats'] });
      toast({
        title: task.completed ? "任务重新打开" : "任务完成！",
        description: task.completed ? "任务已标记为未完成" : `获得 ${task.expReward || 10} 经验值`,
      });
    },
    onError: (error) => {
      console.error('Task completion failed:', error);
      toast({
        title: "操作失败",
        description: "无法更新任务状态，请重试",
        variant: "destructive",
      });
    }
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', `/api/tasks/${task.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=tasks'] });
      toast({
        title: "任务已删除",
        description: "任务已从列表中移除",
      });
    },
    onError: (error) => {
      console.error('Task deletion failed:', error);
      toast({
        title: "删除失败",
        description: "无法删除任务，请重试",
        variant: "destructive",
      });
    }
  });

  const handleComplete = () => {
    completeTaskMutation.mutate();
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(task.id);
    } else {
      deleteTaskMutation.mutate();
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(task);
    }
  };

  const handleStartTimer = () => {
    if (onStartTimer) {
      onStartTimer(task);
    } else {
      // Basic timer functionality
      setIsTimerRunning(true);
      toast({
        title: "计时器已启动",
        description: `开始执行任务: ${task.title}`,
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <Target className="h-3 w-3" />;
      case 'medium': return <Zap className="h-3 w-3" />;
      case 'low': return <Calendar className="h-3 w-3" />;
      default: return <Star className="h-3 w-3" />;
    }
  };

  const getDifficultyStars = (difficulty: string) => {
    const level = difficulty === 'hard' ? 3 : difficulty === 'medium' ? 2 : 1;
    return Array.from({ length: level }, (_, i) => (
      <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
    ));
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}分钟`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}小时${mins > 0 ? `${mins}分钟` : ''}`;
  };

  const progressPercentage = task.progress ? Math.round(task.progress * 100) : 0;

  return (
    <Card className={`
      transition-all duration-200 hover:shadow-lg border
      ${task.completed 
        ? 'bg-green-50 border-green-200 opacity-75' 
        : 'bg-white border-gray-200 hover:border-blue-300'
      }
      ${isTimerRunning ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
    `}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h3 className={`font-semibold text-sm ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                {task.title}
              </h3>
              {task.isAIGenerated && <AIGeneratedLabel type="task" size="sm" />}
            </div>
            
            {task.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {task.description}
              </p>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              {task.priority && (
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getPriorityColor(task.priority)} flex items-center gap-1`}
                >
                  {getPriorityIcon(task.priority)}
                  {task.priority === 'high' ? '高优先级' : 
                   task.priority === 'medium' ? '中优先级' : '低优先级'}
                </Badge>
              )}
              
              {task.difficulty && (
                <div className="flex items-center gap-1">
                  {getDifficultyStars(task.difficulty)}
                </div>
              )}

              {task.estimatedDuration && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDuration(task.estimatedDuration)}
                </div>
              )}

              {task.expReward && (
                <div className="flex items-center gap-1 text-xs text-blue-600">
                  <Star className="h-3 w-3" />
                  {task.expReward} XP
                </div>
              )}
            </div>

            {/* Progress bar for partially completed tasks */}
            {progressPercentage > 0 && progressPercentage < 100 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">进度</span>
                  <span className="font-medium">{progressPercentage}%</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                编辑
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleDelete} 
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-center gap-2">
          {/* Complete/Uncomplete Button */}
          <Button
            onClick={handleComplete}
            disabled={completeTaskMutation.isPending}
            variant={task.completed ? "outline" : "default"}
            size="sm"
            className={`flex-1 ${
              task.completed 
                ? 'border-green-200 text-green-700 hover:bg-green-50' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {task.completed ? '重新打开' : '完成任务'}
          </Button>

          {/* Timer Button */}
          {!task.completed && (
            <Button
              onClick={handleStartTimer}
              variant="outline"
              size="sm"
              className={`${
                isTimerRunning 
                  ? 'border-blue-200 text-blue-700 bg-blue-50' 
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              {isTimerRunning ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Timer className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Timer Display */}
        {isTimerRunning && (
          <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-700 font-medium">计时器运行中</span>
              <span className="text-blue-600 font-mono">
                {Math.floor(timerSeconds / 60).toString().padStart(2, '0')}:
                {(timerSeconds % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}