import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Zap, Brain, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TaskCreationModeToggleProps {
  onModeChange?: (useAI: boolean) => void;
  defaultMode?: boolean;
}

/**
 * 任务创建模式切换组件
 * 让用户选择使用 AI 智能创建还是快速创建
 */
export function TaskCreationModeToggle({ 
  onModeChange, 
  defaultMode = true 
}: TaskCreationModeToggleProps) {
  const [useAI, setUseAI] = useState(() => {
    // 从 localStorage 读取用户偏好
    const saved = localStorage.getItem("taskCreationMode");
    return saved !== null ? saved === "ai" : defaultMode;
  });

  useEffect(() => {
    // 保存用户偏好
    localStorage.setItem("taskCreationMode", useAI ? "ai" : "quick");
    onModeChange?.(useAI);
  }, [useAI, onModeChange]);

  return (
    <Card className="p-4 mb-4 bg-background border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {useAI ? (
              <Brain className="h-5 w-5 text-primary" />
            ) : (
              <Zap className="h-5 w-5 text-yellow-500" />
            )}
            <span className="font-medium">
              {useAI ? "AI 智能创建" : "快速创建"}
            </span>
          </div>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>AI 智能创建：</strong>
                    自动分析任务类型、分配技能、设置难度和经验值（需要 2-3 秒）
                  </p>
                  <p>
                    <strong>快速创建：</strong>
                    立即创建任务，使用默认设置，稍后可手动调整（< 0.1 秒）
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">快速</span>
          <Switch
            checked={useAI}
            onCheckedChange={setUseAI}
            className="data-[state=checked]:bg-primary"
          />
          <span className="text-sm text-muted-foreground">智能</span>
        </div>
      </div>
      
      {/* 性能提示 */}
      <div className="mt-3 text-xs text-muted-foreground">
        {useAI ? (
          <p>✨ AI 将自动分析任务并进行智能分类（需要等待 2-3 秒）</p>
        ) : (
          <p>⚡ 任务将立即创建，您可以稍后手动调整分类和属性</p>
        )}
      </div>
    </Card>
  );
}

/**
 * 紧凑版本的切换按钮
 */
export function CompactModeToggle({ onModeChange }: { onModeChange?: (useAI: boolean) => void }) {
  const [useAI, setUseAI] = useState(() => {
    const saved = localStorage.getItem("taskCreationMode");
    return saved !== null ? saved === "ai" : true;
  });

  const handleToggle = () => {
    const newMode = !useAI;
    setUseAI(newMode);
    localStorage.setItem("taskCreationMode", newMode ? "ai" : "quick");
    onModeChange?.(newMode);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggle}
            className="gap-2"
          >
            {useAI ? (
              <>
                <Brain className="h-4 w-4" />
                <span>AI 模式</span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 text-yellow-500" />
                <span>快速模式</span>
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>点击切换任务创建模式</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}