import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Goal, Milestone } from "@shared/schema";
import { UserStateSelector } from '../components/user-state-selector';
import { TaskRecommendations } from '../components/task-recommendations';

export default function Goals() {
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: "",
    description: "",
    expReward: 500,
    targetDate: ""
  });
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [managingMilestones, setManagingMilestones] = useState<number | null>(null);
  const [newMilestone, setNewMilestone] = useState({ title: "", description: "" });
  const { toast } = useToast();
  const [userState, setUserState] = useState({
    energyLevel: 'medium' as const,
    availableTime: 30,
    mood: 'neutral' as const,
    focusLevel: 5
  });

  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ['/api/data?type=goals']
  });

  const { data: milestones = [] } = useQuery<Milestone[]>({
    queryKey: [`/api/data?type=milestones&goalId=${managingMilestones}`],
    enabled: !!managingMilestones
  });

  const createGoalMutation = useMutation({
    mutationFn: async (goalData: typeof newGoal) => {
      const response = await apiRequest('POST', '/api/crud?resource=goals', {
        ...goalData,
        targetDate: goalData.targetDate ? goalData.targetDate : null
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=goals'] });
      setNewGoal({ title: "", description: "", expReward: 500, targetDate: "" });
      setIsAddingGoal(false);
      toast({
        title: "目标已创建",
        description: "新目标已成功添加",
      });
    }
  });

  const updateGoalMutation = useMutation({
    mutationFn: async ({ id, ...goalData }: { id: number; completed?: boolean; title?: string; description?: string; expReward?: number; targetDate?: string | null; progress?: number }) => {
      const response = await apiRequest('PATCH', `/api/crud?resource=goals&id=${id}`, {
        ...goalData,
        targetDate: goalData.targetDate ? goalData.targetDate : null
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=goals'] });
      setEditingGoal(null);
      setIsAddingGoal(false);

      // 如果目标被标记为完成，显示庆祝消息
      if (data.completed) {
        toast({
          title: "🎉 目标完成！",
          description: `恭喜完成目标"${data.title}"！获得 ${data.expReward} XP`,
        });
      } else {
        toast({
          title: "目标已更新",
          description: "目标信息已成功更新",
        });
      }
    }
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/crud?resource=goals&id=${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=goals'] });
      toast({
        title: "目标已删除",
        description: "目标已成功删除",
      });
    }
  });

  const createMilestoneMutation = useMutation({
    mutationFn: async ({ goalId, ...milestoneData }: { goalId: number; title: string; description: string }) => {
      const response = await apiRequest('POST', '/api/crud?resource=milestones', {
        ...milestoneData,
        goalId
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/data?type=milestones&goalId=${managingMilestones}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=goals'] });
      setNewMilestone({ title: "", description: "" });
      toast({
        title: "里程碑已添加",
        description: "新里程碑已成功创建",
      });
    }
  });

  const updateMilestoneMutation = useMutation({
    mutationFn: async ({ id, ...milestoneData }: { id: number; completed?: boolean }) => {
      const response = await apiRequest('PATCH', `/api/crud?resource=milestones&id=${id}`, milestoneData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/data?type=milestones&goalId=${managingMilestones}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=goals'] });
      toast({
        title: "里程碑已更新",
        description: "里程碑状态已更新",
      });
    }
  });

  const deleteMilestoneMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/crud?resource=milestones&id=${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/data?type=milestones&goalId=${managingMilestones}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=goals'] });
      toast({
        title: "里程碑已删除",
        description: "里程碑已成功删除",
      });
    }
  });

  const handleCreateGoal = () => {
    if (!newGoal.title.trim()) return;
    createGoalMutation.mutate(newGoal);
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setNewGoal({
      title: goal.title,
      description: goal.description || "",
      expReward: goal.expReward,
      targetDate: goal.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : ""
    });
    setIsAddingGoal(true);
  };

  const handleUpdateGoal = () => {
    if (!newGoal.title.trim() || !editingGoal) return;
    updateGoalMutation.mutate({
      id: editingGoal.id,
      title: newGoal.title,
      description: newGoal.description,
      expReward: newGoal.expReward,
      targetDate: newGoal.targetDate
    });
  };

  const handleCompleteGoal = (goal: Goal) => {
    updateGoalMutation.mutate({
      id: goal.id,
      completed: true,
      progress: 1
    });
  };

  const handleCancelEdit = () => {
    setEditingGoal(null);
    setNewGoal({ title: "", description: "", expReward: 500, targetDate: "" });
    setIsAddingGoal(false);
  };

  const handleCreateMilestone = (goalId: number) => {
    if (!newMilestone.title.trim()) return;
    createMilestoneMutation.mutate({
      goalId,
      ...newMilestone
    });
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "未设定";
    return new Date(date).toLocaleDateString('zh-CN');
  };

  const activeGoals = goals.filter(g => !g.completed);
  const completedGoals = goals.filter(g => g.completed);
  const canAddGoal = activeGoals.length < 3;

  const updateUserState = useMutation({
    mutationFn: async (state: any) => {
      const response = await apiRequest('POST', '/api/user-state', state);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "状态已更新",
        description: "系统将基于您的状态推荐合适的任务",
      });
    },
  });

  const completeGoal = useMutation({
    mutationFn: async (goalId: number) => {
      const response = await apiRequest('POST', `/api/goals/${goalId}/complete`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=goals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=skills'] });

      toast({
        title: "目标完成！",
        description: "恭喜您完成了这个目标！",
      });
    },
    onError: () => {
      toast({
        title: "完成失败",
        description: "无法完成目标，请重试",
        variant: "destructive",
      });
    },
  });

  const handleStateUpdate = (state: any) => {
    setUserState(state);
    updateUserState.mutate(state);
  };

  const handleTaskStart = (taskId: string) => {
    toast({
      title: "任务开始！",
      description: "祝您学习愉快！记得在完成后标记任务状态。",
    });
    // 这里可以导航到具体的任务执行页面
  };

  // 根据里程碑生成对应的微任务
  const getMicroTasksForMilestone = (milestone: Milestone) => {
    const baseTasks = [
      { title: "收集相关资料", duration: 15, exp: 10 },
      { title: "制定详细计划", duration: 10, exp: 8 },
      { title: "开始初步工作", duration: 25, exp: 15 }
    ];

    // 根据里程碑标题自定义微任务
    if (milestone.title.includes('课题') || milestone.title.includes('大纲')) {
      return [
        { title: "搜索相关文献资料", duration: 20, exp: 12 },
        { title: "分析研究现状", duration: 15, exp: 10 },
        { title: "确定研究方向", duration: 10, exp: 8 },
        { title: "制定研究大纲", duration: 25, exp: 15 }
      ];
    }
    
    if (milestone.title.includes('撰写') || milestone.title.includes('草稿')) {
      return [
        { title: "整理研究素材", duration: 15, exp: 10 },
        { title: "撰写第一段内容", duration: 30, exp: 20 },
        { title: "完善论文结构", duration: 20, exp: 15 },
        { title: "初稿自查修改", duration: 25, exp: 15 }
      ];
    }
    
    if (milestone.title.includes('校对') || milestone.title.includes('发表')) {
      return [
        { title: "全文语法检查", duration: 20, exp: 12 },
        { title: "格式规范调整", duration: 15, exp: 10 },
        { title: "选择投稿期刊", duration: 10, exp: 8 },
        { title: "提交论文投稿", duration: 15, exp: 12 }
      ];
    }

    return baseTasks;
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/20 rounded-2xl p-6 text-center">
        <h1 className="text-2xl font-bold mb-2 text-foreground">🎯 目标管理</h1>
        <p className="text-muted-foreground">设定长期目标，规划成长路径</p>
      </div>

      {/* Add New Goal */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-foreground">
            <span>
              <i className={`${editingGoal ? 'fas fa-edit text-primary' : 'fas fa-plus-circle text-green-600'} mr-2`}></i>
              {editingGoal ? '编辑目标' : '添加新目标'}
            </span>
            <span className="text-sm text-muted-foreground">
              {editingGoal ? '' : `进行中: ${activeGoals.length}/3`}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!isAddingGoal && !editingGoal ? (
            <div className="space-y-3">
              <Button
                onClick={() => setIsAddingGoal(true)}
                disabled={!canAddGoal}
                className="w-full bg-gradient-to-r from-green-500 to-cyan-500 text-white font-medium py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-green-600 hover:to-cyan-600 transition-all"
              >
                <i className="fas fa-target mr-2"></i>
                {canAddGoal ? '创建新目标' : '目标已满 (最多3个进行中的目标)'}
              </Button>
              {!canAddGoal && (
                <p className="text-center text-sm text-muted-foreground">
                  完成或删除现有目标后可创建新目标
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Input
                value={newGoal.title}
                onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                placeholder="目标描述 (例如：掌握React开发)"
                className="bg-background border-border text-foreground"
              />
              <Textarea
                value={newGoal.description}
                onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                placeholder="详细说明和要求..."
                className="bg-background border-border text-foreground resize-none"
                rows={3}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">目标截止日期</label>
                  <Input
                    type="date"
                    value={newGoal.targetDate}
                    onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })}
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">预期奖励 XP</label>
                  <Input
                    type="number"
                    value={newGoal.expReward}
                    onChange={(e) => setNewGoal({ ...newGoal, expReward: parseInt(e.target.value) || 0 })}
                    className="bg-background border-border text-foreground"
                  />
                </div>
              </div>
              <div className="flex space-x-3">
                <Button
                  onClick={editingGoal ? handleUpdateGoal : handleCreateGoal}
                  disabled={!newGoal.title.trim() || createGoalMutation.isPending || updateGoalMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-green-500 to-cyan-500 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
                >
                  <i className={`fas ${editingGoal ? 'fa-save' : 'fa-target'} mr-2`}></i>
                  {editingGoal ? '保存更改' : '创建目标'}
                </Button>
                <Button
                  variant="outline"
                  onClick={editingGoal ? handleCancelEdit : () => setIsAddingGoal(false)}
                  className="flex-1 border-border text-muted-foreground hover:bg-muted hover:text-foreground py-2 px-4 rounded"
                >
                  取消
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">
            <i className="fas fa-rocket mr-2 text-primary"></i>
            进行中的目标
          </h2>
          {activeGoals.map((goal) => (
            <Card key={goal.id} className="bg-card border-border hover:border-primary/30 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-bold text-foreground truncate">{goal.title}</h3>
                      <Badge className="bg-primary/20 text-primary shrink-0">进行中</Badge>
                      {goal.progress >= 1 && (
                        <Badge className="bg-accent/20 text-accent animate-pulse shrink-0">
                          <i className="fas fa-star mr-1"></i>
                          可完成
                        </Badge>
                      )}
                    </div>
                    <p className="mb-4 text-muted-foreground">{goal.description}</p>
                    <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                      <span>
                        <i className="fas fa-calendar-alt mr-1"></i>
                        截止：{formatDate(goal.targetDate)}
                      </span>
                      <span>
                        <i className="fas fa-gift mr-1"></i>
                        奖励：{goal.expReward} XP
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setManagingMilestones(goal.id)}
                      className="text-accent hover:text-accent/80 hover:bg-accent/10"
                      title="管理里程碑"
                    >
                      <i className="fas fa-flag mr-1"></i>
                      里程碑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditGoal(goal)}
                      className="text-primary hover:text-primary/80 hover:bg-primary/10"
                      title="编辑目标"
                    >
                      <i className="fas fa-edit mr-1"></i>
                      编辑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCompleteGoal(goal)}
                      disabled={goal.progress < 1}
                      className="text-green-600 hover:text-green-500 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={goal.progress >= 1 ? "标记为已完成" : "需要完成所有里程碑"}
                    >
                      <i className="fas fa-check mr-1"></i>
                      完成
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteGoalMutation.mutate(goal.id)}
                      className="text-red-600 hover:text-red-500 hover:bg-red-50 rounded-md"
                      title="删除目标"
                    >
                      <i className="fas fa-trash mr-1"></i>
                      删除
                    </Button>
                  </div>
                </div>

                {/* Progress Section */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-foreground font-medium">完成进度</span>
                    <span className="text-primary font-bold">
                      {Math.round((goal.progress || 0) * 100)}%
                    </span>
                  </div>
                  <Progress value={(goal.progress || 0) * 100} className="h-3" />
                  {(goal.progress || 0) >= 1 ? (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-green-600 text-sm text-center">
                        <i className="fas fa-trophy mr-1"></i>
                        目标已达成，可以标记为完成！
                      </p>
                      <Button
                        onClick={() => handleCompleteGoal(goal)}
                        className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg border-2 border-green-500 shadow-lg hover:shadow-xl transition-all"
                      >
                        <i className="fas fa-check mr-2 text-lg"></i>
                        立即完成目标
                      </Button>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs mt-2 text-center">
                      <i className="fas fa-info-circle mr-1"></i>
                      {milestones.length === 0 && managingMilestones === goal.id 
                        ? "添加里程碑来跟踪目标进度" 
                        : "完成里程碑来推进目标进度"}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">
            <i className="fas fa-trophy mr-2 text-amber-500"></i>
            已完成的目标
          </h2>
          {completedGoals.map((goal) => (
            <Card key={goal.id} className="bg-card border-border opacity-75">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-bold text-muted-foreground">{goal.title}</h3>
                      <Badge className="bg-green-500/20 text-green-600">已完成</Badge>
                      <i className="fas fa-medal text-amber-500 text-xl"></i>
                    </div>
                    <p className="mb-4 text-muted-foreground">{goal.description}</p>
                    <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                      <span>
                        <i className="fas fa-check-circle mr-1"></i>
                        完成于：{formatDate(goal.completedAt)}
                      </span>
                      <span>
                        <i className="fas fa-gift mr-1"></i>
                        获得：{goal.expReward} XP
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteGoalMutation.mutate(goal.id)}
                    className="text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-md"
                    title="删除已完成的目标"
                  >
                    <i className="fas fa-trash"></i>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {goals.length === 0 && (
        <Card className="bg-card border-border">
          <CardContent className="text-center py-12">
            <i className="fas fa-bullseye text-4xl text-muted-foreground mb-4"></i>
            <h3 className="text-xl font-semibold text-foreground mb-2">还没有设定目标</h3>
            <p className="text-gray-400">创建你的第一个长期目标，开始规划成长路径！</p>
          </CardContent>
        </Card>
      )}

      {/* Milestone Management Modal */}
      {managingMilestones && (
        <Card className="bg-card border-border fixed inset-4 z-50 overflow-auto">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-foreground">
              <span>
                <i className="fas fa-flag mr-2 text-accent"></i>
                管理里程碑
              </span>
              <button
                onClick={() => setManagingMilestones(null)}
                className="text-muted-foreground hover:text-foreground hover:bg-muted w-8 h-8 flex items-center justify-center text-xl font-bold rounded border border-border hover:border-primary transition-colors"
                title="关闭"
              >
                ×
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Milestone */}
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <h4 className="font-medium text-foreground">添加新里程碑</h4>
              <Input
                value={newMilestone.title}
                onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                placeholder="里程碑标题"
                className="bg-background border-border text-foreground"
              />
              <Textarea
                value={newMilestone.description}
                onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                placeholder="里程碑描述"
                className="bg-background border-border text-foreground"
                rows={2}
              />
              <Button
                onClick={() => handleCreateMilestone(managingMilestones)}
                disabled={!newMilestone.title.trim()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <i className="fas fa-plus mr-2"></i>
                添加里程碑
              </Button>
            </div>

            {/* Milestones List */}
            <div className="space-y-4">
              {milestones.map((milestone, index) => (
                <div
                  key={milestone.id}
                  className={`p-4 rounded-lg border ${
                    milestone.completed 
                      ? 'bg-green-500/10 border-green-500/30' 
                      : 'bg-muted border-border'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <span className="text-primary font-bold shrink-0 text-lg">#{index + 1}</span>
                      <div className="flex-1 min-w-0">
                        <h5 className={`font-semibold text-lg break-words mb-1 ${milestone.completed ? 'text-green-600 line-through' : 'text-foreground'}`}>
                          {milestone.title && milestone.title.trim() ? milestone.title : '未命名里程碑'}
                        </h5>
                        {milestone.description && milestone.description.trim() && (
                          <p className={`text-sm mt-2 break-words leading-relaxed ${milestone.completed ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {milestone.description}
                          </p>
                        )}
                        {milestone.completed && milestone.completedAt && (
                          <p className="text-xs text-green-400 mt-2 font-medium">
                            <i className="fas fa-check-circle mr-1"></i>
                            完成于 {formatDate(milestone.completedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateMilestoneMutation.mutate({
                          id: milestone.id,
                          completed: !milestone.completed
                        })}
                        className={`${milestone.completed ? "text-muted-foreground hover:text-yellow-500" : "text-green-500 hover:text-green-600"} hover:bg-muted w-8 h-8 p-0`}
                        title={milestone.completed ? "标记为未完成" : "标记为已完成"}
                      >
                        <i className={`fas ${milestone.completed ? 'fa-undo' : 'fa-check'}`}></i>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMilestoneMutation.mutate(milestone.id)}
                        className="text-muted-foreground hover:text-red-500 hover:bg-red-50 w-8 h-8 p-0"
                        title="删除里程碑"
                      >
                        <i className="fas fa-trash"></i>
                      </Button>
                    </div>
                  </div>
                  
                  {/* 微任务分解区域 */}
                  {!milestone.completed && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <h6 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
                        <i className="fas fa-list-ul text-blue-600"></i>
                        可执行的微任务
                      </h6>
                      <div className="space-y-2">
                        {/* 动态生成的微任务示例 */}
                        {getMicroTasksForMilestone(milestone).map((microTask, microIndex) => (
                          <div key={microIndex} className="flex items-center justify-between p-2 bg-white rounded border border-blue-200">
                            <div className="flex items-center gap-2 flex-1">
                              <Checkbox className="border-blue-300" />
                              <span className="text-sm text-gray-700">{microTask.title}</span>
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                                {microTask.duration}min
                              </Badge>
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-600 border-green-200">
                                +{microTask.exp} XP
                              </Badge>
                            </div>
                            <Button size="sm" variant="outline" className="text-blue-600 border-blue-300 hover:bg-blue-50">
                              开始
                            </Button>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 text-xs text-blue-600">
                        💡 完成所有微任务后，里程碑将自动标记为完成
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {milestones.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <i className="fas fa-flag text-3xl mb-3"></i>
                  <p className="text-lg font-medium mb-1">还没有设置里程碑</p>
                  <p className="text-sm">添加里程碑来跟踪目标进度</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 热身任务区域 - 总是显示 */}
      <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            🔥 热身任务
            <Badge variant="secondary" className="bg-orange-100 text-orange-700">
              快速开始
            </Badge>
          </CardTitle>
          <p className="text-orange-600 text-sm">
            在开始主线任务前，先完成这些简单的准备工作，帮助你快速进入状态
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeGoals.length > 0 ? (
            // 有目标时显示针对性热身任务
            activeGoals.map((goal) => (
              <div key={`warmup-${goal.id}`} className="space-y-2">
                <h4 className="font-medium text-orange-800 flex items-center gap-2">
                  <i className="fas fa-target text-orange-500"></i>
                  {goal.title} - 热身准备
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="p-3 bg-white rounded-lg border border-orange-200 hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">⚡ 2分钟热身</span>
                      <Badge variant="outline" className="text-xs">+5 XP</Badge>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">快速浏览相关资料，了解基本概念</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full text-orange-600 border-orange-300 hover:bg-orange-50"
                      onClick={() => handleTaskStart(`warmup-browse-${goal.id}`)}
                    >
                      开始浏览
                    </Button>
                  </div>
                  
                  <div className="p-3 bg-white rounded-lg border border-orange-200 hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">⚡ 5分钟热身</span>
                      <Badge variant="outline" className="text-xs">+8 XP</Badge>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">整理工作环境，准备必要工具</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full text-orange-600 border-orange-300 hover:bg-orange-50"
                      onClick={() => handleTaskStart(`warmup-prepare-${goal.id}`)}
                    >
                      开始准备
                    </Button>
                  </div>
                  
                  <div className="p-3 bg-white rounded-lg border border-orange-200 hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">⚡ 3分钟热身</span>
                      <Badge variant="outline" className="text-xs">+5 XP</Badge>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">制定今日具体目标和计划</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full text-orange-600 border-orange-300 hover:bg-orange-50"
                      onClick={() => handleTaskStart(`warmup-plan-${goal.id}`)}
                    >
                      制定计划
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            // 没有目标时显示通用热身任务
            <div>
              <h4 className="font-medium text-orange-800 flex items-center gap-2 mb-3">
                <i className="fas fa-fire text-orange-500"></i>
                通用热身任务
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="p-3 bg-white rounded-lg border border-orange-200 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">⚡ 环境整理</span>
                    <Badge variant="outline" className="text-xs">+3 XP</Badge>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">清理桌面，整理学习环境</p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full text-orange-600 border-orange-300 hover:bg-orange-50"
                    onClick={() => handleTaskStart('warmup-environment')}
                  >
                    开始整理
                  </Button>
                </div>
                
                <div className="p-3 bg-white rounded-lg border border-orange-200 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">⚡ 呼吸练习</span>
                    <Badge variant="outline" className="text-xs">+5 XP</Badge>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">3分钟深呼吸，提升专注力</p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full text-orange-600 border-orange-300 hover:bg-orange-50"
                    onClick={() => handleTaskStart('warmup-breathing')}
                  >
                    开始练习
                  </Button>
                </div>
                
                <div className="p-3 bg-white rounded-lg border border-orange-200 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">⚡ 目标设定</span>
                    <Badge variant="outline" className="text-xs">+8 XP</Badge>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">思考并设定新的学习目标</p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full text-orange-600 border-orange-300 hover:bg-orange-50"
                    onClick={() => setIsAddingGoal(true)}
                  >
                    设定目标
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 状态感知组件 */}
      <UserStateSelector onStateUpdate={handleStateUpdate} />

      {/* 任务推荐组件 */}
      <TaskRecommendations 
        userState={userState} 
        onTaskStart={handleTaskStart}
      />

      
    </div>
  );
}