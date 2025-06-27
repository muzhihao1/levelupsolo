import { useState, useEffect, useCallback } from "react";
import { setFloatingTimer } from "./global-floating-timer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Task } from "@shared/schema";

interface PomodoroTimerProps {
  task: Task;
  onComplete: () => void;
}

export default function PomodoroTimer({ task, onComplete }: PomodoroTimerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [duration, setDuration] = useState(task.estimatedDuration || 25);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [taskCompleted, setTaskCompleted] = useState(false);
  const [sessionElapsed, setSessionElapsed] = useState(0); // 当前会话已花费的时间（秒）
  const [sessionCount, setSessionCount] = useState(0); // 已完成的番茄钟轮数
  
  // Debug timer state
  useEffect(() => {
    console.log('Timer state change:', { 
      taskId: task.id, 
      isRunning, 
      isOpen, 
      timeLeft, 
      shouldShowFloating: isRunning && !isOpen 
    });
  }, [isRunning, isOpen, timeLeft, task.id]);

  // Update global floating timer when state changes
  useEffect(() => {
    if (isRunning && !isOpen) {
      setFloatingTimer({
        taskId: task.id,
        taskTitle: task.title,
        timeLeft,
        isRunning: true
      });
    } else {
      setFloatingTimer(null);
    }
  }, [isRunning, isOpen, timeLeft, task.id, task.title]);

  // Listen for reopen timer events
  useEffect(() => {
    const handleReopenTimer = (event: CustomEvent) => {
      if (event.detail.taskId === task.id) {
        setIsOpen(true);
      }
    };

    window.addEventListener('reopenPomodoroTimer', handleReopenTimer as EventListener);
    return () => {
      window.removeEventListener('reopenPomodoroTimer', handleReopenTimer as EventListener);
    };
  }, [task.id]);
  const { toast } = useToast();

  const startPomodoroMutation = useMutation({
    mutationFn: async (duration: number) => {
      const response = await apiRequest('POST', `/api/tasks/${task.id}/start-pomodoro`, { duration });
      return response.json();
    },
    onSuccess: (data) => {
      setSessionStartTime(new Date(data.startTime));
      setTimeLeft(duration * 60);
      setIsRunning(true);
      toast({
        title: "番茄钟已启动",
        description: `开始专注 ${duration} 分钟`,
      });
    }
  });

  const completePomodoroMutation = useMutation({
    mutationFn: async ({ sessionDuration, completed }: { sessionDuration: number; completed: boolean }) => {
      const response = await apiRequest('POST', `/api/tasks/${task.id}/complete-pomodoro`, {
        sessionDuration,
        completed
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=skills'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activity-logs'] });
      onComplete();
      setIsOpen(false);
      setIsRunning(false);
      toast({
        title: "番茄钟会话完成",
        description: taskCompleted ? "任务已完成！" : "专注时间已记录",
      });
    }
  });

  const handleTimerComplete = useCallback(() => {
    setIsRunning(false);
    
    // Enhanced notification with sound and visual alert
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('🍅 番茄钟完成！', {
        body: `${task.title} 的专注时间已完成，点击查看选项`,
        icon: '/favicon.ico',
        tag: 'pomodoro-complete',
        requireInteraction: true
      });
      
      notification.onclick = () => {
        setIsOpen(true);
        notification.close();
      };
    }

    // Play completion sound
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaZXiF7N5/Bg8kf8zx0n8pBSJ6v+zddCII');
      audio.volume = 0.1;
      audio.play().catch(() => {}); // Silent fail if audio doesn't work
    } catch (e) {
      // Silent fail
    }

    // 自动记录这一轮番茄钟的时间
    if (sessionStartTime) {
      const sessionSeconds = Math.floor((Date.now() - sessionStartTime.getTime()) / 1000);
      const sessionMinutes = Math.max(1, Math.floor(sessionSeconds / 60));
      
      setSessionCount(prev => prev + 1);
      
      completePomodoroMutation.mutate({
        sessionDuration: sessionMinutes,
        completed: false // 不自动完成任务，只记录时间
      });
    }

    // 重置计时器，但保持对话框打开让用户选择下一步
    setTimeLeft(0);
    setSessionStartTime(null);
    
    // Show dialog if not visible
    if (!isOpen) {
      setIsOpen(true);
    }
    
    toast({
      title: "🍅 番茄钟完成！",
      description: "已记录专注时间，可选择完成任务或开始新一轮",
      duration: 10000
    });
  }, [task.title, toast, sessionStartTime, completePomodoroMutation, isOpen]);

  // Timer countdown effect - 基于时间戳的精确计时
  useEffect(() => {
    if (!isRunning) return;
    
    const startTimestamp = Date.now();
    const initialTimeLeft = timeLeft;
    
    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
      const newTimeLeft = Math.max(0, initialTimeLeft - elapsed);
      
      setTimeLeft((prev) => {
        if (newTimeLeft !== prev) {
          if (newTimeLeft <= 0 && prev > 0) {
            // Timer finished - 在下一个事件循环中处理完成逻辑
            setTimeout(() => handleTimerComplete(), 0);
            return 0;
          }
          return newTimeLeft;
        }
        return prev;
      });
    };
    
    const interval = setInterval(updateTimer, 100); // 更频繁更新以确保精确度
    
    return () => clearInterval(interval);
  }, [isRunning, handleTimerComplete]);

  const handleStartTimer = () => {
    if (isRunning) return;
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          toast({
            title: "通知已启用",
            description: "番茄钟完成时将发送桌面通知提醒",
          });
        }
      });
    }
    
    // Reset timer state for new session
    setTimeLeft(duration * 60);
    setTaskCompleted(false);
    
    startPomodoroMutation.mutate(duration);
  };

  const handlePauseTimer = () => {
    if (!sessionStartTime) return;
    
    // 计算当前会话的实际秒数
    const sessionSeconds = Math.floor((Date.now() - sessionStartTime.getTime()) / 1000);
    const sessionMinutes = Math.max(1, Math.floor(sessionSeconds / 60)); // 至少记录1分钟
    
    completePomodoroMutation.mutate({
      sessionDuration: sessionMinutes,
      completed: false
    });
  };

  const handleCompleteTask = () => {
    if (!sessionStartTime) return;
    
    // 计算当前会话的实际秒数
    const sessionSeconds = Math.floor((Date.now() - sessionStartTime.getTime()) / 1000);
    const sessionMinutes = Math.max(1, Math.floor(sessionSeconds / 60)); // 至少记录1分钟
    
    completePomodoroMutation.mutate({
      sessionDuration: sessionMinutes,
      completed: true
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

}

  const progress = duration > 0 ? ((duration * 60 - timeLeft) / (duration * 60)) * 100 : 0;

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        size="sm"
        className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
        disabled={task.completed}
      >
        <i className="fas fa-clock mr-1"></i>
        番茄钟
      </Button>

      {/* Debug state display */}
      <div className="fixed top-4 left-4 bg-black text-white p-2 text-xs z-[999999]">
        Timer Debug: running={isRunning.toString()}, open={isOpen.toString()}, time={timeLeft}
      </div>

      {/* Test floating widget */}
      {isRunning && !isOpen && (
        <div 
          className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg cursor-pointer"
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '16px', 
            right: '16px',
            zIndex: 999999
          }}
        >
          <div className="text-center">
            <div className="text-2xl mb-1">🍅</div>
            <div className="text-lg font-bold">{formatTime(timeLeft)}</div>
            <div className="text-xs">{task.title}</div>
          </div>
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open && !isRunning) {
          // Reset session counter when completely closing dialog and timer is not running
          setSessionCount(0);
          setTaskCompleted(false);
        }
      }}>
        <DialogContent className="w-[95vw] max-w-md h-[90vh] max-h-none bg-card border-border p-4 sm:p-6" aria-describedby="pomodoro-description">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-foreground flex items-center text-lg sm:text-xl">
              <i className="fas fa-tomato text-red-500 mr-2"></i>
              番茄钟计时器
            </DialogTitle>
          </DialogHeader>
          <div id="pomodoro-description" className="sr-only">
            番茄钟专注计时器，帮助您集中注意力完成任务
          </div>

          <div className="space-y-4 overflow-y-auto flex-1">
            {/* Task Info */}
            <div className="bg-slate-700 rounded-lg p-3 sm:p-4">
              <h4 className="font-medium text-white mb-2 text-sm sm:text-base truncate">{task.title}</h4>
              <div className="flex justify-between gap-2 text-xs sm:text-sm">
                <div className="flex flex-col items-center">
                  <span className="text-gray-300">预估时长</span>
                  <span className="text-cyan-400 font-medium">{task.estimatedDuration || 25} 分钟</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-gray-300">已投入</span>
                  <span className="text-orange-400 font-medium">{task.accumulatedTime || 0} 分钟</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-gray-300">本次轮数</span>
                  <span className="text-purple-400 font-medium">{sessionCount} 轮</span>
                </div>
              </div>
              {task.accumulatedTime && task.accumulatedTime > (task.estimatedDuration || 25) && (
                <div className="mt-2 text-xs text-yellow-400 bg-yellow-400/10 rounded px-2 py-1">
                  <i className="fas fa-info-circle mr-1"></i>
                  已超出预估时长，可考虑拆分任务或调整预估
                </div>
              )}
            </div>

            {/* Timer Settings (only when not running and not completed) */}
            {!isRunning && !(timeLeft === 0 && sessionStartTime === null) && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    专注时长（分钟）
                  </label>
                  <Input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 25)}
                    min={5}
                    max={90}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="text-xs text-gray-400 bg-slate-600/50 rounded p-3">
                  <i className="fas fa-lightbulb mr-1 text-yellow-400"></i>
                  <strong className="text-white">优化后的番茄钟：</strong><br/>
                  • 到时间后自动暂停，不会无限累积时间<br/>
                  • 自动记录专注时间到任务历史<br/>
                  • 可选择完成任务或开始新一轮专注<br/>
                  • 建议25分钟为一个专注周期
                </div>
              </div>
            )}

            {/* Timer Display */}
            {isRunning && (
              <div className="text-center space-y-4 py-4 sm:py-6">
                <div className="text-4xl sm:text-6xl font-mono font-bold text-white">
                  {formatTime(timeLeft)}
                </div>
                <Progress value={progress} className="h-2 sm:h-4" />
                <div className="text-xs sm:text-sm text-gray-400">
                  {Math.floor(progress)}% 完成
                </div>
              </div>
            )}

            {/* Timer finished options */}
            {!isRunning && timeLeft === 0 && sessionStartTime === null && (
              <div className="bg-green-500/20 rounded-lg p-4 border border-green-500/30">
                <div className="flex items-center space-x-3 mb-4">
                  <i className="fas fa-check-circle text-green-400 text-xl"></i>
                  <span className="text-white font-medium">番茄钟完成！时间已记录</span>
                </div>
                <div className="text-sm text-gray-300 mb-4">
                  您可以选择完成任务，或者开始新一轮专注时间
                </div>
                
                {/* Multiple session support */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      checked={taskCompleted}
                      onCheckedChange={(checked) => setTaskCompleted(checked === true)}
                      id="task-completed"
                    />
                    <label htmlFor="task-completed" className="text-sm text-gray-300">
                      任务已完成
                    </label>
                  </div>
                  
                  {!taskCompleted && (
                    <div className="bg-blue-500/20 rounded p-3 border border-blue-500/30">
                      <div className="text-sm text-blue-300 mb-2">
                        <i className="fas fa-info-circle mr-1"></i>
                        需要继续专注？
                      </div>
                      <div className="text-xs text-gray-400 mb-2">
                        已完成 {sessionCount} 轮番茄钟，大任务通常需要多个番茄钟。
                      </div>
                      <div className="text-xs text-gray-400">
                        建议：每4轮休息15-30分钟，保持良好的专注节奏。
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {!isRunning ? (
                <>
                  <Button
                    onClick={handleStartTimer}
                    disabled={startPomodoroMutation.isPending}
                    className="w-full sm:flex-1 bg-gradient-to-r from-green-500 to-cyan-500 h-12 text-base font-medium"
                  >
                    <i className="fas fa-play mr-2"></i>
                    开始专注
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    className="w-full sm:flex-1 h-12"
                  >
                    取消
                  </Button>
                </>
              ) : timeLeft === 0 && sessionStartTime === null ? (
                // Timer completed, show final options
                <>
                  <Button
                    onClick={handleCompleteTask}
                    disabled={completePomodoroMutation.isPending}
                    className="w-full sm:flex-1 bg-gradient-to-r from-green-500 to-cyan-500 h-12 text-base font-medium"
                  >
                    <i className="fas fa-check mr-2"></i>
                    {taskCompleted ? '完成任务' : '结束工作'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleStartTimer}
                    disabled={startPomodoroMutation.isPending}
                    className="w-full sm:flex-1 h-12 border-blue-500 text-blue-400 hover:bg-blue-500/10"
                  >
                    <i className="fas fa-plus mr-2"></i>
                    开始第 {sessionCount + 1} 轮
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={handlePauseTimer}
                    disabled={completePomodoroMutation.isPending}
                    variant="destructive"
                    className="w-full sm:flex-1 h-12 text-base font-medium"
                  >
                    <i className="fas fa-pause mr-2"></i>
                    暂停任务
                  </Button>
                  <Button
                    onClick={handleCompleteTask}
                    disabled={completePomodoroMutation.isPending}
                    className="w-full sm:flex-1 bg-gradient-to-r from-green-500 to-cyan-500 h-12 text-base font-medium"
                  >
                    <i className="fas fa-check mr-2"></i>
                    提前完成
                  </Button>
                </>
              )}
            </div>

            {/* Tips */}
            <div className="text-xs text-gray-400 text-center space-y-1">
              <p>💡 专注时请尽量避免分心</p>
              <p>🔔 浏览器通知需要您的授权</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}