import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertGoalSchema, type Goal, type InsertGoal, type Milestone, type WarmupTask } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { LocalStorage } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { z } from "zod";

// 扩展目标创建表单，包含里程碑
const goalWithMilestonesSchema = insertGoalSchema.extend({
  milestones: z.array(z.object({
    title: z.string().min(1, "里程碑标题不能为空"),
  })).min(1, "至少需要一个里程碑"),
});

type GoalWithMilestones = z.infer<typeof goalWithMilestonesSchema>;

export default function Goals() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 获取目标列表
  const { data: goals = [], isLoading } = useQuery<Goal[]>({
    queryKey: ['/api/data?type=goals'],
  });

  // 创建目标表单
  const form = useForm<GoalWithMilestones>({
    resolver: zodResolver(goalWithMilestonesSchema),
    defaultValues: {
      title: "",
      description: "",
      milestones: [{ title: "" }],
    },
  });

  // 创建目标mutation
  const createGoalMutation = useMutation({
    mutationFn: async (goalData: GoalWithMilestones) => {
      const userProfile = LocalStorage.get('growthJournal_userProfile');
      const goalDataWithProfile = {
        ...goalData,
        userProfile: userProfile
      };
      const response = await apiRequest('/api/goals', 'POST', goalDataWithProfile);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=goals'] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "目标创建成功",
        description: "新目标和里程碑已添加到你的成长计划中",
      });
    },
    onError: () => {
      toast({
        title: "创建失败",
        description: "请检查网络连接或稍后重试",
        variant: "destructive",
      });
    },
  });

  // 更新里程碑状态
  const updateMilestoneMutation = useMutation({
    mutationFn: async ({ goalId, milestoneId, completed }: { goalId: number; milestoneId: number; completed: boolean }) => {
      const response = await apiRequest(`/api/goals/${goalId}/milestones/${milestoneId}`, 'PATCH', { completed });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=goals'] });
    },
  });

  // 更新热身任务状态
  const updateWarmupTaskMutation = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: number; completed: boolean }) => {
      const response = await apiRequest(`/api/warmup-tasks/${taskId}`, 'PATCH', { completed });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=goals'] });
      toast({
        title: completed ? "热身任务已完成" : "任务状态已更新",
        description: completed ? "获得经验奖励！" : "任务状态已更新",
      });
    },
  });

  const onSubmit = (data: GoalWithMilestones) => {
    createGoalMutation.mutate(data);
  };

  // 添加里程碑
  const addMilestone = () => {
    const currentMilestones = form.getValues("milestones");
    form.setValue("milestones", [...currentMilestones, { title: "" }]);
  };

  // 删除里程碑
  const removeMilestone = (index: number) => {
    const currentMilestones = form.getValues("milestones");
    if (currentMilestones.length > 1) {
      form.setValue("milestones", currentMilestones.filter((_, i) => i !== index));
    }
  };

  // 计算目标进度
  const calculateProgress = (goal: Goal & { milestones?: Milestone[] }) => {
    if (!goal.milestones || goal.milestones.length === 0) return 0;
    const completedCount = goal.milestones.filter(m => m.completed).length;
    return Math.round((completedCount / goal.milestones.length) * 100);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-slate-700 rounded w-3/4"></div>
                <div className="h-4 bg-slate-700 rounded w-1/2"></div>
                <div className="h-2 bg-slate-700 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">目标管理</h1>
          <p className="text-gray-400 mt-2">设定长期目标，分解为具体里程碑，追踪进展</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
              <i className="fas fa-plus mr-2"></i>
              新建目标
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-slate-800 border-slate-700" aria-describedby="goal-creation-description">
            <DialogHeader>
              <DialogTitle className="text-white">创建新目标</DialogTitle>
            </DialogHeader>
            <div id="goal-creation-description" className="sr-only">
              创建一个新的长期目标，并设置相关的里程碑事件
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">目标标题</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="例如：掌握前端开发技能"
                          className="bg-slate-700 border-slate-600 text-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">目标描述</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="详细描述这个目标的具体内容和意义..."
                          className="bg-slate-700 border-slate-600 text-white"
                          rows={3}
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 里程碑列表 */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-white">里程碑事件</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addMilestone}
                      className="text-blue-400 border-blue-400 hover:bg-blue-400/10"
                    >
                      <i className="fas fa-plus mr-1"></i>
                      添加里程碑
                    </Button>
                  </div>

                  {form.watch("milestones").map((_, index) => (
                    <div key={index} className="bg-slate-700 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-white font-medium">里程碑 {index + 1}</h4>
                        {form.watch("milestones").length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMilestone(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <i className="fas fa-trash text-sm"></i>
                          </Button>
                        )}
                      </div>

                      <FormField
                        control={form.control}
                        name={`milestones.${index}.title`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                placeholder="里程碑标题，例如：完成React基础学习"
                                className="bg-slate-600 border-slate-500 text-white"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    className="flex-1"
                  >
                    取消
                  </Button>
                  <Button
                    type="submit"
                    disabled={createGoalMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                  >
                    {createGoalMutation.isPending ? "创建中..." : "创建目标"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 目标列表 */}
      {goals.length === 0 ? (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="text-center py-12">
            <i className="fas fa-bullseye text-4xl text-gray-400 mb-4"></i>
            <p className="text-gray-400 text-lg">还没有设定目标</p>
            <p className="text-gray-500 text-sm mt-2">创建你的第一个成长目标，开始追踪进展</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {goals.map((goal) => (
            <GoalCard 
              key={goal.id} 
              goal={goal}
              onUpdateMilestone={updateMilestoneMutation.mutate}
              onUpdateWarmupTask={updateWarmupTaskMutation.mutate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// 目标卡片组件
function GoalCard({ 
  goal, 
  onUpdateMilestone,
  onUpdateWarmupTask
}: { 
  goal: Goal & { milestones?: Milestone[]; warmupTasks?: WarmupTask[] };
  onUpdateMilestone: (params: { goalId: number; milestoneId: number; completed: boolean }) => void;
  onUpdateWarmupTask: (params: { taskId: number; completed: boolean }) => void;
}) {
  const progress = goal.milestones ? 
    Math.round((goal.milestones.filter(m => m.completed).length / goal.milestones.length) * 100) : 0;

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-white flex items-center">
              <i className="fas fa-bullseye text-blue-400 mr-2"></i>
              {goal.title}
            </CardTitle>
            {goal.description && (
              <p className="text-gray-400 mt-2">{goal.description}</p>
            )}
          </div>
          <Badge 
            variant={goal.completed ? "default" : "secondary"}
            className={goal.completed ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"}
          >
            {goal.completed ? "已完成" : "进行中"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* 进度条 */}
        <div className="space-y-2 mb-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">总体进度</span>
            <span className="text-white font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* 里程碑列表 */}
        {goal.milestones && goal.milestones.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-white font-medium flex items-center">
              <i className="fas fa-flag text-amber-400 mr-2"></i>
              里程碑进展
            </h4>
            <div className="space-y-2">
              {goal.milestones.map((milestone) => (
                <div key={milestone.id} className="flex items-center space-x-3 p-3 bg-slate-700 rounded-lg">
                  <Checkbox
                    checked={milestone.completed}
                    onCheckedChange={(checked) => {
                      onUpdateMilestone({
                        goalId: goal.id,
                        milestoneId: milestone.id,
                        completed: !!checked,
                      });
                    }}
                    className="flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${milestone.completed ? 'text-gray-400 line-through' : 'text-white'}`}>
                      {milestone.title}
                    </p>
                    {milestone.description && (
                      <p className="text-sm text-gray-500 mt-1">{milestone.description}</p>
                    )}
                  </div>
                  {milestone.completed && (
                    <i className="fas fa-check-circle text-green-400 flex-shrink-0"></i>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 热身任务区域 */}
        {goal.warmupTasks && goal.warmupTasks.length > 0 && (
          <div className="space-y-3 mt-6">
            <h4 className="text-white font-medium flex items-center">
              <i className="fas fa-fire text-orange-400 mr-2"></i>
              热身任务
              <Badge variant="secondary" className="ml-2 text-xs bg-orange-500/20 text-orange-400">
                快速开始
              </Badge>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {goal.warmupTasks.map((warmupTask) => (
                <div 
                  key={warmupTask.id} 
                  className={`p-3 rounded-lg border transition-all ${
                    warmupTask.completed 
                      ? 'bg-green-500/10 border-green-500/30' 
                      : 'bg-slate-700 border-slate-600 hover:border-orange-400/50'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      checked={warmupTask.completed}
                      onCheckedChange={(checked) => {
                        onUpdateWarmupTask({
                          taskId: warmupTask.id,
                          completed: !!checked,
                        });
                      }}
                      className="mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${
                        warmupTask.completed ? 'text-gray-400 line-through' : 'text-white'
                      }`}>
                        {warmupTask.title}
                      </p>
                      {warmupTask.description && (
                        <p className="text-xs text-gray-500 mt-1">{warmupTask.description}</p>
                      )}
                      <div className="flex items-center space-x-3 mt-2 text-xs">
                        <span className="text-gray-400 flex items-center">
                          <i className="fas fa-clock mr-1"></i>
                          {warmupTask.duration}分钟
                        </span>
                        <span className="text-blue-400 flex items-center">
                          <i className="fas fa-star mr-1"></i>
                          +{warmupTask.expReward} EXP
                        </span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            warmupTask.difficulty === 'easy' ? 'border-green-500/30 text-green-400' :
                            warmupTask.difficulty === 'medium' ? 'border-yellow-500/30 text-yellow-400' :
                            'border-red-500/30 text-red-400'
                          }`}
                        >
                          {warmupTask.difficulty === 'easy' ? '简单' : 
                           warmupTask.difficulty === 'medium' ? '中等' : '困难'}
                        </Badge>
                      </div>
                    </div>
                    {warmupTask.completed && (
                      <i className="fas fa-check-circle text-green-400 flex-shrink-0"></i>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 目标统计 */}
        <div className="mt-6 p-4 bg-slate-900 rounded-lg border border-slate-600">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-blue-400">
                {goal.milestones?.length || 0}
              </div>
              <div className="text-xs text-gray-400">里程碑总数</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-400">
                {goal.milestones?.filter(m => m.completed).length || 0}
              </div>
              <div className="text-xs text-gray-400">已完成</div>
            </div>
            <div>
              <div className="text-lg font-bold text-amber-400">
                {goal.milestones?.filter(m => !m.completed).length || 0}
              </div>
              <div className="text-xs text-gray-400">待完成</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}