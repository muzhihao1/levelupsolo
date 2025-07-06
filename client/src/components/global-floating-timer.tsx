import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface FloatingTimerData {
  taskId: number;
  taskTitle: string;
  timeLeft: number;
  isRunning: boolean;
}

// Global state for floating timer
let globalTimerState: FloatingTimerData | null = null;
let setGlobalTimerState: ((state: FloatingTimerData | null) => void) | null = null;

export function setFloatingTimer(data: FloatingTimerData | null) {
  console.log('setFloatingTimer called with:', data);
  globalTimerState = data;
  if (setGlobalTimerState) {
    setGlobalTimerState(data);
  }
}

export function GlobalFloatingTimer() {
  const [timerData, setTimerData] = useState<FloatingTimerData | null>(globalTimerState);

  useEffect(() => {
    setGlobalTimerState = setTimerData;
    console.log('GlobalFloatingTimer mounted');
    return () => {
      setGlobalTimerState = null;
    };
  }, []);

  useEffect(() => {
    console.log('GlobalFloatingTimer timerData changed:', timerData);
  }, [timerData]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!timerData || !timerData.isRunning) {
    console.log('GlobalFloatingTimer: not rendering -', 
      !timerData ? 'timerData is null' : `isRunning: ${timerData.isRunning}`);
    return null;
  }

  return createPortal(
    <div 
      className="fixed bg-gradient-to-br from-primary to-accent text-white rounded-full shadow-2xl cursor-pointer hover:scale-110 transition-all duration-200"
      style={{ 
        position: 'fixed',
        bottom: '80px',
        right: '20px',
        zIndex: 999999,
        width: '120px',
        height: '120px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={() => {
        console.log('Global floating timer clicked');
        // Dispatch custom event to reopen timer dialog
        window.dispatchEvent(new CustomEvent('reopenPomodoroTimer', { 
          detail: { taskId: timerData.taskId } 
        }));
      }}>
      <div className="text-center">
        <div className="text-2xl mb-1">🍅</div>
        <div className="text-xl font-bold">
          {formatTime(timerData.timeLeft)}
        </div>
        <div className="text-[10px] opacity-90 max-w-[80px] truncate px-2">
          {timerData.taskTitle}
        </div>
      </div>
      <div className="absolute top-2 right-2 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
    </div>,
    document.body
  );
}