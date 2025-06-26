import { useState, useEffect } from "react";

// 高精度计时器工具类
export class AccurateTimer {
  private timeoutId: NodeJS.Timeout | null = null;
  private startTime: number = 0;
  private expectedTime: number = 0;
  private onTick: () => void;
  private onComplete: () => void;
  private isActive: boolean = false;

  constructor(onTick: () => void, onComplete: () => void) {
    this.onTick = onTick;
    this.onComplete = onComplete;
  }

  start() {
    if (this.isActive) return;
    
    this.isActive = true;
    this.startTime = Date.now();
    this.expectedTime = this.startTime + 1000;
    this.scheduleNext();
  }

  stop() {
    this.isActive = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  private scheduleNext() {
    if (!this.isActive) return;

    const tick = () => {
      if (!this.isActive) return;

      const now = Date.now();
      const drift = now - this.expectedTime;
      
      // 执行回调
      this.onTick();
      
      // 计算下一次执行时间并补偿漂移
      this.expectedTime += 1000;
      const delay = Math.max(0, 1000 - drift);
      
      this.timeoutId = setTimeout(tick, delay);
    };

    this.timeoutId = setTimeout(tick, 1000);
  }

  getElapsedSeconds(): number {
    if (!this.isActive || this.startTime === 0) return 0;
    return Math.floor((Date.now() - this.startTime) / 1000);
  }
}

// 创建高精度番茄钟钩子
export function useAccuratePomodoro(
  initialTime: number,
  isRunning: boolean,
  onComplete: () => void
) {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [timer, setTimer] = useState<AccurateTimer | null>(null);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      const newTimer = new AccurateTimer(
        () => {
          setTimeLeft((prev: number) => {
            if (prev <= 1) {
              setTimeout(onComplete, 0);
              return 0;
            }
            return prev - 1;
          });
        },
        onComplete
      );
      
      setTimer(newTimer);
      newTimer.start();
      
      return () => {
        newTimer.stop();
      };
    } else if (timer) {
      timer.stop();
      setTimer(null);
    }
  }, [isRunning, onComplete]);

  useEffect(() => {
    setTimeLeft(initialTime);
  }, [initialTime]);

  return { timeLeft, setTimeLeft };
}