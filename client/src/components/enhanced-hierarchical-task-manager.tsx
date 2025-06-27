import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import TaskTagManager from "./task-tag-manager";
import PomodoroTimer from "./pomodoro-timer";
import { 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Target, 
  Calendar, 
  Clock,
  CheckCircle2,
  Circle,
  Layers,
  Trophy,
  Award,
  Star
} from "lucide-react";
import type { Task, Skill } from "@shared/schema";

interface EnhancedHierarchicalTaskManagerProps {
  onTaskComplete?: () => void;
}

export default function EnhancedHierarchicalTaskManager({ onTaskComplete }: EnhancedHierarchicalTaskManagerProps) {
  const [showCreateMain, setShowCreateMain] = useState(false);
  const [showCreateStage, setShowCreateStage] = useState<number | null>(null);
  const [showCreateDaily, setShowCreateDaily] = useState<number | null>(null);
  const [expandedGoals, setExpandedGoals] = useState<Set<number>>(new Set());
  const [expandedStages, setExpandedStages] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  // Form states
  const [mainGoalForm, setMainGoalForm] = useState({
    title: "",
    description: "",
    tags: [] as string[]
  });

  const [stageTaskForm, setStageTaskForm] = useState({
    title: "",
    description: "",
    estimatedDuration: 60
  });

  const [dailyTaskForm, setDailyTaskForm] = useState({
    title: "",
    description: "",
    estimatedDuration: 25,
    isRecurring: false
  });

  // Data fetching
  const { data: allTasks = [] } = useQuery<Task[]>({
    queryKey: ['/api/data?type=tasks'],
  });

  const { data: skills = [] } = useQuery<Skill[]>({
    queryKey: ['/api/data?type=skills'],
  });

  // Helper functions
  const calculateProgress = (tasks: Task[]): number => {
    if (!tasks.length) return 0;
    const completed = tasks.filter(task => task.completed).length;
    return Math.round((completed / tasks.length) * 100);
  };

  const calculateTotalXP = (tasks: Task[]): number => {
    return tasks.filter(task => task.completed).reduce((sum, task) => sum + (task.expReward || 0), 0);
  };

  // Task filtering by hierarchy level
  const mainGoals = allTasks.filter(task => !task.parentTaskId && (task.taskType === 'main' || !task.taskType));
  
  const getStageTasks = (goalId: number): Task[] => {
    return allTasks.filter(task => task.parentTaskId === goalId && task.taskType === 'stage');
  };

  const getDailyTasks = (stageId: number): Task[] => {
    return allTasks.filter(task => task.parentTaskId === stageId && (task.taskType === 'daily' || task.taskType === 'simple'));
  };

  const getAllSubTasks = (parentId: number): Task[] => {
    const directChildren = allTasks.filter(task => task.parentTaskId === parentId);
    const allDescendants: Task[] = [...directChildren];
    
    directChildren.forEach(child => {
      allDescendants.push(...getAllSubTasks(child.id));
    });
    
    return allDescendants;
  };

  // Mutations
  const createMainGoalMutation = useMutation({
    mutationFn: async (goalData: typeof mainGoalForm) => {
      const response = await apiRequest('POST', '/api/crud?resource=tasks', {
        ...goalData,
        taskType: 'main',
        expReward: 100
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=tasks'] });
      setMainGoalForm({ title: "", description: "", tags: [] });
      setShowCreateMain(false);
      toast({
        title: "主线目标已创建",
        description: "开始添加阶段任务来拆解这个目标吧！"
      });
    }
  });

  const createStageTaskMutation = useMutation({
    mutationFn: async ({ parentId, taskData }: { parentId: number; taskData: typeof stageTaskForm }) => {
      const response = await apiRequest('POST', '/api/crud?resource=tasks', {
        parentTaskId: parentId,
        ...taskData,
        taskType: 'stage',
        expReward: 50
      });
      return response.json();
    },
    onSuccess: (_, { parentId }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=tasks'] });
      setStageTaskForm({ title: "", description: "", estimatedDuration: 60 });
      setShowCreateStage(null);
      setExpandedGoals(prev => new Set([...prev, parentId]));
      toast({
        title: "阶段任务已创建",
        description: "现在可以添加具体的每日任务了"
      });
    }
  });

  const createDailyTaskMutation = useMutation({
    mutationFn: async ({ parentId, taskData }: { parentId: number; taskData: typeof dailyTaskForm }) => {
      const response = await apiRequest('POST', '/api/crud?resource=tasks', {
        parentTaskId: parentId,
        ...taskData,
        taskType: 'daily',
        expReward: 25
      });
      return response.json();
    },
    onSuccess: (_, { parentId }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=tasks'] });
      setDailyTaskForm({ title: "", description: "", estimatedDuration: 25, isRecurring: false });
      setShowCreateDaily(null);
      
      // Find and expand the stage's parent goal
      const stageTask = allTasks.find(t => t.id === parentId);
      if (stageTask?.parentTaskId) {
        setExpandedGoals(prev => new Set([...prev, stageTask.parentTaskId!]));
      }
      setExpandedStages(prev => new Set([...prev, parentId]));
      
      toast({
        title: "每日任务已创建",
        description: "开始执行这个具体任务吧！"
      });
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      const response = await apiRequest('PATCH', `/api/crud?resource=tasks&id=${id}`, { completed });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=skills'] });
      onTaskComplete?.();
      
      toast({
        title: "任务状态已更新",
        description: "继续保持这个节奏！",
        variant: "default"
      });
    }
  });

  const toggleTask = (task: Task) => {
    updateTaskMutation.mutate({ id: task.id, completed: !task.completed });
  };

  const toggleGoalExpanded = (goalId: number) => {
    setExpandedGoals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(goalId)) {
        newSet.delete(goalId);
      } else {
        newSet.add(goalId);
      }
      return newSet;
    });
  };

  const toggleStageExpanded = (stageId: number) => {
    setExpandedStages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stageId)) {
        newSet.delete(stageId);
      } else {
        newSet.add(stageId);
      }
      return newSet;
    });
  };

  // Render components
  const renderMainGoalCard = (goal: Task) => {
    const stageTasks = getStageTasks(goal.id);
    const allSubTasks = getAllSubTasks(goal.id);
    const progress = calculateProgress(allSubTasks);
    const totalXP = calculateTotalXP(allSubTasks);
    const isExpanded = expandedGoals.has(goal.id);
    const completedStages = stageTasks.filter(stage => {
      const dailyTasks = getDailyTasks(stage.id);
      return dailyTasks.length > 0 && dailyTasks.every(task => task.completed);
    }).length;

    return (
      <Card key={goal.id} className="border-l-4 border-l-primary shadow-lg mb-6 bg-card border-border">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <button
                onClick={() => toggleTask(goal)}
                className="mt-1 transition-colors"
                disabled={updateTaskMutation.isPending}
              >
                {goal.completed ? (
                  <Trophy className="w-6 h-6 text-yellow-500" />
                ) : (
                  <Target className="w-6 h-6 text-primary hover:text-primary/80" />
                )}
              </button>

              <div className="flex-1 space-y-3">
                <div className="flex items-center space-x-2">
                  <h3 className={`text-lg font-semibold ${goal.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                    🎯 {goal.title}
                  </h3>
                  <Badge variant="secondary" className="bg-primary/20 text-primary">
                    主线目标
                  </Badge>
                </div>

                {goal.description && (
                  <p className="text-muted-foreground text-sm">{goal.description}</p>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">总体进度</span>
                    <span className="text-foreground font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Layers className="w-4 h-4" />
                    <span>{stageTasks.length} 个阶段</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{completedStages} 个已完成</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4" />
                    <span>+{totalXP} XP</span>
                  </div>
                </div>
              </div>
            </div>

            {stageTasks.length > 0 && (
              <Collapsible open={isExpanded} onOpenChange={() => toggleGoalExpanded(goal.id)}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-1">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex items-center space-x-2 mb-4">
            <Button
              onClick={() => setShowCreateStage(goal.id)}
              variant="outline"
              size="sm"
              className="border-blue-500/50 text-blue-400 hover:bg-blue-500/20"
            >
              <Plus className="w-4 h-4 mr-1" />
              添加阶段任务
            </Button>
          </div>

          {showCreateStage === goal.id && (
            <Card className="mb-4 bg-card border-primary/30">
              <CardContent className="p-4 space-y-3">
                <Input
                  placeholder="阶段任务标题（如：完成第一章、准备材料等）"
                  value={stageTaskForm.title}
                  onChange={(e) => setStageTaskForm(prev => ({ ...prev, title: e.target.value }))}
                  className="bg-input border-border"
                />
                <Textarea
                  placeholder="详细描述这个阶段要完成的内容..."
                  value={stageTaskForm.description}
                  onChange={(e) => setStageTaskForm(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-input border-border resize-none"
                  rows={2}
                />
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => createStageTaskMutation.mutate({ parentId: goal.id, taskData: stageTaskForm })}
                    disabled={!stageTaskForm.title.trim() || createStageTaskMutation.isPending}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {createStageTaskMutation.isPending ? "创建中..." : "创建阶段"}
                  </Button>
                  <Button
                    onClick={() => setShowCreateStage(null)}
                    variant="ghost"
                    size="sm"
                  >
                    取消
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Collapsible open={isExpanded} onOpenChange={() => toggleGoalExpanded(goal.id)}>
            <CollapsibleContent className="space-y-3">
              {stageTasks.map(stage => renderStageTaskCard(stage))}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    );
  };

  const renderStageTaskCard = (stage: Task) => {
    const dailyTasks = getDailyTasks(stage.id);
    const progress = calculateProgress(dailyTasks);
    const totalXP = calculateTotalXP(dailyTasks);
    const isExpanded = expandedStages.has(stage.id);
    const isStageComplete = dailyTasks.length > 0 && dailyTasks.every(task => task.completed);

    return (
      <Card key={stage.id} className="ml-6 border-l-4 border-l-primary bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <button
                onClick={() => toggleTask(stage)}
                className="mt-1 transition-colors"
                disabled={updateTaskMutation.isPending}
              >
                {isStageComplete ? (
                  <Award className="w-5 h-5 text-primary" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                )}
              </button>

              <div className="flex-1 space-y-2">
                <div className="flex items-center space-x-2">
                  <h4 className={`font-medium ${isStageComplete ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                    📋 {stage.title}
                  </h4>
                  <Badge variant="outline" className="text-primary border-primary/30">
                    阶段任务
                  </Badge>
                </div>

                {stage.description && (
                  <p className="text-muted-foreground text-sm">{stage.description}</p>
                )}

                {dailyTasks.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">阶段进度</span>
                      <span className="text-foreground">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1" />
                  </div>
                )}

                <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                  <span>{dailyTasks.length} 个每日任务</span>
                  <span>+{totalXP} XP</span>
                </div>
              </div>
            </div>

            {dailyTasks.length > 0 && (
              <Collapsible open={isExpanded} onOpenChange={() => toggleStageExpanded(stage.id)}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-1">
                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex items-center space-x-2 mb-3">
            <Button
              onClick={() => setShowCreateDaily(stage.id)}
              variant="outline"
              size="sm"
              className="border-green-500/50 text-green-400 hover:bg-green-500/20"
            >
              <Plus className="w-3 h-3 mr-1" />
              添加每日任务
            </Button>
          </div>

          {showCreateDaily === stage.id && (
            <Card className="mb-3 bg-card border-accent/30">
              <CardContent className="p-3 space-y-2">
                <Input
                  placeholder="每日任务标题（如：写500字、读2篇文献等）"
                  value={dailyTaskForm.title}
                  onChange={(e) => setDailyTaskForm(prev => ({ ...prev, title: e.target.value }))}
                  className="bg-input border-border text-sm"
                />
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => createDailyTaskMutation.mutate({ parentId: stage.id, taskData: dailyTaskForm })}
                    disabled={!dailyTaskForm.title.trim() || createDailyTaskMutation.isPending}
                    size="sm"
                    className="bg-accent hover:bg-accent/90"
                  >
                    {createDailyTaskMutation.isPending ? "创建中..." : "创建任务"}
                  </Button>
                  <Button
                    onClick={() => setShowCreateDaily(null)}
                    variant="ghost"
                    size="sm"
                  >
                    取消
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Collapsible open={isExpanded} onOpenChange={() => toggleStageExpanded(stage.id)}>
            <CollapsibleContent className="space-y-2">
              {dailyTasks.map(task => renderDailyTaskCard(task))}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    );
  };

  const renderDailyTaskCard = (task: Task) => {
    return (
      <div
        key={task.id}
        className={`p-3 ml-6 rounded-lg border-l-2 ${
          task.completed ? 'border-l-accent bg-accent/10' : 'border-l-muted-foreground bg-card'
        } transition-all border border-border`}
      >
        <div className="flex items-start space-x-3">
          <button
            onClick={() => toggleTask(task)}
            className="mt-0.5 transition-colors"
            disabled={updateTaskMutation.isPending}
          >
            {task.completed ? (
              <CheckCircle2 className="w-4 h-4 text-accent" />
            ) : (
              <Circle className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            )}
          </button>

          <div className="flex-1 space-y-1">
            <h5 className={`text-sm font-medium ${task.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
              ✅ {task.title}
            </h5>
            
            <div className="flex items-center space-x-3 text-xs">
              <Badge variant="outline" className="text-accent border-accent/30 px-1 py-0">
                每日任务
              </Badge>
              <span className="text-muted-foreground">+{task.expReward || 25} XP</span>
              {task.estimatedDuration && (
                <span className="text-muted-foreground">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {task.estimatedDuration}分钟
                </span>
              )}
            </div>
          </div>

          {!task.completed && (
            <PomodoroTimer 
              task={task} 
              onComplete={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/data?type=tasks'] });
              }} 
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with overall stats */}
      <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">🎯 分层任务管理</h2>
              <p className="text-muted-foreground text-sm">主线目标 → 阶段任务 → 每日任务</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{mainGoals.length}</div>
              <div className="text-xs text-muted-foreground">个主线目标</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create main goal button */}
      <div className="flex justify-center">
        <Button
          onClick={() => setShowCreateMain(true)}
          className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
          size="lg"
        >
          <Target className="w-5 h-5 mr-2" />
          创建新的主线目标
        </Button>
      </div>

      {/* Create main goal form */}
      {showCreateMain && (
        <Card className="bg-card border-primary/50">
          <CardHeader>
            <CardTitle className="text-primary">🎯 创建主线目标</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="主线目标标题（如：撰写论文、学习Python、开发App等）"
              value={mainGoalForm.title}
              onChange={(e) => setMainGoalForm(prev => ({ ...prev, title: e.target.value }))}
              className="bg-input border-border"
            />
            <Textarea
              placeholder="详细描述这个目标的具体内容和期望成果..."
              value={mainGoalForm.description}
              onChange={(e) => setMainGoalForm(prev => ({ ...prev, description: e.target.value }))}
              className="bg-input border-border resize-none"
              rows={3}
            />
            <TaskTagManager
              selectedTags={mainGoalForm.tags}
              onTagsChange={(tags) => setMainGoalForm(prev => ({ ...prev, tags }))}
              placeholder="添加目标标签（如：写作、学习、工作等）"
            />
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => createMainGoalMutation.mutate(mainGoalForm)}
                disabled={!mainGoalForm.title.trim() || createMainGoalMutation.isPending}
                className="bg-primary hover:bg-primary/90"
              >
                {createMainGoalMutation.isPending ? "创建中..." : "创建目标"}
              </Button>
              <Button
                onClick={() => setShowCreateMain(false)}
                variant="ghost"
              >
                取消
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main goals list */}
      <div className="space-y-6">
        {mainGoals.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="p-8 text-center">
              <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">还没有主线目标</h3>
              <p className="text-muted-foreground text-sm">
                创建第一个主线目标，开始你的结构化成长之旅！
              </p>
            </CardContent>
          </Card>
        ) : (
          mainGoals.map(goal => renderMainGoalCard(goal))
        )}
      </div>
    </div>
  );
}