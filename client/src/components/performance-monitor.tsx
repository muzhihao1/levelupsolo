import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PerformanceMetrics {
  fps: number;
  renderTime: number;
  memoryUsage: number;
  apiLatency: number;
}

/**
 * 性能监控组件（仅在开发环境显示）
 */
export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    renderTime: 0,
    memoryUsage: 0,
    apiLatency: 0,
  });
  
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    // 只在开发环境启用
    if (process.env.NODE_ENV !== 'development') return;
    
    let frameCount = 0;
    let lastTime = performance.now();
    let rafId: number;
    
    // FPS 监控
    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        frameCount = 0;
        lastTime = currentTime;
        
        // 内存使用监控
        const memoryUsage = (performance as any).memory
          ? Math.round((performance as any).memory.usedJSHeapSize / 1048576)
          : 0;
        
        setMetrics(prev => ({
          ...prev,
          fps,
          memoryUsage,
        }));
      }
      
      rafId = requestAnimationFrame(measureFPS);
    };
    
    measureFPS();
    
    // API 延迟监控
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        const latency = Math.round(endTime - startTime);
        
        setMetrics(prev => ({
          ...prev,
          apiLatency: latency,
        }));
        
        return response;
      } catch (error) {
        throw error;
      }
    };
    
    // React 渲染时间监控
    if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      const hook = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
      const originalCommitFiberRoot = hook.onCommitFiberRoot;
      
      hook.onCommitFiberRoot = (id: any, root: any, priorityLevel: any) => {
        const renderTime = root.actualDuration || 0;
        setMetrics(prev => ({
          ...prev,
          renderTime: Math.round(renderTime),
        }));
        
        if (originalCommitFiberRoot) {
          originalCommitFiberRoot(id, root, priorityLevel);
        }
      };
    }
    
    return () => {
      cancelAnimationFrame(rafId);
      window.fetch = originalFetch;
    };
  }, []);
  
  if (process.env.NODE_ENV !== 'development') return null;
  
  const getStatusColor = (metric: string, value: number): string => {
    switch (metric) {
      case 'fps':
        return value >= 50 ? 'bg-green-500' : value >= 30 ? 'bg-yellow-500' : 'bg-red-500';
      case 'renderTime':
        return value <= 16 ? 'bg-green-500' : value <= 50 ? 'bg-yellow-500' : 'bg-red-500';
      case 'memoryUsage':
        return value <= 100 ? 'bg-green-500' : value <= 300 ? 'bg-yellow-500' : 'bg-red-500';
      case 'apiLatency':
        return value <= 200 ? 'bg-green-500' : value <= 500 ? 'bg-yellow-500' : 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  return (
    <>
      {/* 切换按钮 */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 left-4 z-50 w-10 h-10 rounded-full bg-gray-800 text-white flex items-center justify-center shadow-lg hover:bg-gray-700 transition-colors"
        title="性能监控"
      >
        📊
      </button>
      
      {/* 性能面板 */}
      {isVisible && (
        <Card className="fixed bottom-16 left-4 z-50 w-64 shadow-xl">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 text-sm">性能监控</h3>
            
            <div className="space-y-2">
              {/* FPS */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">FPS</span>
                <Badge className={getStatusColor('fps', metrics.fps)}>
                  {metrics.fps}
                </Badge>
              </div>
              
              {/* 渲染时间 */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">渲染时间</span>
                <Badge className={getStatusColor('renderTime', metrics.renderTime)}>
                  {metrics.renderTime}ms
                </Badge>
              </div>
              
              {/* 内存使用 */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">内存使用</span>
                <Badge className={getStatusColor('memoryUsage', metrics.memoryUsage)}>
                  {metrics.memoryUsage}MB
                </Badge>
              </div>
              
              {/* API 延迟 */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">API延迟</span>
                <Badge className={getStatusColor('apiLatency', metrics.apiLatency)}>
                  {metrics.apiLatency}ms
                </Badge>
              </div>
            </div>
            
            {/* 性能建议 */}
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                {metrics.fps < 30 && '⚠️ FPS过低，可能存在性能问题'}
                {metrics.renderTime > 50 && '⚠️ 渲染时间过长'}
                {metrics.memoryUsage > 300 && '⚠️ 内存使用过高'}
                {metrics.apiLatency > 500 && '⚠️ API响应缓慢'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}