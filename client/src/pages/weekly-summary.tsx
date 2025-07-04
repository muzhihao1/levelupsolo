
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ActivityLog, Skill, Task } from "@shared/schema";

interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  totalTasks: number;
  completedTasks: number;
  totalExp: number;
  topSkills: Array<{
    name: string;
    exp: number;
    color: string;
  }>;
  achievements: string[];
  insights: string;
  recommendations: string[];
  productivityScore: number;
  focusAreas: string[];
}

export default function WeeklySummary() {
  const [selectedWeek, setSelectedWeek] = useState(0); // 0 = 本周, 1 = 上周, etc.
  const { toast } = useToast();

  const { data: logs = [] } = useQuery<ActivityLog[]>({
    queryKey: ['/api/activity-logs']
  });

  const { data: skills = [] } = useQuery<Skill[]>({
    queryKey: ['/api/data?type=skills']
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['/api/data?type=tasks']
  });

  // 生成每周总结
  const generateSummaryMutation = useMutation({
    mutationFn: async (weekOffset: number) => {
      const response = await apiRequest('POST', '/api/weekly-summary/generate', { 
        weekOffset 
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "总结生成成功",
        description: "AI 已为您生成本周工作总结",
      });
    },
    onError: (error) => {
      toast({
        title: "生成失败",
        description: "生成每周总结时出现错误，请重试",
        variant: "destructive"
      });
    }
  });

  // 获取指定周的数据
  const getWeekData = (weekOffset: number) => {
    const now = new Date();
    const currentDay = now.getDay();
    const daysToSubtract = currentDay === 0 ? 6 : currentDay - 1; // 周一为一周开始
    
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysToSubtract - (weekOffset * 7));
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    return { weekStart, weekEnd };
  };

  const { weekStart, weekEnd } = getWeekData(selectedWeek);

  // 过滤本周的数据
  const weekLogs = logs.filter(log => {
    const logDate = new Date(log.createdAt || '');
    return logDate >= weekStart && logDate <= weekEnd;
  });

  const weekTasks = tasks.filter(task => {
    const taskDate = new Date(task.createdAt);
    return taskDate >= weekStart && taskDate <= weekEnd;
  });

  // 计算基础统计
  const completedTasks = weekTasks.filter(task => task.completed).length;
  const totalExp = weekLogs
    .filter(log => log.action === 'task_completed' || log.action === 'task_completed_with_pomodoro')
    .reduce((sum, log) => sum + log.expGained, 0);

  // 技能经验统计
  const skillExpMap = new Map<number, number>();
  weekLogs
    .filter(log => log.skillId && (log.action === 'task_completed' || log.action === 'task_completed_with_pomodoro'))
    .forEach(log => {
      const current = skillExpMap.get(log.skillId!) || 0;
      skillExpMap.set(log.skillId!, current + log.expGained);
    });

  const topSkills = Array.from(skillExpMap.entries())
    .map(([skillId, exp]) => {
      const skill = skills.find(s => s.id === skillId);
      return skill ? { name: skill.name, exp, color: skill.color } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b!.exp - a!.exp)
    .slice(0, 5) as Array<{ name: string; exp: number; color: string; }>;

  const formatWeekRange = (start: Date, end: Date) => {
    return `${start.getMonth() + 1}月${start.getDate()}日 - ${end.getMonth() + 1}月${end.getDate()}日`;
  };

  const getWeekLabel = (offset: number) => {
    if (offset === 0) return "本周";
    if (offset === 1) return "上周";
    return `${offset}周前`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-center">
        <h1 className="text-2xl font-bold mb-2 text-white">📊 每周总结</h1>
        <p className="text-white/90">AI 智能分析你的每周工作表现和成长轨迹</p>
      </div>

      {/* 周期选择 */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <Select value={selectedWeek.toString()} onValueChange={(value) => setSelectedWeek(parseInt(value))}>
                <SelectTrigger className="w-[140px] bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="选择周期" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {[0, 1, 2, 3, 4].map(offset => (
                    <SelectItem key={offset} value={offset.toString()} className="text-white">
                      {getWeekLabel(offset)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-white">
                {formatWeekRange(weekStart, weekEnd)}
              </div>
            </div>
            <Button 
              onClick={() => generateSummaryMutation.mutate(selectedWeek)}
              disabled={generateSummaryMutation.isPending}
              className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
            >
              {generateSummaryMutation.isPending ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  生成中...
                </>
              ) : (
                <>
                  <i className="fas fa-magic mr-2"></i>
                  生成 AI 总结
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 基础统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{completedTasks}</div>
            <div className="text-sm text-gray-400">任务完成</div>
            <div className="text-xs text-gray-500">总共 {weekTasks.length} 个任务</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{totalExp}</div>
            <div className="text-sm text-gray-400">经验获得</div>
            <div className="text-xs text-gray-500">XP 值</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">{topSkills.length}</div>
            <div className="text-sm text-gray-400">活跃技能</div>
            <div className="text-xs text-gray-500">有进展的技能数</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">
              {weekTasks.length > 0 ? Math.round((completedTasks / weekTasks.length) * 100) : 0}%
            </div>
            <div className="text-sm text-gray-400">完成率</div>
            <div className="text-xs text-gray-500">任务完成率</div>
          </CardContent>
        </Card>
      </div>

      {/* 技能进展 */}
      {topSkills.length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <i className="fas fa-chart-bar text-blue-400 mr-2"></i>
              技能进展排行
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topSkills.map((skill, index) => (
              <div key={skill.name} className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 flex-1">
                  <div className="text-lg font-bold text-gray-400">#{index + 1}</div>
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: skill.color }}
                  ></div>
                  <div className="text-white font-medium">{skill.name}</div>
                </div>
                <Badge className="bg-green-500/20 text-green-400">
                  +{skill.exp} XP
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* AI 总结结果 */}
      {generateSummaryMutation.data && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <i className="fas fa-robot text-purple-400 mr-2"></i>
              AI 智能分析报告
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 总体洞察 */}
            <div className="bg-slate-700 rounded-lg p-4">
              <h4 className="text-white font-medium mb-2 flex items-center">
                <i className="fas fa-lightbulb text-yellow-400 mr-2"></i>
                总体洞察
              </h4>
              <p className="text-gray-300 leading-relaxed">
                {generateSummaryMutation.data.insights}
              </p>
            </div>

            {/* 改进建议 */}
            {generateSummaryMutation.data.recommendations && generateSummaryMutation.data.recommendations.length > 0 && (
              <div className="bg-slate-700 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3 flex items-center">
                  <i className="fas fa-compass text-blue-400 mr-2"></i>
                  改进建议
                </h4>
                <ul className="space-y-2">
                  {generateSummaryMutation.data.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="text-gray-300 flex items-start">
                      <i className="fas fa-arrow-right text-green-400 mr-2 mt-1 text-xs"></i>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 下周重点 */}
            {generateSummaryMutation.data.focusAreas && generateSummaryMutation.data.focusAreas.length > 0 && (
              <div className="bg-slate-700 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3 flex items-center">
                  <i className="fas fa-target text-red-400 mr-2"></i>
                  下周重点关注
                </h4>
                <div className="flex flex-wrap gap-2">
                  {generateSummaryMutation.data.focusAreas.map((area: string, index: number) => (
                    <Badge key={index} className="bg-indigo-500/20 text-indigo-300 border-indigo-400">
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 空状态 */}
      {weekTasks.length === 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="text-center py-12">
            <i className="fas fa-calendar-times text-4xl text-gray-400 mb-4"></i>
            <h3 className="text-xl font-semibold text-white mb-2">该周暂无数据</h3>
            <p className="text-gray-400">这一周还没有任务记录，去完成一些任务吧！</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
