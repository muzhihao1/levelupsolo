import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import IntelligentGoalCreator from "@/components/intelligent-goal-creator";

import { Zap } from "lucide-react";

interface Goal {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  milestones?: Milestone[];
  skillTags?: string[] | null;
  expReward?: number;
  goldReward?: number;
  pomodoroExpReward?: number;
  pomodoroGoldReward?: number;
}

interface Milestone {
  id: number;
  goalId: number;
  title: string;
  description?: string;
  completed: boolean;
}



export default function Goals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  


  // 获取目标列表
  const { data: goals = [], isLoading } = useQuery<Goal[]>({
    queryKey: ['/api/data?type=goals'],
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // 更新目标完成状态
  const updateGoalMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Goal> }) => {
      return await apiRequest("PATCH", `/api/goals/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=goals'] });
      toast({
        title: "目标已更新",
        description: "目标状态已成功更新",
      });
    },
    onError: () => {
      toast({
        title: "更新失败",
        description: "目标状态更新失败，请重试",
        variant: "destructive",
      });
    },
  });

  // 删除目标
  const deleteGoalMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/goals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=goals'] });
      toast({
        title: "目标已删除",
        description: "目标已成功删除",
      });
    },
    onError: () => {
      toast({
        title: "删除失败",
        description: "目标删除失败，请重试",
        variant: "destructive",
      });
    },
  });

  // 更新里程碑状态
  const updateMilestoneMutation = useMutation({
    mutationFn: async ({ goalId, milestoneId, completed }: { goalId: number; milestoneId: number; completed: boolean }) => {
      return await apiRequest("PATCH", `/api/goals/${goalId}/milestones/${milestoneId}`, { completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=goals'] });
    },
    onError: () => {
      toast({
        title: "更新失败",
        description: "里程碑状态更新失败",
        variant: "destructive",
      });
    },
  });



  const handleEditGoal = (goal: Goal) => {
    // 编辑功能暂时移除，只保留AI创建
    console.log("Edit goal:", goal);
  };

  const toggleGoalCompletion = (goal: Goal) => {
    updateGoalMutation.mutate({
      id: goal.id,
      updates: { completed: !goal.completed }
    });
  };

  const handleDeleteGoal = (goal: Goal) => {
    if (confirm('确定要删除这个目标吗？')) {
      deleteGoalMutation.mutate(goal.id);
    }
  };





  const calculateProgress = (goal: Goal) => {
    if (!goal.milestones || goal.milestones.length === 0) return 0;
    const completedMilestones = goal.milestones.filter(m => m.completed).length;
    return (completedMilestones / goal.milestones.length) * 100;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white flex items-center">
            <i className="fas fa-flag text-amber-400 mr-3"></i>
            主线任务
          </h1>
        </div>
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-slate-800 border-slate-700 animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="h-4 bg-slate-600 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-600 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center">
          <i className="fas fa-flag text-amber-400 mr-3"></i>
          主线任务
        </h1>
      </div>

      {/* AI智能创建目标 */}
      <div className="space-y-4">
        <IntelligentGoalCreator onGoalCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/data?type=goals'] });
        }} />
      </div>

      {/* 目标列表 */}
      <div className="space-y-4">
        {goals.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-8 text-center">
              <div className="text-gray-400 mb-4">
                <i className="fas fa-flag text-4xl text-gray-600 mb-4"></i>
                <p className="text-lg">还没有任何目标</p>
                <p className="text-sm">使用上方的AI智能创建来添加您的第一个目标</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEditGoal={handleEditGoal}
              onToggleCompletion={toggleGoalCompletion}
              onDeleteGoal={handleDeleteGoal}
              onUpdateMilestone={({ goalId, milestoneId, completed }) => {
                updateMilestoneMutation.mutate({ goalId, milestoneId, completed });
              }}

            />
          ))
        )}
      </div>
    </div>
  );
}

function GoalCard({ 
  goal, 
  onEditGoal, 
  onToggleCompletion, 
  onDeleteGoal,
  onUpdateMilestone
}: { 
  goal: Goal; 
  onEditGoal: (goal: Goal) => void; 
  onToggleCompletion: (goal: Goal) => void; 
  onDeleteGoal: (goal: Goal) => void;
  onUpdateMilestone: ({ goalId, milestoneId, completed }: { goalId: number; milestoneId: number; completed: boolean }) => void;
}) {
  const calculateProgress = (goal: Goal) => {
    if (!goal.milestones || goal.milestones.length === 0) return 0;
    const completedMilestones = goal.milestones.filter(m => m.completed).length;
    return (completedMilestones / goal.milestones.length) * 100;
  };

  const progress = calculateProgress(goal);

  return (
    <Card className={`bg-card border-border transition-all duration-200 ${goal.completed ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <Checkbox
              checked={goal.completed}
              onCheckedChange={() => onToggleCompletion(goal)}
              className="mt-1"
            />
            <div className="flex-1">
              <CardTitle className={`text-lg ${goal.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                {goal.title}
              </CardTitle>
              {goal.description && (
                <p className="text-muted-foreground text-sm mt-1">{goal.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDeleteGoal(goal)}
              className="text-destructive hover:bg-destructive/10"
            >
              删除
            </Button>
            <Button
              variant="ghost" 
              size="sm"
              onClick={() => onToggleCompletion(goal)}
              className="text-primary hover:bg-primary/10"
            >
              标记完成
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 完成奖励信息 */}
        <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1 text-primary">
              <Zap className="h-4 w-4" />
              <span className="text-sm font-medium">+{goal.expReward || 0} EXP</span>
            </div>
          </div>
        </div>

        {/* 进度条 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">完成进度</span>
            <span className="text-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* 里程碑进展 */}
        {goal.milestones && goal.milestones.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-foreground font-medium flex items-center">
              <i className="fas fa-flag text-accent mr-2"></i>
              里程碑进展
            </h4>
            <div className="space-y-2">
              {goal.milestones.map((milestone) => (
                <div key={milestone.id} className="flex items-start space-x-3 p-2 bg-muted/50 rounded border border-border">
                  <Checkbox
                    checked={milestone.completed}
                    onCheckedChange={(checked) => {
                      onUpdateMilestone({
                        goalId: goal.id,
                        milestoneId: milestone.id,
                        completed: !!checked,
                      });
                    }}
                    className="flex-shrink-0 mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium leading-tight ${milestone.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                      {milestone.title}
                    </p>
                    {milestone.description && (
                      <p className="text-xs text-muted-foreground mt-1 leading-tight">{milestone.description}</p>
                    )}
                  </div>
                  {milestone.completed && (
                    <i className="fas fa-check-circle text-primary flex-shrink-0 text-sm mt-0.5"></i>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}



        {/* AI分析的技能标签 */}
        {goal.skillTags && goal.skillTags.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-foreground font-medium text-sm flex items-center">
              <i className="fas fa-brain text-secondary mr-2"></i>
              相关技能
            </h4>
            <div className="flex flex-wrap gap-2">
              {goal.skillTags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="bg-secondary/20 text-secondary-foreground hover:bg-secondary/30">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}


      </CardContent>
    </Card>
  );
}