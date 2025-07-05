import { useEffect, useState } from "react";
import { useLocation, useRoute, useRouter } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import PomodoroTimer from "@/components/pomodoro-timer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { Task, Goal } from "@shared/schema";

// Unified task interface for pomodoro
interface PomodoroTask {
  id: number;
  title: string;
  type: 'goal' | 'task' | 'habit';
  estimatedDuration?: number;
  energyBalls?: number;
  skillId?: number;
}

export default function PomodoroPage() {
  const [location] = useLocation();
  const [, navigate] = useRouter();
  const [task, setTask] = useState<PomodoroTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Parse query parameters
  const params = new URLSearchParams(location.split('?')[1] || '');
  const taskType = params.get('type') as 'goal' | 'task' | 'habit' | null;
  const taskId = params.get('id');

  useEffect(() => {
    const loadTask = async () => {
      if (!taskType || !taskId) {
        setError('任务参数缺失');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        let loadedTask: PomodoroTask | null = null;

        if (taskType === 'goal') {
          // Load goal
          const response = await apiRequest('GET', '/api/data?type=goals');
          if (response.ok) {
            const goals: Goal[] = await response.json();
            const goal = goals.find(g => g.id === parseInt(taskId));
            if (goal) {
              loadedTask = {
                id: goal.id,
                title: goal.title,
                type: 'goal',
                estimatedDuration: 25,
                energyBalls: 3,
                skillId: goal.skillId
              };
            }
          }
        } else if (taskType === 'task' || taskType === 'habit') {
          // Load task or habit
          const response = await apiRequest('GET', '/api/data?type=tasks');
          if (response.ok) {
            const tasks: Task[] = await response.json();
            const task = tasks.find(t => t.id === parseInt(taskId));
            if (task) {
              loadedTask = {
                id: task.id,
                title: task.title,
                type: task.taskCategory === 'habit' ? 'habit' : 'task',
                estimatedDuration: task.estimatedDuration || 25,
                energyBalls: task.energyBalls,
                skillId: task.skillId
              };
            }
          }
        }

        if (loadedTask) {
          setTask(loadedTask);
        } else {
          setError('任务不存在');
        }
      } catch (err) {
        console.error('Failed to load task:', err);
        setError('加载任务失败');
      } finally {
        setLoading(false);
      }
    };

    loadTask();
  }, [taskType, taskId]);

  const handleComplete = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载任务中...</p>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h2 className="text-xl font-semibold text-destructive">加载失败</h2>
              <p className="text-muted-foreground">{error || '未找到任务'}</p>
              <Button onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                返回主页
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Convert to Task format for PomodoroTimer component
  const pomodoroTask: Task = {
    id: task.id,
    userId: '',
    title: task.title,
    description: null,
    completed: false,
    priority: 1,
    difficulty: 'medium',
    taskCategory: task.type === 'habit' ? 'habit' : 'todo',
    energyBalls: task.energyBalls || 1,
    expReward: 10,
    skillId: task.skillId || null,
    estimatedDuration: task.estimatedDuration,
    completedAt: null,
    dueDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    order: 0,
    // Battle-related fields
    actualEnergyBalls: null,
    pomodoroCycles: null,
    battleStartTime: null,
    battleEndTime: null
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-6">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回主页
          </Button>
        </div>

        <PomodoroTimer 
          task={pomodoroTask} 
          onComplete={handleComplete}
        />
      </div>
    </div>
  );
}