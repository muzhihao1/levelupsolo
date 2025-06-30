import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Check, X, RotateCcw, Calendar, Target, Repeat } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Task, InsertTask } from "@shared/schema";

interface HabiticaTaskManagerProps {
  className?: string;
}

export function HabiticaTaskManager({ className }: HabiticaTaskManagerProps) {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"habit" | "daily" | "todo">("todo");
  const [selectedDifficulty, setSelectedDifficulty] = useState<"trivial" | "easy" | "medium" | "hard">("medium");
  const [habitDirection, setHabitDirection] = useState<"positive" | "negative" | "both">("positive");

  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/data?type=tasks"],
  });

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: InsertTask) => {
      return apiRequest("POST", "/api/crud?resource=tasks", taskData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data?type=tasks"] });
      setNewTaskTitle("");
      setNewTaskDescription("");
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Task> }) => {
      return apiRequest("PATCH", `/api/crud?resource=tasks&id=${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data?type=tasks"] });
    },
  });

  const handleCreateTask = () => {
    if (!newTaskTitle.trim()) return;

    const taskData: InsertTask = {
      title: newTaskTitle,
      description: newTaskDescription || null,
      taskCategory: selectedCategory,
      difficulty: selectedDifficulty,
      habitDirection: selectedCategory === "habit" ? habitDirection : null,
      isDailyTask: selectedCategory === "daily",
      isRecurring: selectedCategory === "daily",
      recurringPattern: selectedCategory === "daily" ? "daily" : null,
      expReward: getDifficultyExpReward(selectedDifficulty),
      userId: "", // Will be set by backend
    };

    createTaskMutation.mutate(taskData);
  };

  const handleTaskAction = (task: Task, action: "complete" | "positive" | "negative") => {
    if (task.taskCategory === "habit") {
      // Handle habit actions
      const habitValueChange = action === "positive" ? 0.1 : action === "negative" ? -0.1 : 0;
      updateTaskMutation.mutate({
        id: task.id,
        updates: {
          habitValue: Math.max(-3, Math.min(3, (task.habitValue || 0) + habitValueChange)),
          habitStreak: action === "positive" ? (task.habitStreak || 0) + 1 : Math.max(0, (task.habitStreak || 0) - 1),
        },
      });
    } else {
      // Handle daily/todo completion
      updateTaskMutation.mutate({
        id: task.id,
        updates: {
          completed: !task.completed,
          completedAt: !task.completed ? new Date() : null,
        },
      });
    }
  };

  const getDifficultyExpReward = (difficulty: string) => {
    switch (difficulty) {
      case "trivial": return 1;
      case "easy": return 2;
      case "medium": return 3;
      case "hard": return 4;
      default: return 3;
    }
  };


  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "trivial": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
      case "easy": return "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200";
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200";
      case "hard": return "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const getHabitValueColor = (value: number) => {
    if (value >= 2) return "border-l-4 border-l-green-500 bg-green-50 dark:bg-green-900/20";
    if (value >= 1) return "border-l-4 border-l-green-400 bg-green-25 dark:bg-green-900/10";
    if (value <= -2) return "border-l-4 border-l-red-500 bg-red-50 dark:bg-red-900/20";
    if (value <= -1) return "border-l-4 border-l-red-400 bg-red-25 dark:bg-red-900/10";
    return "border-l-4 border-l-gray-300 bg-gray-50 dark:bg-gray-900/20";
  };

  const habits = tasks.filter((task: Task) => task.taskCategory === "habit");
  const dailies = tasks.filter((task: Task) => task.taskCategory === "daily");
  const todos = tasks.filter((task: Task) => task.taskCategory === "todo");

  return (
    <div className={className}>
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="habits">习惯 ({habits.filter(h => !h.completed).length})</TabsTrigger>
          <TabsTrigger value="dailies">每日 ({dailies.length})</TabsTrigger>
          <TabsTrigger value="todos">待办 ({todos.length})</TabsTrigger>
        </TabsList>

        {/* Task Creation Form */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="h-5 w-5" />
              创建新任务
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">任务类型</label>
                <Select value={selectedCategory} onValueChange={(value: any) => setSelectedCategory(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="habit">习惯</SelectItem>
                    <SelectItem value="daily">每日任务</SelectItem>
                    <SelectItem value="todo">待办事项</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">难度</label>
                <Select value={selectedDifficulty} onValueChange={(value: any) => setSelectedDifficulty(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trivial">简单</SelectItem>
                    <SelectItem value="easy">容易</SelectItem>
                    <SelectItem value="medium">中等</SelectItem>
                    <SelectItem value="hard">困难</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedCategory === "habit" && (
              <div>
                <label className="text-sm font-medium mb-2 block">习惯类型</label>
                <Select value={habitDirection} onValueChange={(value: any) => setHabitDirection(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="positive">正向习惯</SelectItem>
                    <SelectItem value="negative">负向习惯</SelectItem>
                    <SelectItem value="both">双向习惯</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Input
              placeholder="任务标题"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
            />
            <Textarea
              placeholder="任务描述（可选）"
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
              rows={2}
            />
            <Button 
              onClick={handleCreateTask} 
              disabled={!newTaskTitle.trim() || createTaskMutation.isPending}
              className="w-full"
            >
              {createTaskMutation.isPending ? "创建中..." : "创建任务"}
            </Button>
          </CardContent>
        </Card>

        <TabsContent value="all" className="mt-4">
          <div className="space-y-4">
            {[...habits, ...dailies, ...todos].map((task: Task) => (
              <TaskCard key={task.id} task={task} onAction={handleTaskAction} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="habits" className="mt-4">
          <div className="space-y-4">
            {habits.map((task: Task) => (
              <TaskCard key={task.id} task={task} onAction={handleTaskAction} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="dailies" className="mt-4">
          <div className="space-y-4">
            {dailies.map((task: Task) => (
              <TaskCard key={task.id} task={task} onAction={handleTaskAction} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="todos" className="mt-4">
          <div className="space-y-4">
            {todos.map((task: Task) => (
              <TaskCard key={task.id} task={task} onAction={handleTaskAction} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  onAction: (task: Task, action: "complete" | "positive" | "negative") => void;
}

function TaskCard({ task, onAction }: TaskCardProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "trivial": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
      case "easy": return "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200";
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200";
      case "hard": return "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const getHabitValueColor = (value: number) => {
    if (value >= 2) return "border-l-4 border-l-green-500 bg-green-50 dark:bg-green-900/20";
    if (value >= 1) return "border-l-4 border-l-green-400 bg-green-25 dark:bg-green-900/10";
    if (value <= -2) return "border-l-4 border-l-red-500 bg-red-50 dark:bg-red-900/20";
    if (value <= -1) return "border-l-4 border-l-red-400 bg-red-25 dark:bg-red-900/10";
    return "border-l-4 border-l-gray-300 bg-gray-50 dark:bg-gray-900/20";
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "habit": return <Repeat className="h-4 w-4" />;
      case "daily": return <Calendar className="h-4 w-4" />;
      case "todo": return <Target className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "habit": return "text-purple-600";
      case "daily": return "text-blue-600";
      case "todo": return "text-orange-600";
      default: return "text-gray-600";
    }
  };

  return (
    <Card className={`${task.taskCategory === "habit" ? getHabitValueColor(task.habitValue || 0) : ""} ${task.completed ? "opacity-75" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className={getCategoryColor(task.taskCategory)}>
                {getCategoryIcon(task.taskCategory)}
              </div>
              <Badge variant="outline" className={getDifficultyColor(task.difficulty)}>
                {task.difficulty === "trivial" ? "简单" : 
                 task.difficulty === "easy" ? "容易" : 
                 task.difficulty === "medium" ? "中等" : "困难"}
              </Badge>
              <Badge variant="secondary">
                +{task.expReward} XP
              </Badge>
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/20">
                -{task.requiredEnergyBalls} 能量球
              </Badge>
            </div>
            <h3 className={`font-medium ${task.completed ? "line-through text-muted-foreground" : ""}`}>
              {task.title}
            </h3>
            {task.description && (
              <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
            )}
            {task.taskCategory === "habit" && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground">连击: {task.habitStreak || 0} 天</span>
                <span className="text-xs text-muted-foreground">强度: {(task.habitValue || 0).toFixed(1)}</span>
              </div>
            )}
            {task.taskCategory === "daily" && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground">连击: {task.dailyStreak || 0} 天</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {task.taskCategory === "habit" ? (
              <>
                {(task.habitDirection === "positive" || task.habitDirection === "both") && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-600 border-green-600 hover:bg-green-50"
                    onClick={() => onAction(task, "positive")}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
                {(task.habitDirection === "negative" || task.habitDirection === "both") && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-50"
                    onClick={() => onAction(task, "negative")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </>
            ) : (
              <Button
                size="sm"
                variant={task.completed ? "secondary" : "default"}
                onClick={() => onAction(task, "complete")}
              >
                {task.completed ? <RotateCcw className="h-4 w-4" /> : <Check className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}