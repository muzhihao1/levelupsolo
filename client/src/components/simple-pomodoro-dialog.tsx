import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { X, Pause, Play, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SimplePomodoroDialogProps {
  task: {
    id: number;
    title: string;
    type: 'goal' | 'task' | 'habit';
    energyBalls: number;
    skillId?: number | null;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function SimplePomodoroDialog({ task, isOpen, onClose }: SimplePomodoroDialogProps) {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25分钟
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const { toast } = useToast();
  
  const TOTAL_TIME = 25 * 60; // 总时间25分钟

  // 启动番茄钟API
  const startPomodoroMutation = useMutation({
    mutationFn: async () => {
      if (!task) return;
      const response = await apiRequest('POST', `/api/tasks/${task.id}/start-pomodoro`, { 
        duration: 25 
      });
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Pomodoro started:', data);
    },
    onError: (error) => {
      console.error('Failed to start pomodoro:', error);
      // 即使API失败也继续计时
    }
  });

  // 完成番茄钟API
  const completePomodoroMutation = useMutation({
    mutationFn: async (completed: boolean) => {
      if (!task || !sessionStartTime) return;
      
      const sessionSeconds = Math.floor((Date.now() - sessionStartTime.getTime()) / 1000);
      const sessionMinutes = Math.max(1, Math.floor(sessionSeconds / 60));
      
      const endpoint = task.type === 'habit' 
        ? `/api/habits/${task.id}/complete-pomodoro`
        : `/api/tasks/${task.id}/complete-pomodoro`;
      
      const response = await apiRequest('POST', endpoint, {
        sessionDuration: sessionMinutes,
        completed: completed,
        actualEnergyBalls: Math.ceil(sessionMinutes / 15),
        cycles: 1
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      toast({
        title: "番茄钟完成",
        description: "任务进度已更新",
      });
    }
  });

  // 当对话框打开且有任务时，自动开始计时
  useEffect(() => {
    if (isOpen && task && !isRunning && !isPaused) {
      handleStart();
    }
  }, [isOpen, task]);

  // 计时器逻辑
  useEffect(() => {
    if (!isRunning || isPaused) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleComplete(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, isPaused]);

  const handleStart = () => {
    setIsRunning(true);
    setIsPaused(false);
    setSessionStartTime(new Date());
    setTimeLeft(TOTAL_TIME);
    
    // 启动番茄钟
    startPomodoroMutation.mutate();
    
    // 请求通知权限
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleComplete = (markAsCompleted: boolean) => {
    setIsRunning(false);
    setIsPaused(false);
    
    // 发送通知
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('番茄钟完成！', {
        body: `任务"${task?.title}"的专注时间结束了`,
        icon: '🍅'
      });
    }
    
    // 提交完成状态
    completePomodoroMutation.mutate(markAsCompleted);
    
    // 关闭对话框
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const handleCancel = () => {
    if (isRunning && sessionStartTime) {
      // 如果已经开始，记录进度
      completePomodoroMutation.mutate(false);
    }
    setIsRunning(false);
    setIsPaused(false);
    onClose();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    return ((TOTAL_TIME - timeLeft) / TOTAL_TIME) * 100;
  };

  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <div className="relative">
          {/* 关闭按钮 */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 z-10"
            onClick={handleCancel}
          >
            <X className="h-4 w-4" />
          </Button>

          {/* 主要内容 */}
          <div className="p-6 text-center">
            {/* 任务标题 */}
            <h3 className="text-lg font-medium mb-6 px-8">{task.title}</h3>

            {/* 计时器 */}
            <div className="mb-8">
              <div className="text-6xl font-mono font-bold mb-4">
                {formatTime(timeLeft)}
              </div>
              <Progress value={getProgress()} className="h-2 mb-2" />
              <p className="text-sm text-muted-foreground">
                {Math.floor(getProgress())}% 完成
              </p>
            </div>

            {/* 控制按钮 */}
            <div className="flex justify-center gap-3">
              <Button
                variant="outline"
                size="lg"
                onClick={handlePause}
                disabled={!isRunning || timeLeft === 0}
                className="w-32"
              >
                {isPaused ? (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    继续
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    暂停
                  </>
                )}
              </Button>
              <Button
                size="lg"
                onClick={() => handleComplete(true)}
                disabled={timeLeft === 0}
                className="w-32"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                完成任务
              </Button>
            </div>

            {/* 提示信息 */}
            <div className="mt-6 text-xs text-muted-foreground">
              <p>专注时间：25分钟</p>
              <p>消耗能量球：{task.energyBalls} 个</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}