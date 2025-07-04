import React, { useRef, useEffect, useState, useCallback, memo } from 'react';
import type { Task, Skill } from '@shared/schema';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Timer, Trash2 } from 'lucide-react';

interface VirtualTaskListProps {
  tasks: Task[];
  skills: Skill[];
  onComplete: (taskId: number) => void;
  onDelete: (taskId: number) => void;
  onStartPomodoro?: (taskId: number) => void;
  userStats?: any;
  itemHeight?: number;
  overscan?: number;
}

/**
 * 虚拟滚动任务列表组件
 * 只渲染可见区域的任务，大幅提升长列表性能
 */
export function VirtualTaskList({
  tasks,
  skills,
  onComplete,
  onDelete,
  onStartPomodoro,
  userStats,
  itemHeight = 180, // 预估的单个任务卡片高度
  overscan = 3, // 视口外额外渲染的项目数
}: VirtualTaskListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 });
  const [containerHeight, setContainerHeight] = useState(0);
  
  // 计算可见范围
  const calculateVisibleRange = useCallback(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const scrollTop = container.scrollTop;
    const clientHeight = container.clientHeight;
    
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(clientHeight / itemHeight);
    const end = Math.min(tasks.length, start + visibleCount + overscan * 2);
    
    setVisibleRange({ start, end });
  }, [tasks.length, itemHeight, overscan]);
  
  // 监听滚动事件
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    // 使用 requestAnimationFrame 优化滚动性能
    let rafId: number;
    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(calculateVisibleRange);
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    // 初始计算
    calculateVisibleRange();
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, [calculateVisibleRange]);
  
  // 监听容器大小变化
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
        calculateVisibleRange();
      }
    });
    
    resizeObserver.observe(container);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [calculateVisibleRange]);
  
  // 获取可见的任务
  const visibleTasks = tasks.slice(visibleRange.start, visibleRange.end);
  
  // 计算总高度
  const totalHeight = tasks.length * itemHeight;
  
  // 计算顶部占位高度
  const offsetY = visibleRange.start * itemHeight;
  
  return (
    <div 
      ref={containerRef}
      className="relative overflow-auto"
      style={{ height: '100%', maxHeight: '80vh' }}
    >
      {/* 占位元素，撑开滚动区域 */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* 可见区域的任务 */}
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          <div className="space-y-3">
            {visibleTasks.map((task, index) => {
              const linkedSkill = skills.find(s => s.id === task.skillId);
              const hasEnoughEnergy = !userStats || userStats.energyBalls >= (task.requiredEnergyBalls || 1);
              
              return (
                <div key={task.id} style={{ height: itemHeight }}>
                  <Card className="h-full">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <h3 className="font-medium text-sm">{task.title}</h3>
                        <div className="flex gap-1">
                          {onStartPomodoro && hasEnoughEnergy && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onStartPomodoro(task.id)}
                            >
                              <Timer className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onComplete(task.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onDelete(task.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-1">
                      {task.description && (
                        <p className="text-xs text-muted-foreground mb-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs">
                        {linkedSkill && (
                          <span className="text-muted-foreground">
                            {linkedSkill.name}
                          </span>
                        )}
                        <span className="text-muted-foreground">
                          {task.expReward} XP
                        </span>
                        <span className="text-muted-foreground">
                          ⚡ {task.requiredEnergyBalls || 1}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* 加载指示器 */}
      {tasks.length === 0 && (
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          暂无任务
        </div>
      )}
    </div>
  );
}