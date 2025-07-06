import { useState, useEffect, useCallback } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { X, Pause, Play, CheckCircle, XCircle, Minimize2 } from "lucide-react";
import { setFloatingTimer } from "./global-floating-timer";

interface EnhancedPomodoroDialogProps {
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

export default function EnhancedPomodoroDialog({ task, isOpen, onClose }: EnhancedPomodoroDialogProps) {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25分钟
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
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
    }
  });

  // 完成番茄钟API
  const completePomodoroMutation = useMutation({
    mutationFn: async ({ completed, isGiveUp = false }: { completed: boolean; isGiveUp?: boolean }) => {
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
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      
      if (variables.isGiveUp) {
        toast({
          title: "已放弃任务",
          description: "任务进度已保存",
          variant: "destructive"
        });
      } else {
        toast({
          title: variables.completed ? "任务已完成" : "番茄钟结束",
          description: "任务进度已更新",
        });
      }
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

  // 更新悬浮窗状态
  useEffect(() => {
    if (isMinimized && isRunning && task) {
      setFloatingTimer({
        taskId: task.id,
        taskTitle: task.title,
        timeLeft,
        isRunning: true
      });
    } else {
      setFloatingTimer(null);
    }
  }, [isMinimized, isRunning, timeLeft, task]);

  // 监听重新打开事件
  useEffect(() => {
    const handleReopenTimer = (event: CustomEvent) => {
      if (event.detail.taskId === task?.id) {
        setIsMinimized(false);
      }
    };

    window.addEventListener('reopenPomodoroTimer', handleReopenTimer as EventListener);
    return () => {
      window.removeEventListener('reopenPomodoroTimer', handleReopenTimer as EventListener);
    };
  }, [task?.id]);

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
    completePomodoroMutation.mutate({ completed: markAsCompleted });
    
    // 关闭对话框
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  const handleGiveUp = () => {
    if (window.confirm('确定要放弃这个任务吗？已经计时的进度会被保存。')) {
      setIsRunning(false);
      setIsPaused(false);
      
      if (sessionStartTime) {
        completePomodoroMutation.mutate({ completed: false, isGiveUp: true });
      }
      
      setTimeout(() => {
        onClose();
      }, 500);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    return ((TOTAL_TIME - timeLeft) / TOTAL_TIME) * 100;
  };

  if (!task || isMinimized) return null;

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={() => {}}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content 
          className={cn(
            "fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%]",
            "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl duration-200 sm:rounded-xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
            "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
            "p-0 overflow-hidden"
          )}
        >
        <div className="relative">
          {/* 头部区域 */}
          <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-5 flex items-center justify-between">
            <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-white truncate flex-1 mr-4">
              {task.title}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg"
              onClick={handleMinimize}
              title="最小化到悬浮窗"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>

          {/* 主要内容 */}
          <div className="p-6 sm:p-8 text-center bg-gray-50 dark:bg-gray-800/50">
            {/* 任务信息 */}
            <div className="mb-4 sm:mb-6 text-sm sm:text-base text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 shadow-sm">
              <span className="text-gray-700 dark:text-gray-200">专注时间：</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold">25分钟</span>
              <span className="mx-2 text-gray-400 dark:text-gray-500">•</span>
              <span className="text-gray-700 dark:text-gray-200">消耗能量球：</span>
              <span className="text-orange-600 dark:text-orange-400 font-semibold">{task.energyBalls} 个</span>
            </div>

            {/* 计时器 */}
            <div className="mb-8">
              <div className="text-5xl sm:text-6xl lg:text-7xl font-mono font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
                {formatTime(timeLeft)}
              </div>
              <Progress 
                value={getProgress()} 
                className="h-4 mb-3 bg-gray-200 dark:bg-gray-700" 
              />
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 font-medium">
                {Math.floor(getProgress())}% 完成
              </p>
            </div>

            {/* 控制按钮 */}
            <div className="space-y-3">
              {/* 第一行：暂停/继续 和 完成任务 */}
              <div className="flex justify-center gap-3">
                <Button
                  variant="outline"
                  size="default"
                  onClick={handlePause}
                  disabled={!isRunning || timeLeft === 0}
                  className="w-24 sm:w-32 h-10 sm:h-12 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 text-sm sm:text-base transition-colors"
                >
                  {isPaused ? (
                    <>
                      <Play className="h-3 sm:h-4 w-3 sm:w-4 mr-1 sm:mr-2" />
                      继续
                    </>
                  ) : (
                    <>
                      <Pause className="h-3 sm:h-4 w-3 sm:w-4 mr-1 sm:mr-2" />
                      暂停
                    </>
                  )}
                </Button>
                <Button
                  size="default"
                  onClick={() => handleComplete(true)}
                  disabled={timeLeft === 0}
                  className="w-24 sm:w-32 h-10 sm:h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-sm sm:text-base shadow-md hover:shadow-lg transition-all"
                >
                  <CheckCircle className="h-3 sm:h-4 w-3 sm:w-4 mr-1 sm:mr-2" />
                  完成任务
                </Button>
              </div>

              {/* 第二行：放弃任务 */}
              <Button
                variant="destructive"
                size="sm"
                onClick={handleGiveUp}
                className="bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 text-xs sm:text-sm h-8 sm:h-9 transition-colors"
              >
                <XCircle className="h-3 sm:h-4 w-3 sm:w-4 mr-1 sm:mr-2" />
                放弃任务
              </Button>
            </div>

            {/* 提示信息 */}
            {isPaused && (
              <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5">
                任务已暂停，点击继续按钮恢复计时
              </div>
            )}
          </div>
        </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}