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
  Trophy
} from "lucide-react";
import type { Task } from "@shared/schema";

interface HierarchicalTaskManagerProps {
  onTaskComplete?: () => void;
}

export default function HierarchicalTaskManager({ onTaskComplete }: HierarchicalTaskManagerProps) {
  const [showCreateMain, setShowCreateMain] = useState(false);
  const [showCreateStage, setShowCreateStage] = useState<number | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  // Main task form state
  const [mainTaskForm, setMainTaskForm] = useState({
    title: "",
    description: "",
    estimatedDuration: 25,
    tags: [] as string[]
  });

  // Stage task form state
  const [stageTaskForm, setStageTaskForm] = useState({
    title: "",
    description: "",
    estimatedDuration: 25,
    order: 0
  });

  const { data: mainTasks = [] } = useQuery<Task[]>({
    queryKey: ['/api/data?type=tasks&taskType=main']
  });

  const { data: allTasks = [] } = useQuery<Task[]>({
    queryKey: ['/api/data?type=tasks']
  });

  // Get subtasks for each main task
  const getSubTasks = (parentId: number) => {
    return allTasks.filter(task => task.parentTaskId === parentId);
  };

  const createMainTaskMutation = useMutation({
    mutationFn: async (taskData: typeof mainTaskForm) => {
      const response = await apiRequest('POST', '/api/crud?resource=tasks', {
        ...taskData,
        taskType: 'main'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=tasks&taskType=main'] });
      setMainTaskForm({ title: "", description: "", estimatedDuration: 25, tags: [] });
      setShowCreateMain(false);
      toast({
        title: "主线任务已创建",
        description: "可以开始添加阶段任务来分解执行步骤"
      });
    }
  });

  const createStageTaskMutation = useMutation({
    mutationFn: async ({ parentId, taskData }: { parentId: number; taskData: typeof stageTaskForm }) => {
      const response = await apiRequest('POST', '/api/crud?resource=tasks', {
        ...taskData,
        parentTaskId: parentId,
        taskType: 'stage'
      });
      return response.json();
    },
    onSuccess: (_, { parentId }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=tasks'] });
      setStageTaskForm({ title: "", description: "", estimatedDuration: 25, order: 0 });
      setShowCreateStage(null);
      // Auto-expand the parent task to show new stage
      setExpandedTasks(prev => new Set([...prev, parentId]));
      toast({
        title: "阶段任务已创建",
        description: "任务已添加到主线任务下"
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
    }
  });

  const toggleTask = (task: Task) => {
    updateTaskMutation.mutate({ id: task.id, completed: !task.completed });
  };

  const toggleExpanded = (taskId: number) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleCreateMain = () => {
    if (!mainTaskForm.title.trim()) {
      toast({
        title: "请填写任务标题",
        variant: "destructive"
      });
      return;
    }
    createMainTaskMutation.mutate(mainTaskForm);
  };

  const handleCreateStage = (parentId: number) => {
    if (!stageTaskForm.title.trim()) {
      toast({
        title: "请填写阶段任务标题",
        variant: "destructive"
      });
      return;
    }
    createStageTaskMutation.mutate({ parentId, taskData: stageTaskForm });
  };

  const renderTaskCard = (task: Task, isStage = false) => {
    const subTasks = getSubTasks(task.id);
    const hasSubTasks = subTasks.length > 0;
    const isExpanded = expandedTasks.has(task.id);
    const completedSubTasks = subTasks.filter(t => t.completed).length;

    return (
      <Card key={task.id} className={`${isStage ? 'ml-6 border-l-4 border-l-blue-200' : ''} transition-all hover:shadow-md`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <button
                onClick={() => toggleTask(task)}
                className="mt-1 transition-colors"
                disabled={updateTaskMutation.isPending}
              >
                {task.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>

              <div className="flex-1 space-y-2">
                <div className="flex items-center space-x-2">
                  {!isStage && hasSubTasks && (
                    <Collapsible>
                      <CollapsibleTrigger
                        onClick={() => toggleExpanded(task.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </CollapsibleTrigger>
                    </Collapsible>
                  )}
                  
                  <CardTitle className={`text-lg ${task.completed ? 'line-through text-gray-500' : ''}`}>
                    {task.title}
                  </CardTitle>
                  
                  {task.taskType === 'main' && <Target className="w-4 h-4 text-blue-500" />}
                  {task.taskType === 'stage' && <Layers className="w-4 h-4 text-purple-500" />}
                </div>

                {task.description && (
                  <p className="text-sm text-gray-600">{task.description}</p>
                )}

                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{task.estimatedDuration}分钟</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span>🎯</span>
                    <span>{task.expReward}经验</span>
                  </div>
                  {hasSubTasks && (
                    <div className="flex items-center space-x-1">
                      <Layers className="w-4 h-4" />
                      <span>{completedSubTasks}/{subTasks.length}</span>
                    </div>
                  )}
                </div>

                {task.tags && task.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {task.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <PomodoroTimer task={task} onComplete={onTaskComplete || (() => {})} />
              
              {!isStage && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCreateStage(task.id)}
                  disabled={task.completed}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  阶段
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Subtasks */}
        {hasSubTasks && isExpanded && (
          <CardContent className="pt-0">
            <div className="space-y-3">
              {subTasks.map(subTask => renderTaskCard(subTask, true))}
            </div>
          </CardContent>
        )}

        {/* Create Stage Form */}
        {showCreateStage === task.id && (
          <CardContent className="pt-0 border-t bg-gray-50">
            <div className="space-y-4">
              <h4 className="font-medium">添加阶段任务</h4>
              <Input
                placeholder="阶段任务标题"
                value={stageTaskForm.title}
                onChange={(e) => setStageTaskForm(prev => ({ ...prev, title: e.target.value }))}
              />
              <Textarea
                placeholder="详细描述（可选）"
                value={stageTaskForm.description}
                onChange={(e) => setStageTaskForm(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium">预估时长:</label>
                  <Input
                    type="number"
                    min={5}
                    max={180}
                    value={stageTaskForm.estimatedDuration}
                    onChange={(e) => setStageTaskForm(prev => ({ ...prev, estimatedDuration: parseInt(e.target.value) || 25 }))}
                    className="w-20"
                  />
                  <span className="text-sm text-gray-500">分钟</span>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={() => handleCreateStage(task.id)}
                  disabled={createStageTaskMutation.isPending}
                >
                  创建阶段任务
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateStage(null)}
                >
                  取消
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">分层任务管理</h2>
          <p className="text-gray-600">创建主线任务，分解为阶段任务来逐步执行</p>
        </div>
        <Button onClick={() => setShowCreateMain(true)}>
          <Plus className="w-4 h-4 mr-2" />
          创建主线任务
        </Button>
      </div>

      {/* Create Main Task Form */}
      {showCreateMain && (
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="w-5 h-5 mr-2 text-blue-500" />
              创建主线任务
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="主线任务标题"
              value={mainTaskForm.title}
              onChange={(e) => setMainTaskForm(prev => ({ ...prev, title: e.target.value }))}
            />
            <Textarea
              placeholder="详细描述（可选）"
              value={mainTaskForm.description}
              onChange={(e) => setMainTaskForm(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">预估时长:</label>
                <Input
                  type="number"
                  min={5}
                  max={180}
                  value={mainTaskForm.estimatedDuration}
                  onChange={(e) => setMainTaskForm(prev => ({ ...prev, estimatedDuration: parseInt(e.target.value) || 25 }))}
                  className="w-20"
                />
                <span className="text-sm text-gray-500">分钟</span>
              </div>
            </div>
            <TaskTagManager
              selectedTags={mainTaskForm.tags}
              onTagsChange={(tags) => setMainTaskForm(prev => ({ ...prev, tags }))}
            />
            <div className="flex space-x-2">
              <Button
                onClick={handleCreateMain}
                disabled={createMainTaskMutation.isPending}
              >
                创建主线任务
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCreateMain(false)}
              >
                取消
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Tasks List */}
      <div className="space-y-4">
        {mainTasks.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">
            <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">还没有主线任务</h3>
            <p className="mb-4">创建第一个主线任务，开始你的成长之旅</p>
            <Button onClick={() => setShowCreateMain(true)}>
              <Plus className="w-4 h-4 mr-2" />
              创建主线任务
            </Button>
          </Card>
        ) : (
          mainTasks.map(task => renderTaskCard(task))
        )}
      </div>
    </div>
  );
}