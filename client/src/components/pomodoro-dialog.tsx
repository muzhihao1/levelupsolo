import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, CheckCircle, Repeat, Zap } from "lucide-react";
import PomodoroTimer from "@/components/pomodoro-timer";
import type { Task } from "@shared/schema";

interface PomodoroDialogProps {
  task: {
    id: number;
    title: string;
    type: 'goal' | 'task' | 'habit';
    energyBalls: number;
    skillId?: number | null;
    category?: string;
    description?: string;
    difficulty?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function PomodoroDialog({ task, isOpen, onClose }: PomodoroDialogProps) {
  if (!task) return null;

  const getTaskIcon = (type: typeof task.type) => {
    switch (type) {
      case 'goal': return <Target className="h-5 w-5" />;
      case 'task': return <CheckCircle className="h-5 w-5" />;
      case 'habit': return <Repeat className="h-5 w-5" />;
    }
  };

  const getTaskTypeLabel = (type: typeof task.type) => {
    switch (type) {
      case 'goal': return '主线任务';
      case 'task': return '支线任务';
      case 'habit': return '日常习惯';
    }
  };

  const getTaskColor = (type: typeof task.type) => {
    switch (type) {
      case 'goal': return 'text-blue-500 bg-blue-500/10';
      case 'task': return 'text-purple-500 bg-purple-500/10';
      case 'habit': return 'text-green-500 bg-green-500/10';
    }
  };

  const handleComplete = () => {
    // Close dialog when timer completes
    onClose();
  };

  // Convert task format for PomodoroTimer
  const timerTask: Task = {
    id: task.id,
    title: task.title,
    taskCategory: task.type === 'habit' ? 'habit' : task.type === 'goal' ? 'goal' : 'todo',
    taskType: task.type === 'habit' ? 'daily' : 'once',
    estimatedDuration: 25,
    requiredEnergyBalls: task.energyBalls,
    skillId: task.skillId || null,
    completed: false,
    userId: '',
    createdAt: new Date(),
    expReward: 10,
    difficulty: task.difficulty || 'medium',
    tags: [],
    goalId: null,
    goalTags: null,
    actualDuration: null,
    accumulatedTime: 0,
    pomodoroSessionId: null,
    startedAt: null,
    completedAt: null,
    parentTaskId: null,
    order: 0,
    description: task.description || null
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-0">
          <Card className="border-0 shadow-none">
            <CardHeader className="px-0 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${getTaskColor(task.type)}`}>
                  {getTaskIcon(task.type)}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl">{task.title}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className={getTaskColor(task.type).replace('bg-', 'border-')}>
                      {getTaskTypeLabel(task.type)}
                    </Badge>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span>{task.energyBalls} 能量球</span>
                    </div>
                    {task.difficulty && (
                      <Badge variant="outline" className="text-xs">
                        {task.difficulty === 'easy' ? '简单' : 
                         task.difficulty === 'medium' ? '中等' : '困难'}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
        </DialogHeader>

        <div className="px-6 pb-6">
          <PomodoroTimer
            task={timerTask}
            onComplete={handleComplete}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}