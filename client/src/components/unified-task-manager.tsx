import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import PomodoroTimer from "@/components/pomodoro-timer";
import type { Task, Skill, Goal, Milestone } from "@shared/schema";

interface UnifiedTaskManagerProps {
  onTaskComplete?: () => void;
}

export default function UnifiedTaskManager({ onTaskComplete }: UnifiedTaskManagerProps) {
  const [newTaskText, setNewTaskText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  // 获取数据
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['/api/tasks']
  });

  const { data: skills = [] } = useQuery<Skill[]>({
    queryKey: ['/api/skills']
  });

  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ['/api/goals']
  });

  const { data: mainTasks = [] } = useQuery<Task[]>({
    queryKey: ['/api/tasks/main']
  });

  const { data: milestones = [] } = useQuery<Milestone[]>({
    queryKey: ['/api/milestones']
  });

  // 分类任务
  const activeGoals = goals.filter(goal => !goal.completed);
  const dailyTasks = tasks.filter(task => task.taskType === 'daily' || !task.taskType);
  const stageTasks = tasks.filter(task => task.taskType === 'stage');

  // 创建任务的变更
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: { title: string; skillId?: number; expReward?: number; estimatedDuration?: number }) => {
      const response = await apiRequest('POST', '/api/tasks', taskData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/skills'] });
      setNewTaskText("");
      toast({
        title: "任务已添加",
        description: "新任务已成功添加到列表中",
      });
    },
    onError: () => {
      toast({
        title: "添加失败",
        description: "任务添加失败，请重试",
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Task> }) => {
      const response = await apiRequest('PATCH', `/api/tasks/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/skills'] });
      onTaskComplete?.();
      toast({
        title: "任务已更新",
        description: "任务状态已成功更新",
      });
    },
    onError: () => {
      toast({
        title: "更新失败",
        description: "任务更新失败，请重试",
        variant: "destructive",
      });
    },
  });

  // AI分析任务
  const analyzeTaskWithAI = async (taskText: string) => {
    setIsAnalyzing(true);
    try {
      const response = await apiRequest('POST', '/api/analyze-task', { taskText });
      const data = await response.json();
      
      if (data.suggestedSkill) {
        await createTaskMutation.mutateAsync({
          title: taskText,
          skillId: data.suggestedSkill.id,
          expReward: data.expReward || 20,
          estimatedDuration: data.estimatedDuration || 30
        });
      } else {
        await createTaskMutation.mutateAsync({
          title: taskText,
          expReward: 15,
          estimatedDuration: 25
        });
      }
    } catch (error) {
      console.error('AI分析失败:', error);
      await createTaskMutation.mutateAsync({
        title: taskText,
        expReward: 15,
        estimatedDuration: 25
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskText.trim()) {
      toast({
        title: "请输入任务",
        description: "任务内容不能为空",
        variant: "destructive",
      });
      return;
    }

    await analyzeTaskWithAI(newTaskText);
  };

  const toggleTask = (task: Task) => {
    updateTaskMutation.mutate({
      id: task.id,
      updates: {
        completed: !task.completed,
        completedAt: !task.completed ? new Date() : null
      }
    });
  };

  const findSkill = (skillId: number | null) => {
    if (!skillId) return null;
    return skills.find(skill => skill.id === skillId);
  };

  // 渲染主要任务卡片
  const renderMainTaskCard = (task: Task) => {
    const skill = findSkill(task.skillId);
    
    return (
      <Card key={task.id} className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border-purple-500/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Checkbox
                checked={task.completed}
                onCheckedChange={() => toggleTask(task)}
                className="data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
              />
              <div>
                <h3 className={`font-medium ${task.completed ? 'line-through text-slate-500' : 'text-white'}`}>
                  {task.title}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  {skill && (
                    <Badge style={{ backgroundColor: skill.color }} className="text-white text-xs">
                      <i className={`${skill.icon} mr-1`}></i>
                      {skill.name}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-purple-400 border-purple-400">
                    +{task.expReward} EXP
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <i className="fas fa-clock text-purple-400"></i>
                <span className="text-sm text-purple-300">{task.estimatedDuration}分钟</span>
              </div>
            </div>
            <PomodoroTimer
              task={task}
              onComplete={() => onTaskComplete?.()}
            />
          </div>
        </CardContent>
      </Card>
    );
  };

  // 渲染阶段任务卡片
  const renderStageTaskCard = (task: Task) => {
    const skill = findSkill(task.skillId);
    
    return (
      <Card key={task.id} className="bg-gradient-to-r from-blue-900/20 to-cyan-900/20 border-blue-500/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Checkbox
                checked={task.completed}
                onCheckedChange={() => toggleTask(task)}
                className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
              />
              <div>
                <h3 className={`font-medium ${task.completed ? 'line-through text-slate-500' : 'text-white'}`}>
                  {task.title}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  {skill && (
                    <Badge style={{ backgroundColor: skill.color }} className="text-white text-xs">
                      <i className={`${skill.icon} mr-1`}></i>
                      {skill.name}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-blue-400 border-blue-400">
                    +{task.expReward} EXP
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <i className="fas fa-clock text-blue-400"></i>
                <span className="text-sm text-blue-300">{task.estimatedDuration}分钟</span>
              </div>
            </div>
            <PomodoroTimer
              task={task}
              onComplete={() => onTaskComplete?.()}
            />
          </div>
        </CardContent>
      </Card>
    );
  };

  // 渲染每日任务卡片
  const renderDailyTaskCard = (task: Task) => {
    const skill = findSkill(task.skillId);
    
    return (
      <Card key={task.id} className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border-green-500/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Checkbox
                checked={task.completed}
                onCheckedChange={() => toggleTask(task)}
                className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
              />
              <div>
                <h3 className={`font-medium ${task.completed ? 'line-through text-slate-500' : 'text-white'}`}>
                  {task.title}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  {skill && (
                    <Badge style={{ backgroundColor: skill.color }} className="text-white text-xs">
                      <i className={`${skill.icon} mr-1`}></i>
                      {skill.name}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-green-400 border-green-400">
                    +{task.expReward} EXP
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <i className="fas fa-clock text-green-400"></i>
                <span className="text-sm text-green-300">{task.estimatedDuration}分钟</span>
              </div>
            </div>
            <PomodoroTimer
              task={task}
              onComplete={() => onTaskComplete?.()}
            />
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* 任务创建区域 */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <i className="fas fa-plus-circle mr-2 text-blue-400"></i>
            智能任务创建
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            placeholder="描述你要完成的任务，AI会自动分析并推荐相关技能..."
            className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 resize-none"
            rows={3}
          />
          <Button
            onClick={handleCreateTask}
            disabled={isAnalyzing || createTaskMutation.isPending}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
          >
            {isAnalyzing || createTaskMutation.isPending ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                {isAnalyzing ? "AI分析中..." : "创建中..."}
              </>
            ) : (
              <>
                <i className="fas fa-plus mr-2"></i>
                添加任务
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 目标的主要任务 */}
      {activeGoals.length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <i className="fas fa-target mr-2 text-purple-400"></i>
              目标相关任务
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeGoals.map(goal => {
              const goalTasks = mainTasks.filter(task => task.goalId === goal.id);
              return (
                <div key={goal.id} className="space-y-3">
                  <h3 className="text-lg font-semibold text-purple-300">
                    <i className="fas fa-bullseye mr-2"></i>
                    {goal.title}
                  </h3>
                  {goalTasks.length === 0 ? (
                    <p className="text-slate-400 text-sm ml-6">暂无相关任务</p>
                  ) : (
                    <div className="space-y-2 ml-6">
                      {goalTasks.map(renderMainTaskCard)}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* 阶段任务和每日任务统一显示 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 阶段任务 */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <i className="fas fa-layer-group mr-2 text-blue-400"></i>
              阶段任务
              <Badge variant="outline" className="ml-2 text-blue-400 border-blue-400">
                {stageTasks.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stageTasks.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <i className="fas fa-tasks text-4xl mb-4"></i>
                <p>暂无阶段任务</p>
              </div>
            ) : (
              stageTasks.map(renderStageTaskCard)
            )}
          </CardContent>
        </Card>

        {/* 每日任务 */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <i className="fas fa-calendar-day mr-2 text-green-400"></i>
              每日任务
              <Badge variant="outline" className="ml-2 text-green-400 border-green-400">
                {dailyTasks.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dailyTasks.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <i className="fas fa-calendar-check text-4xl mb-4"></i>
                <p>暂无每日任务</p>
              </div>
            ) : (
              dailyTasks.map(renderDailyTaskCard)
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}