import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Target, CheckCircle, Repeat, Zap, AlertCircle } from "lucide-react";
import PomodoroTimer from "@/components/pomodoro-timer";

interface PomodoroTask {
  id: number;
  title: string;
  type: 'goal' | 'task' | 'habit';
  energyBalls: number;
  skillId?: number | null;
  startTime: string;
}

export default function PomodoroPage() {
  const [, setLocation] = useLocation();
  const [task, setTask] = useState<PomodoroTask | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load task from session storage
    const storedTaskData = sessionStorage.getItem('currentPomodoroTask');
    if (storedTaskData) {
      try {
        const taskData = JSON.parse(storedTaskData);
        setTask(taskData);
      } catch (e) {
        console.error('Failed to parse task data:', e);
        setError('无法加载任务信息');
      }
    } else {
      setError('没有选择任务');
    }
  }, []);

  const handleComplete = () => {
    // Clear session storage
    sessionStorage.removeItem('currentPomodoroTask');
    // Navigate back to dashboard
    setLocation('/dashboard');
  };

  const handleBack = () => {
    // Clear session storage
    sessionStorage.removeItem('currentPomodoroTask');
    // Navigate back
    setLocation('/dashboard');
  };

  const getTaskIcon = (type: PomodoroTask['type']) => {
    switch (type) {
      case 'goal': return <Target className="h-5 w-5" />;
      case 'task': return <CheckCircle className="h-5 w-5" />;
      case 'habit': return <Repeat className="h-5 w-5" />;
    }
  };

  const getTaskTypeLabel = (type: PomodoroTask['type']) => {
    switch (type) {
      case 'goal': return '主线任务';
      case 'task': return '支线任务';
      case 'habit': return '日常习惯';
    }
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="border-destructive">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">{error}</h2>
            <p className="text-muted-foreground mb-6">
              请返回仪表板重新选择任务
            </p>
            <Button onClick={handleBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回仪表板
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={handleBack}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  {getTaskIcon(task.type)}
                </div>
                <div>
                  <CardTitle className="text-xl">{task.title}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">
                      {getTaskTypeLabel(task.type)}
                    </Badge>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span>{task.energyBalls} 能量球</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Timer */}
      <PomodoroTimer
        taskId={task.id}
        taskTitle={task.title}
        taskType={task.type}
        onComplete={handleComplete}
        estimatedDuration={25}
        energyBalls={task.energyBalls}
      />
    </div>
  );
}