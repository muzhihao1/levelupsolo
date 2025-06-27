import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function TestTaskCreation() {
  const [title, setTitle] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // Fetch tasks with logging
  const { data: tasks, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/data?type=tasks'],
    queryFn: async () => {
      addLog("Fetching tasks...");
      try {
        const token = localStorage.getItem("accessToken");
        const response = await fetch('/api/data?type=tasks', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          addLog(`Fetch failed: ${response.status} ${response.statusText}`);
          throw new Error(`${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        addLog(`Fetched ${data.length} tasks successfully`);
        return data;
      } catch (err) {
        addLog(`Error fetching tasks: ${err}`);
        throw err;
      }
    },
  });

  // Create task mutation with logging
  const createTaskMutation = useMutation({
    mutationFn: async (taskTitle: string) => {
      addLog(`Creating task: "${taskTitle}"`);
      try {
        const response = await apiRequest('POST', '/api/crud?resource=tasks', {
          title: taskTitle,
          description: 'Test task created from debug page',
          expReward: 10,
          taskCategory: 'todo',
          taskType: 'simple',
        });
        
        const result = await response.json();
        addLog(`Task created successfully with ID: ${result.id}`);
        return result;
      } catch (err) {
        addLog(`Error creating task: ${err}`);
        throw err;
      }
    },
    onSuccess: () => {
      addLog("Invalidating queries...");
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=tasks'] });
      setTitle("");
    },
    onError: (error) => {
      addLog(`Mutation error: ${error}`);
    },
  });

  const handleCreateTask = () => {
    if (title.trim()) {
      createTaskMutation.mutate(title);
    }
  };

  const handleManualRefetch = () => {
    addLog("Manual refetch triggered");
    refetch();
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>任务创建测试页面</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Create Task Form */}
          <div className="flex gap-2">
            <Input
              placeholder="输入任务标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateTask()}
            />
            <Button 
              onClick={handleCreateTask}
              disabled={!title.trim() || createTaskMutation.isPending}
            >
              创建任务
            </Button>
            <Button onClick={handleManualRefetch} variant="outline">
              手动刷新
            </Button>
          </div>

          {/* Current Tasks */}
          <div className="border rounded p-4">
            <h3 className="font-semibold mb-2">当前任务 ({tasks?.length || 0})</h3>
            {isLoading && <p>加载中...</p>}
            {error && <p className="text-red-500">错误: {error.message}</p>}
            {tasks && tasks.length === 0 && <p className="text-muted-foreground">没有任务</p>}
            {tasks && tasks.map((task: any) => (
              <div key={task.id} className="py-1">
                [{task.id}] {task.title} - {task.completed ? '✓' : '○'}
              </div>
            ))}
          </div>

          {/* Debug Logs */}
          <div className="border rounded p-4 bg-muted">
            <h3 className="font-semibold mb-2">调试日志</h3>
            <div className="font-mono text-xs space-y-1 max-h-64 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}