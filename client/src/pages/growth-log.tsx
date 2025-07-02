import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ActivityLog, Skill, Task } from "@shared/schema";

export default function GrowthLog() {
  const [filter, setFilter] = useState("daily");
  const [sortBy, setSortBy] = useState("newest");
  const { toast } = useToast();

  // Create test data mutation
  const createTestDataMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/activity-logs/create-test', {});
      return response;
    },
    onSuccess: (data) => {
      console.log('Test data creation response:', data);
      if (data?.diagnostics) {
        console.log('Diagnostics:', data.diagnostics);
      }
      
      toast({
        title: "测试数据创建成功",
        description: `已创建 ${data?.logs?.length || 0} 条示例活动记录`,
      });
      
      // Show additional diagnostic info if there were issues
      if (data?.diagnostics?.createErrors?.length > 0) {
        toast({
          title: "部分记录创建失败",
          description: `失败数量: ${data.diagnostics.createErrors.length}`,
          variant: "destructive"
        });
      }
      
      refetchLogs();
    },
    onError: (error) => {
      console.error("Failed to create test data:", error);
      toast({
        title: "创建失败",
        description: "无法创建测试数据",
        variant: "destructive",
      });
    },
  });

  // Check database diagnostics
  const checkDiagnosticsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('GET', '/api/debug/activity-logs', {});
      return response;
    },
    onSuccess: (data) => {
      console.log("Activity logs diagnostics:", data);
      toast({
        title: "诊断信息",
        description: `表存在: ${data.tableExists ? '是' : '否'}, 记录数: ${data.totalCount || 0}`,
      });
    },
    onError: (error) => {
      console.error("Diagnostics failed:", error);
      toast({
        title: "诊断失败",
        description: "无法获取诊断信息",
        variant: "destructive",
      });
    },
  });

  const { data: logs = [], isLoading: logsLoading, error: logsError, refetch: refetchLogs } = useQuery<ActivityLog[]>({
    queryKey: ['/api/activity-logs'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: 1000
  });

  const { data: skills = [] } = useQuery<Skill[]>({
    queryKey: ['/api/data?type=skills'],
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 15 * 60 * 1000 // 15 minutes
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['/api/data?type=tasks'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000 // 10 minutes
  });

  const getSkillName = (skillId?: number) => {
    if (!skillId) return "";
    const skill = skills.find(s => s.id === skillId);
    return skill?.name || "";
  };

  const getSkillColor = (skillId?: number | null) => {
    if (!skillId) return "#6B7280";
    const skill = skills.find(s => s.id === skillId);
    return skill?.color || "#6B7280";
  };

  const getTaskTitle = (taskId?: number) => {
    if (!taskId) return "";
    const task = tasks.find(t => t.id === taskId);
    return task?.title || "";
  };

  // Process and filter logs
  const processedLogs = logs.filter(log => {
    if (filter === "daily") return true;
    if (filter === "weekly") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(log.createdAt || log.date) >= weekAgo;
    }
    if (filter === "monthly") {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return new Date(log.createdAt || log.date) >= monthAgo;
    }
    return true;
  });

  // Group logs by date
  const groupedLogs = processedLogs.reduce((groups: { [key: string]: ActivityLog[] }, log) => {
    const dateKey = new Date(log.createdAt || log.date).toDateString();
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(log);
    return groups;
  }, {});

  const sortedDates = Object.keys(groupedLogs).sort((a, b) => 
    sortBy === "newest" 
      ? new Date(b).getTime() - new Date(a).getTime()
      : new Date(a).getTime() - new Date(b).getTime()
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    if (dateString === today) return "今天";
    if (dateString === yesterday) return "昨天";
    
    return date.toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'task_completed':
      case 'task_completed_with_pomodoro':
        return 'fas fa-check-circle text-green-400';
      case 'skill_levelup':
        return 'fas fa-arrow-up text-blue-400';
      case 'goal_completed':
        return 'fas fa-trophy text-yellow-400';
      case 'milestone_completed':
        return 'fas fa-flag text-purple-400';
      case 'level_up':
        return 'fas fa-star text-amber-400';
      case 'goal_pomodoro_complete':
        return 'fas fa-clock text-orange-400';
      default:
        return 'fas fa-star text-gray-400';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'task_completed':
        return '任务完成';
      case 'skill_levelup':
        return '技能升级';
      case 'goal_completed':
        return '目标完成';
      case 'milestone_completed':
        return '里程碑完成';
      case 'level_up':
        return '等级提升';
      case 'goal_pomodoro_complete':
        return '番茄钟完成';
      case 'task_completed_with_pomodoro':
        return '番茄钟任务完成';
      default:
        return '活动';
    }
  };

  // Calculate daily stats based on task completions
  const getDailyStats = (dateLogs: ActivityLog[]) => {
    // Count both regular and pomodoro task completions
    const completedTasks = dateLogs.filter(log => 
      log.action === 'task_completed' || log.action === 'task_completed_with_pomodoro'
    ).length;
    
    // Total experience gained from completed tasks
    const totalExp = dateLogs
      .filter(log => log.action === 'task_completed' || log.action === 'task_completed_with_pomodoro')
      .reduce((sum, log) => sum + log.expGained, 0);
    
    // Count unique skills that gained experience from task completions
    const skillsImproved = new Set(
      dateLogs
        .filter(log => (log.action === 'task_completed' || log.action === 'task_completed_with_pomodoro') && log.skillId)
        .map(log => log.skillId)
    ).size;
    
    const levelUps = dateLogs.filter(log => log.action === 'skill_levelup').length;
    
    return { 
      completedTasks, 
      totalExp, 
      skillsImproved, 
      levelUps 
    };
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/20 rounded-2xl p-6 text-center">
        <h1 className="text-2xl font-bold mb-2 text-foreground">📈 升级记录</h1>
        <p className="text-muted-foreground">查看你的经验值获取和能力提升历程</p>
      </div>

      {/* Filters and Stats */}
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="筛选时间" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">按日查看</SelectItem>
                  <SelectItem value="weekly">按周查看</SelectItem>
                  <SelectItem value="monthly">按月查看</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="排序方式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">最新优先</SelectItem>
                  <SelectItem value="oldest">最早优先</SelectItem>
                  <SelectItem value="most_exp">经验最多</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Logs */}
      <div className="space-y-6">
        {logsLoading ? (
          <Card className="bg-card border-border">
            <CardContent className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">加载日志中...</p>
            </CardContent>
          </Card>
        ) : logsError ? (
          <Card className="bg-card border-border">
            <CardContent className="text-center py-12">
              <i className="fas fa-exclamation-triangle text-4xl text-destructive mb-4"></i>
              <h3 className="text-xl font-semibold text-foreground mb-2">加载失败</h3>
              <p className="text-muted-foreground mb-4">无法加载活动日志，请稍后重试</p>
              <div className="flex justify-center gap-2">
                <Button onClick={() => refetchLogs()} variant="outline">
                  重新加载
                </Button>
                <Button 
                  onClick={() => {
                    checkDiagnosticsMutation.mutate();
                    // Also log detailed information
                    console.log('Logs data:', logs);
                    console.log('Logs loading:', logsLoading);
                    console.log('Logs error:', logsError);
                  }} 
                  variant="outline"
                  disabled={checkDiagnosticsMutation.isPending}
                >
                  <i className="fas fa-stethoscope mr-2"></i>
                  诊断问题
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : logs.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="text-center py-12">
              <i className="fas fa-book text-4xl text-muted-foreground mb-4"></i>
              <h3 className="text-xl font-semibold text-foreground mb-2">还没有升级记录</h3>
              <p className="text-muted-foreground mb-4">完成一些任务来开始记录你的升级历程吧！</p>
              <div className="mt-4 space-y-2">
                <div className="flex justify-center gap-2">
                  <Button 
                    onClick={() => createTestDataMutation.mutate()}
                    disabled={createTestDataMutation.isPending}
                    variant="outline"
                  >
                    {createTestDataMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                        创建中...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-plus mr-2"></i>
                        创建示例记录
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={() => {
                      checkDiagnosticsMutation.mutate();
                      console.log('Empty logs state - diagnostics clicked');
                      console.log('Current logs:', logs);
                      console.log('Query state:', { logsLoading, logsError });
                    }} 
                    variant="outline"
                    disabled={checkDiagnosticsMutation.isPending}
                  >
                    <i className="fas fa-stethoscope mr-2"></i>
                    诊断
                  </Button>
                </div>
                {checkDiagnosticsMutation.data && (
                  <div className="text-xs text-muted-foreground">
                    表存在: {checkDiagnosticsMutation.data.tableExists ? '是' : '否'} | 
                    总记录: {checkDiagnosticsMutation.data.totalCount || 0}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          sortedDates.map((dateString) => {
            const dateLogs = groupedLogs[dateString];
            const stats = getDailyStats(dateLogs);
            const isToday = dateString === new Date().toDateString();
            
            return (
              <Card key={dateString} className="bg-card border-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        isToday 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-green-600 text-white'
                      }`}>
                        <i className="fas fa-calendar-day"></i>
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground">
                          {new Date(dateString).toLocaleDateString('zh-CN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </h3>
                        <p className="text-sm text-muted-foreground">{formatDate(dateString)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        +{stats.totalExp} XP
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {stats.completedTasks}个任务完成
                      </div>
                    </div>
                  </div>

                  {/* Daily Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-muted rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{stats.completedTasks}</div>
                      <div className="text-xs text-muted-foreground">任务完成</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{stats.totalExp}</div>
                      <div className="text-xs text-muted-foreground">经验获得</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-accent">{stats.skillsImproved}</div>
                      <div className="text-xs text-muted-foreground">技能提升</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-warning">{stats.levelUps}</div>
                      <div className="text-xs text-muted-foreground">等级提升</div>
                    </div>
                  </div>

                  {/* Activity Details */}
                  <div className="space-y-3">
                    {dateLogs.map((log) => (
                      <div key={log.id} className="flex items-center space-x-4 p-3 bg-background border border-border rounded-lg hover:bg-muted transition-colors">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
                          style={{ backgroundColor: getSkillColor(log.skillId) }}
                        >
                          <i className="fas fa-star"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant="secondary"
                              className="bg-primary/20 text-primary"
                            >
                              {getActionLabel(log.action)}
                            </Badge>
                            {log.skillId && (
                              <Badge 
                                variant="outline"
                                className="border-border text-foreground"
                              >
                                {getSkillName(log.skillId)}
                              </Badge>
                            )}
                          </div>
                          <p className="text-foreground font-medium truncate mt-1">
                            {(log.details as any)?.description || log.description || (log.taskId ? getTaskTitle(log.taskId) : '活动记录')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(log.createdAt || log.date).toLocaleTimeString('zh-CN', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-green-600 dark:text-green-400 font-bold">
                            +{log.expGained} XP
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}