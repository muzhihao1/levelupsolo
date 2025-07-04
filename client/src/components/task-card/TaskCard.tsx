import React, { memo } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Task, Skill } from "@shared/schema";
import { 
  CheckCircle, 
  Circle, 
  Timer, 
  Target, 
  Zap, 
  Trash2, 
  Play,
  Pause,
  RotateCcw,
  Flame
} from "lucide-react";

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

/**
 * TaskCard Component
 * Displays a single task with all its interactive elements
 * Extracted from unified-rpg-task-manager.tsx for better maintainability
 */
export const TaskCard = memo(function TaskCard({ 
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
  const isCompleted = task.completed;
  const isPomodoroActive = pomodoroState?.taskId === task.id && pomodoroState.isRunning;
  const isPomodoroTaskPaused = pomodoroState?.taskId === task.id && !pomodoroState.isRunning && pomodoroState.timeLeft < pomodoroState.totalTime;
  const hasEnoughEnergy = !userStats || userStats.energyBalls >= (task.requiredEnergyBalls || 1);
  const linkedSkill = skills?.find(s => s.id === task.skillId);

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'hard': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getDifficultyLabel = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return '简单';
      case 'medium': return '中等';
      case 'hard': return '困难';
      default: return '未知';
    }
  };

  const handleCompleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onComplete(task.id);
  };

  return (
    <Card className={`group relative ${isCompleted ? 'opacity-60' : ''} hover:shadow-md transition-all border-border bg-card`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              {/* 完成状态图标 */}
              <button
                onClick={handleCompleteClick}
                className="flex-shrink-0 hover:scale-110 transition-transform"
              >
                {isCompleted ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                )}
              </button>
              
              {/* 任务标题 */}
              <h3 className={`font-medium text-foreground ${isCompleted ? 'line-through' : ''}`}>
                {task.title}
              </h3>
            </div>
            
            {/* 任务描述 */}
            {task.description && (
              <p className="text-sm text-muted-foreground ml-7">{task.description}</p>
            )}
          </div>
          
          {/* 右侧操作按钮 */}
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isCompleted && onStartPomodoro && hasEnoughEnergy && !isPomodoroActive && !isPomodoroTaskPaused && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onStartPomodoro(task.id)}
                className="h-8 w-8 p-0"
              >
                <Timer className="h-4 w-4" />
              </Button>
            )}
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(task.id)}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* 任务属性标签 */}
          <div className="flex items-center gap-2 flex-wrap">
            {linkedSkill && (
              <Badge variant="secondary" className="text-xs">
                {getIconEmoji(linkedSkill.icon)} {linkedSkill.name}
              </Badge>
            )}
            
            {task.difficulty && (
              <Badge variant="outline" className={`text-xs ${getDifficultyColor(task.difficulty)}`}>
                {getDifficultyLabel(task.difficulty)}
              </Badge>
            )}
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                {task.expReward || 0} XP
              </span>
              <span className="flex items-center gap-1">
                ⚡ {task.requiredEnergyBalls || 1}
                {!hasEnoughEnergy && (
                  <span className="text-destructive ml-1">
                    (能量不足)
                  </span>
                )}
              </span>
            </div>
            
            {/* 习惯连击显示 */}
            {task.taskCategory === "habit" && task.completed && (
              <div className="flex items-center gap-2 text-secondary">
                <Flame className="h-4 w-4" />
                <span className="font-medium text-sm">已完成</span>
              </div>
            )}
          </div>
          
          {/* 番茄钟进度 */}
          {(isPomodoroActive || isPomodoroTaskPaused) && pomodoroState && formatTime && (
            <div className="space-y-2 p-3 bg-primary/5 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-primary">
                  {pomodoroState.isBreak ? '休息时间' : '专注时间'}
                </span>
                <span className="text-lg font-mono font-bold text-primary">
                  {formatTime(pomodoroState.timeLeft)}
                </span>
              </div>
              
              <Progress 
                value={(1 - pomodoroState.timeLeft / pomodoroState.totalTime) * 100} 
                className="h-2"
              />
              
              <div className="flex items-center gap-2">
                {isPomodoroActive ? (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={onPausePomodoro}
                    className="h-7 px-2"
                  >
                    <Pause className="h-3 w-3" />
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={onResumePomodoro}
                    className="h-7 px-2"
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={onResetPomodoro}
                  className="h-7 px-2"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
          
          {/* 任务标签 */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {task.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

export default TaskCard;