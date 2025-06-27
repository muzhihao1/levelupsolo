import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { 
  Plus, 
  Target, 
  Calendar, 
  TrendingUp, 
  BookOpen, 
  ArrowRight,
  Lightbulb,
  Clock
} from "lucide-react";
import type { Task, Goal, Skill, UserStats } from "@shared/schema";

interface Recommendation {
  id: string;
  type: 'action' | 'insight' | 'suggestion';
  title: string;
  description: string;
  href?: string;
  action?: () => void;
  priority: 'high' | 'medium' | 'low';
  icon: React.ReactNode;
}

export default function SmartRecommendations() {
  const { data: tasks = [] } = useQuery<Task[]>({ queryKey: ['/api/data?type=tasks'] });
  const { data: goals = [] } = useQuery<Goal[]>({ queryKey: ['/api/data?type=goals'] });
  const { data: skills = [] } = useQuery<Skill[]>({ queryKey: ['/api/data?type=skills'] });
  const { data: userStats } = useQuery<UserStats>({ queryKey: ['/api/user-stats'] });

  const generateRecommendations = (): Recommendation[] => {
    const recommendations: Recommendation[] = [];

    // No tasks recommendation
    if (tasks.length === 0) {
      recommendations.push({
        id: 'create-first-task',
        type: 'action',
        title: '创建你的第一个任务',
        description: '开始你的成长之旅，添加一个简单的日常任务',
        href: '/tasks',
        priority: 'high',
        icon: <Plus className="h-4 w-4" />
      });
    }

    // Incomplete tasks today
    const incompleteTasks = tasks.filter(task => !task.completed);
    if (incompleteTasks.length > 5) {
      recommendations.push({
        id: 'focus-tasks',
        type: 'suggestion',
        title: '专注完成当前任务',
        description: `你有 ${incompleteTasks.length} 个未完成任务，建议先完成几个`,
        href: '/tasks',
        priority: 'medium',
        icon: <Clock className="h-4 w-4" />
      });
    }

    // No goals recommendation
    if (goals.length === 0) {
      recommendations.push({
        id: 'set-first-goal',
        type: 'action',
        title: '设置你的第一个目标',
        description: '明确目标能让你的成长更有方向性',
        href: '/goals',
        priority: 'high',
        icon: <Target className="h-4 w-4" />
      });
    }

    // Low level skills recommendation
    const lowLevelSkills = skills.filter(skill => skill.level < 3);
    if (lowLevelSkills.length > 0) {
      recommendations.push({
        id: 'develop-skills',
        type: 'insight',
        title: '技能发展建议',
        description: `${lowLevelSkills[0]?.name} 技能还有很大提升空间`,
        href: '/skills',
        priority: 'medium',
        icon: <TrendingUp className="h-4 w-4" />
      });
    }

    // Achievement milestone
    if (userStats && userStats.experience > 0) {
      const nextLevelExp = userStats.level * 100;
      const expToNext = nextLevelExp - userStats.experience;
      if (expToNext <= 50) {
        recommendations.push({
          id: 'level-up-soon',
          type: 'insight',
          title: '即将升级！',
          description: `只需再获得 ${expToNext} 经验值就能升级到 ${userStats.level + 1} 级`,
          priority: 'high',
          icon: <TrendingUp className="h-4 w-4" />
        });
      }
    }

    // Learning resources recommendation
    if (tasks.length > 0 && goals.length > 0) {
      recommendations.push({
        id: 'explore-templates',
        type: 'suggestion',
        title: '探索模板中心',
        description: '发现更多专业的任务和目标模板',
        href: '/templates',
        priority: 'low',
        icon: <BookOpen className="h-4 w-4" />
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }).slice(0, 3); // Show top 3 recommendations
  };

  const recommendations = generateRecommendations();

  if (recommendations.length === 0) return null;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'action': return '建议行动';
      case 'insight': return '数据洞察';
      case 'suggestion': return '优化建议';
      default: return '推荐';
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          智能推荐
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recommendations.map((rec) => (
            <div 
              key={rec.id}
              className="flex items-start justify-between p-4 border border-border rounded-lg hover:shadow-sm transition-shadow cursor-pointer hover:bg-muted/50"
              onClick={() => {
                console.log('Smart recommendation clicked:', rec.title);
                if (rec.href) {
                  // Navigate to the href
                  window.location.href = rec.href;
                } else {
                  // Handle action-based recommendations
                  console.log('Executing recommendation action for:', rec.id);
                }
              }}
            >
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 bg-primary/10 rounded-lg">
                  {rec.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-foreground">{rec.title}</h4>
                    <Badge variant="outline" className={getPriorityColor(rec.priority)}>
                      {getTypeLabel(rec.type)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{rec.description}</p>
                </div>
              </div>
              {rec.href && (
                <Link href={rec.href}>
                  <Button variant="ghost" size="sm" className="ml-2">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}