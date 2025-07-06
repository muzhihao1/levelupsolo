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

type PomodoroState = 'idle' | 'working' | 'resting' | 'waiting';

export default function PomodoroTimer({ task, onComplete }: PomodoroTimerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [duration, setDuration] = useState(task.estimatedDuration || 25);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [taskCompleted, setTaskCompleted] = useState(false);
  const [sessionElapsed, setSessionElapsed] = useState(0); // 当前会话已花费的时间（秒）
  const [sessionCount, setSessionCount] = useState(0); // 已完成的番茄钟轮数
  const [pomodoroState, setPomodoroState] = useState<PomodoroState>('idle');
  const [totalWorkTime, setTotalWorkTime] = useState(0); // 总工作时间（分钟）
  const [cycleStartTime, setCycleStartTime] = useState<Date | null>(null); // 当前周期开始时间
  const WORK_DURATION = 25; // 工作时长（分钟）
  const REST_DURATION = 5; // 休息时长（分钟）
  
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
    mutationFn: async ({ sessionDuration, completed, actualEnergyBalls, cycles }: { 
      sessionDuration: number; 
      completed: boolean;
      actualEnergyBalls?: number;
      cycles?: number;
    }) => {
      const endpoint = task.taskCategory === 'habit' 
        ? `/api/habits/${task.id}/complete-pomodoro`
        : `/api/tasks/${task.id}/complete-pomodoro`;
      
      const response = await apiRequest('POST', endpoint, {
        sessionDuration,
        completed,
        workDuration: sessionDuration,
        restDuration: 0,
        cyclesCompleted: cycles || 1,
        actualEnergyBalls: actualEnergyBalls || Math.ceil(sessionDuration / 15)
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=skills'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activity-logs'] });
      onComplete();
      setIsOpen(false);
      setIsRunning(false);
      setPomodoroState('idle');
      setTotalWorkTime(0);
      setSessionCount(0);
      toast({
        title: "击败Boss成功！",
        description: `消耗${data?.actualEnergyBalls || 0}个能量球，获得${data?.expGained || 0}经验值`,
      });
    }
  });

  const handleTimerComplete = useCallback(() => {
    if (pomodoroState === 'working') {
      // 工作时间结束，记录工作时间并进入休息
      if (cycleStartTime) {
        const workMinutes = Math.floor((Date.now() - cycleStartTime.getTime()) / 1000 / 60);
        setTotalWorkTime(prev => prev + workMinutes);
      }
      
      // 播放完成音效
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaZXiF7N5/Bg8kf8zx0n8pBSJ6v+zddCII');
        audio.volume = 0.1;
        audio.play().catch(() => {});
      } catch (e) {}
      
      // 发送通知
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('⚔️ 战斗完成！', {
          body: '开始5分钟休息时间',
          icon: '/favicon.ico',
          tag: 'pomodoro-work-complete'
        });
      }
      
      toast({
        title: "⚔️ 战斗完成！",
        description: "开始5分钟休息时间",
        duration: 5000
      });
      
      // 自动进入休息状态
      setPomodoroState('resting');
      setTimeLeft(REST_DURATION * 60);
      setCycleStartTime(new Date());
      // 继续运行计时器
      
    } else if (pomodoroState === 'resting') {
      // 休息时间结束
      setSessionCount(prev => prev + 1);
      
      // 播放完成音效
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaZXiF7N5/Bg8kf8zx0n8pBSJ6v+zddCII');
        audio.volume = 0.1;
        audio.play().catch(() => {});
      } catch (e) {}
      
      // 发送通知
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification('🛡️ 休息结束！', {
          body: '准备开始下一轮战斗',
          icon: '/favicon.ico',
          tag: 'pomodoro-rest-complete',
          requireInteraction: true
        });
        
        notification.onclick = () => {
          setIsOpen(true);
          notification.close();
        };
      }
      
      toast({
        title: "🛡️ 休息结束！",
        description: "可以开始下一轮战斗了",
        duration: 10000
      });
      
      // 进入等待状态
      setPomodoroState('waiting');
      setIsRunning(false);
      setTimeLeft(0);
      
      // 显示对话框让用户选择
      if (!isOpen) {
        setIsOpen(true);
      }
    }
  }, [pomodoroState, cycleStartTime, toast, isOpen]);

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
    
    // 设置为工作状态
    setPomodoroState('working');
    setTimeLeft(WORK_DURATION * 60);
    setCycleStartTime(new Date());
    setTaskCompleted(false);
    
    // 如果是第一次开始，记录会话开始时间
    if (!sessionStartTime) {
      setSessionStartTime(new Date());
    }
    
    startPomodoroMutation.mutate(WORK_DURATION);
  };
  
  const handleContinueBattle = () => {
    // 继续新一轮战斗
    setPomodoroState('working');
    setTimeLeft(WORK_DURATION * 60);
    setCycleStartTime(new Date());
    setIsRunning(true);
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

  const handleDefeatBoss = () => {
    // 击败Boss，结束整个番茄钟会话
    const currentWorkTime = pomodoroState === 'working' && cycleStartTime 
      ? Math.floor((Date.now() - cycleStartTime.getTime()) / 1000 / 60)
      : 0;
    
    const finalTotalTime = totalWorkTime + currentWorkTime;
    const actualEnergyBalls = Math.ceil(finalTotalTime / 15); // 每15分钟1个能量球
    
    setIsRunning(false);
    setPomodoroState('idle');
    
    // 提交完成数据
    completePomodoroMutation.mutate({
      sessionDuration: finalTotalTime,
      completed: taskCompleted,
      actualEnergyBalls: actualEnergyBalls,
      cycles: sessionCount + (pomodoroState === 'working' ? 1 : 0)
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getProgressValue = () => {
    if (pomodoroState === 'working') {
      return ((WORK_DURATION * 60 - timeLeft) / (WORK_DURATION * 60)) * 100;
    } else if (pomodoroState === 'resting') {
      return ((REST_DURATION * 60 - timeLeft) / (REST_DURATION * 60)) * 100;
    }
    return 0;
  };

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
        挑战Boss
      </Button>

      {/* Debug state display - Remove in production */}
      {/* <div className="fixed top-4 left-4 bg-black text-white p-2 text-xs z-[999999]">
        State: {pomodoroState}, running={isRunning.toString()}, time={timeLeft}
      </div> */}

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
        <DialogContent className="w-[95vw] max-w-md h-[90vh] max-h-none bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 p-4 sm:p-6 shadow-2xl" aria-describedby="pomodoro-description">
          <DialogHeader className="pb-4 border-b border-gray-200 dark:border-gray-700">
            <DialogTitle className="text-gray-900 dark:text-white flex items-center text-lg sm:text-xl lg:text-2xl font-semibold">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center mr-3">
                <i className="fas fa-clock text-white"></i>
              </div>
              番茄钟计时器
            </DialogTitle>
          </DialogHeader>
          <div id="pomodoro-description" className="sr-only">
            番茄钟专注计时器，帮助您集中注意力完成任务
          </div>

          <div className="space-y-4 overflow-y-auto flex-1">
            {/* Task Info */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm sm:text-base lg:text-lg truncate">{task.title}</h4>
              <div className="flex justify-between gap-2 text-xs sm:text-sm lg:text-base">
                <div className="flex flex-col items-center">
                  <span className="text-gray-600 dark:text-gray-400">预估时长</span>
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">{task.estimatedDuration || 25} 分钟</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-gray-600 dark:text-gray-400">已投入</span>
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">{task.accumulatedTime || 0} 分钟</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-gray-600 dark:text-gray-400">本次轮数</span>
                  <span className="text-purple-600 dark:text-purple-400 font-semibold">{sessionCount} 轮</span>
                </div>
              </div>
              {task.accumulatedTime && task.accumulatedTime > (task.estimatedDuration || 25) && (
                <div className="mt-2 text-xs text-yellow-400 bg-yellow-400/10 rounded px-2 py-1">
                  <i className="fas fa-info-circle mr-1"></i>
                  已超出预估时长，可考虑拆分任务或调整预估
                </div>
              )}
            </div>

            {/* Timer Settings (only when idle) */}
            {pomodoroState === 'idle' && (
              <div className="space-y-4">
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4">
                  <i className="fas fa-lightbulb mr-1 text-blue-600 dark:text-blue-400"></i>
                  <strong className="text-gray-800 dark:text-gray-200">新版番茄钟战斗系统：</strong><br/>
                  • 25分钟战斗 → 5分钟休息（自动切换）<br/>
                  • 根据实际战斗时间计算能量球消耗<br/>
                  • 支持多轮战斗，灵活击败Boss<br/>
                  • 每日战报统计你的战斗成果
                </div>
              </div>
            )}

            {/* Timer Display based on state */}
            {pomodoroState === 'working' && (
              <div className="text-center space-y-4 py-4 sm:py-6">
                <div className="flex items-center justify-center mb-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mr-3 animate-pulse">
                    <i className="fas fa-fire text-white text-xl"></i>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">战斗中...</h3>
                </div>
                <div className="text-4xl sm:text-5xl lg:text-6xl font-mono font-bold text-gray-900 dark:text-white">
                  {formatTime(timeLeft)}
                </div>
                <Progress value={getProgressValue()} className="h-4 sm:h-5 bg-gray-200 dark:bg-gray-700" />
                <div className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                  第 {sessionCount + 1} 轮战斗 • {Math.floor(getProgressValue())}% 完成
                </div>
              </div>
            )}
            
            {pomodoroState === 'resting' && (
              <div className="text-center space-y-4 py-4 sm:py-6">
                <div className="flex items-center justify-center mb-2">
                  <i className="fas fa-shield text-blue-500 text-2xl mr-2"></i>
                  <h3 className="text-xl font-bold text-white">休息中...</h3>
                </div>
                <div className="text-3xl sm:text-5xl lg:text-6xl font-mono font-bold text-blue-400">
                  {formatTime(timeLeft)}
                </div>
                <Progress value={getProgressValue()} className="h-4 sm:h-5 bg-gray-200 dark:bg-gray-700" />
                <div className="text-[10px] sm:text-xs lg:text-sm text-gray-400">
                  休息结束后将继续下一轮战斗
                </div>
              </div>
            )}
            
            {pomodoroState === 'waiting' && (
              <div className="bg-green-500/20 rounded-lg p-4 border border-green-500/30">
                <div className="flex items-center space-x-3 mb-4">
                  <i className="fas fa-check-circle text-green-400 text-xl"></i>
                  <span className="text-white font-medium">第 {sessionCount} 轮战斗完成！</span>
                </div>
                <div className="text-sm text-gray-300 mb-4">
                  已累计战斗 {totalWorkTime} 分钟，消耗 {Math.ceil(totalWorkTime / 15)} 个能量球
                </div>
                <div className="flex items-center space-x-2 mb-3">
                  <Checkbox 
                    checked={taskCompleted}
                    onCheckedChange={(checked) => setTaskCompleted(checked === true)}
                    id="task-completed"
                  />
                  <label htmlFor="task-completed" className="text-sm text-gray-300">
                    任务已完成
                  </label>
                </div>
              </div>
            )}


            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {pomodoroState === 'idle' && (
                <>
                  <Button
                    onClick={handleStartTimer}
                    disabled={startPomodoroMutation.isPending}
                    className="w-full sm:flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90 h-10 sm:h-12 text-sm sm:text-base font-medium text-white shadow-md hover:shadow-lg transition-all"
                  >
                    <i className="fas fa-swords mr-2"></i>
                    开始战斗
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    className="w-full sm:flex-1 h-10 sm:h-12 text-sm sm:text-base bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    取消
                  </Button>
                </>
              )}
              
              {(pomodoroState === 'working' || pomodoroState === 'resting') && (
                <>
                  <Button
                    onClick={handleDefeatBoss}
                    disabled={completePomodoroMutation.isPending}
                    className="w-full sm:flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 h-10 sm:h-12 text-sm sm:text-base font-medium text-white shadow-md hover:shadow-lg transition-all"
                  >
                    <i className="fas fa-trophy mr-2"></i>
                    击败Boss
                  </Button>
                  <Button
                    onClick={handlePauseTimer}
                    disabled={completePomodoroMutation.isPending}
                    variant="destructive"
                    className="w-full sm:flex-1 h-10 sm:h-12 text-sm sm:text-base font-medium bg-red-500 hover:bg-red-600 transition-colors"
                  >
                    <i className="fas fa-pause mr-2"></i>
                    暂停任务
                  </Button>
                </>
              )}
              
              {pomodoroState === 'waiting' && (
                <>
                  <Button
                    onClick={handleContinueBattle}
                    className="w-full sm:flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 h-10 sm:h-12 text-sm sm:text-base font-medium text-white shadow-md hover:shadow-lg transition-all"
                  >
                    <i className="fas fa-swords mr-2"></i>
                    继续战斗 (第{sessionCount + 1}轮)
                  </Button>
                  <Button
                    onClick={handleDefeatBoss}
                    disabled={completePomodoroMutation.isPending}
                    className="w-full sm:flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 h-10 sm:h-12 text-sm sm:text-base font-medium text-white"
                  >
                    <i className="fas fa-check-circle mr-2"></i>
                    击败Boss
                  </Button>
                </>
              )}
            </div>

            {/* Tips */}
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center space-y-1 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p>💡 专注时请尽量避免分心</p>
              <p>🔔 浏览器通知需要您的授权</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}