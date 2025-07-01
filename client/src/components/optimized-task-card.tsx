import React, { memo, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, Zap, Flame, Trash2, Brain } from "lucide-react";
import type { Task, Skill } from "@shared/schema";

interface TaskCardProps {
  task: Task;
  onComplete: (taskId: number) => void;
  onDelete: (taskId: number) => void;
  onStartPomodoro?: (taskId: number) => void;
  hasEnoughEnergy: boolean;
  linkedSkill?: Skill;
  isCurrentPomodoro?: boolean;
}

/**
 * 优化的任务卡片组件
 * 使用 React.memo 和 useCallback 来避免不必要的重渲染
 */
export const OptimizedTaskCard = memo(function OptimizedTaskCard({
  task,
  onComplete,
  onDelete,
  onStartPomodoro,
  hasEnoughEnergy,
  linkedSkill,
  isCurrentPomodoro = false,
}: TaskCardProps) {
  
  // 缓存事件处理函数
  const handleComplete = useCallback(() => {
    onComplete(task.id);
  }, [task.id, onComplete]);
  
  const handleDelete = useCallback(() => {
    onDelete(task.id);
  }, [task.id, onDelete]);
  
  const handleStartPomodoro = useCallback(() => {
    onStartPomodoro?.(task.id);
  }, [task.id, onStartPomodoro]);
  
  // 提前计算静态值
  const canCompleteTask = task.completed || hasEnoughEnergy;
  const requiredEnergy = task.requiredEnergyBalls || 1;
  const showPomodoroButton = task.taskCategory === "todo" && !task.completed && !isCurrentPomodoro;
  
  return (
    <Card className="bg-card border-border hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* 完成按钮 */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleComplete}
            disabled={!canCompleteTask}
            className={`mt-1 h-10 w-10 p-0 rounded-full touch-manipulation ${
              task.completed 
                ? "text-green-600 bg-green-100" 
                : canCompleteTask 
                  ? "text-muted-foreground hover:text-green-600 hover:bg-green-100" 
                  : "text-gray-400 bg-gray-100 cursor-not-allowed opacity-50"
            }`}
          >
            {task.completed ? <CheckCircle className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
          </Button>
          
          {/* 任务内容 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className={`font-semibold text-base leading-tight ${
                task.completed ? "line-through text-muted-foreground" : "text-foreground"
              }`}>
                {task.title}
              </h3>
              
              {/* 操作按钮 */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <TaskCategoryBadge category={task.taskCategory} />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDelete}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0 rounded-lg"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {task.description && (
              <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                {task.description}
              </p>
            )}
            
            {/* 技能关联 */}
            {linkedSkill && (
              <SkillInfo skill={linkedSkill} expReward={task.expReward || 20} />
            )}
          </div>
        </div>
        
        {/* 底部信息 */}
        <TaskFooter 
          task={task}
          requiredEnergy={requiredEnergy}
          hasEnoughEnergy={hasEnoughEnergy}
        />
        
        {/* 番茄钟按钮 */}
        {showPomodoroButton && onStartPomodoro && (
          <div className="pt-3 mt-3 border-t border-border">
            <Button 
              size="sm" 
              onClick={handleStartPomodoro}
              className="w-full h-11 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700 text-white"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">⚔️</span>
                <div className="text-left">
                  <div className="text-sm font-bold">挑战Boss</div>
                  <div className="text-xs font-medium text-blue-100">25分钟专注战斗</div>
                </div>
              </div>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

/**
 * 任务类别徽章组件
 */
const TaskCategoryBadge = memo(function TaskCategoryBadge({ category }: { category: string }) {
  const categoryMap = {
    goal: { icon: "🎯", name: "目标" },
    todo: { icon: "✅", name: "待办" },
    habit: { icon: "🔄", name: "习惯" },
  };
  
  const cat = categoryMap[category as keyof typeof categoryMap] || categoryMap.todo;
  
  return (
    <Badge variant="outline" className="text-primary border-primary/30 text-xs px-2 py-1">
      {cat.icon} {cat.name}
    </Badge>
  );
});

/**
 * 技能信息组件
 */
const SkillInfo = memo(function SkillInfo({ 
  skill, 
  expReward 
}: { 
  skill: Skill; 
  expReward: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-4 p-2 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200/50 dark:border-purple-700/50">
      <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
              {skill.name}
            </span>
            <span className="text-xs text-purple-600 dark:text-purple-400">
              Lv.{skill.level}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
            <Zap className="h-3 w-3" />
            <span>+{expReward} XP</span>
          </div>
        </div>
      </div>
    </div>
  );
});

/**
 * 任务底部信息组件
 */
const TaskFooter = memo(function TaskFooter({ 
  task, 
  requiredEnergy, 
  hasEnoughEnergy 
}: { 
  task: Task; 
  requiredEnergy: number; 
  hasEnoughEnergy: boolean;
}) {
  const difficultyMap = {
    trivial: { name: "微不足道", xp: 1 },
    easy: { name: "简单", xp: 5 },
    medium: { name: "中等", xp: 10 },
    hard: { name: "困难", xp: 15 },
  };
  
  const difficulty = difficultyMap[task.difficulty as keyof typeof difficultyMap] || difficultyMap.medium;
  
  return (
    <div className="flex flex-col gap-3 py-3 border-t border-border">
      <div className="flex items-center gap-4 flex-wrap">
        {/* 经验奖励 */}
        <div className="flex items-center gap-2 text-primary">
          <Zap className="h-4 w-4" />
          <span className="font-medium text-sm">+{task.expReward || difficulty.xp} XP</span>
        </div>
        
        {/* 能量需求 */}
        <div className={`flex items-center gap-1 ${
          hasEnoughEnergy ? 'text-accent' : 'text-red-500'
        }`}>
          {Array.from({ length: requiredEnergy }).map((_, i) => (
            <span key={i} className="text-sm">🔵</span>
          ))}
          <span className="font-medium text-sm ml-1">
            {requiredEnergy * 15}分钟
          </span>
          {!hasEnoughEnergy && (
            <span className="text-xs text-red-500 ml-1">(能量不足)</span>
          )}
        </div>
        
        {/* 习惯连击 */}
        {task.taskCategory === "habit" && (task.habitStreak || 0) > 0 && (
          <div className="flex items-center gap-2 text-secondary">
            <Flame className="h-4 w-4" />
            <span className="font-medium text-sm">{task.habitStreak}连击</span>
          </div>
        )}
      </div>
      
      {/* 标签 */}
      <div className="flex items-center gap-2 flex-wrap">
        {task.taskCategory === "habit" && (
          <Badge variant="outline" className="bg-secondary/20 text-secondary border-secondary/30 text-xs px-2 py-1">
            🔄 每日习惯
          </Badge>
        )}
        <Badge variant="secondary" className="text-xs px-2 py-1">
          {difficulty.name}
        </Badge>
      </div>
    </div>
  );
});