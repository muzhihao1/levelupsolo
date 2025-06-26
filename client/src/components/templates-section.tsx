import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  BookOpen, 
  Target, 
  Dumbbell, 
  Heart, 
  Briefcase, 
  Brain,
  Users,
  TrendingUp,
  Plus,
  Clock,
  Star
} from "lucide-react";
import type { InsertTask, InsertGoal } from "@shared/schema";

interface Template {
  id: string;
  type: 'task' | 'goal';
  category: 'health' | 'career' | 'learning' | 'relationships' | 'finance' | 'personal';
  title: string;
  description: string;
  icon: React.ReactNode;
  estimatedDuration?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  expReward: number;
  tags: string[];
}

const TEMPLATE_DATA: Template[] = [
  // Health & Fitness Templates
  {
    id: 'health-1',
    type: 'task',
    category: 'health',
    title: '每日晨练30分钟',
    description: '建立晨练习惯，提升身体素质和一天的精神状态',
    icon: <Dumbbell className="h-5 w-5" />,
    estimatedDuration: 30,
    difficulty: 'medium',
    expReward: 25,
    tags: ['健康', '运动', '习惯']
  },
  {
    id: 'health-2',
    type: 'goal',
    category: 'health',
    title: '30天健康饮食计划',
    description: '建立健康的饮食习惯，每天记录三餐营养摄入',
    icon: <Heart className="h-5 w-5" />,
    estimatedDuration: 60,
    difficulty: 'hard',
    expReward: 50,
    tags: ['健康', '营养', '长期目标']
  },
  
  // Learning & Development Templates
  {
    id: 'learning-1',
    type: 'task',
    category: 'learning',
    title: '阅读技术文章',
    description: '每天阅读一篇高质量的技术或行业文章，并做笔记',
    icon: <BookOpen className="h-5 w-5" />,
    estimatedDuration: 20,
    difficulty: 'easy',
    expReward: 15,
    tags: ['学习', '阅读', '知识积累']
  },
  {
    id: 'learning-2',
    type: 'goal',
    category: 'learning',
    title: '掌握新技能',
    description: '在3个月内学会一项新的专业技能或工具',
    icon: <Brain className="h-5 w-5" />,
    estimatedDuration: 120,
    difficulty: 'hard',
    expReward: 100,
    tags: ['技能', '学习', '职业发展']
  },

  // Career Templates
  {
    id: 'career-1',
    type: 'task',
    category: 'career',
    title: '完善LinkedIn档案',
    description: '更新LinkedIn专业档案，添加最新经历和技能',
    icon: <Briefcase className="h-5 w-5" />,
    estimatedDuration: 45,
    difficulty: 'easy',
    expReward: 20,
    tags: ['职业', '网络建设', '个人品牌']
  },
  {
    id: 'career-2',
    type: 'goal',
    category: 'career',
    title: '职业晋升准备',
    description: '制定6个月职业发展计划，提升核心技能',
    icon: <TrendingUp className="h-5 w-5" />,
    estimatedDuration: 180,
    difficulty: 'hard',
    expReward: 80,
    tags: ['职业', '晋升', '技能发展']
  },

  // Relationships Templates
  {
    id: 'relationships-1',
    type: 'task',
    category: 'relationships',
    title: '联系老朋友',
    description: '主动联系一位久未联系的朋友，维护人际关系',
    icon: <Users className="h-5 w-5" />,
    estimatedDuration: 15,
    difficulty: 'easy',
    expReward: 10,
    tags: ['人际关系', '社交', '友谊']
  },
  {
    id: 'relationships-2',
    type: 'goal',
    category: 'relationships',
    title: '扩展社交圈',
    description: '参加社交活动，结识5位新朋友或专业联系人',
    icon: <Heart className="h-5 w-5" />,
    estimatedDuration: 90,
    difficulty: 'medium',
    expReward: 40,
    tags: ['社交', '网络', '人际关系']
  }
];

export default function TemplatesSection() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Create task from template mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: InsertTask) => {
      return await apiRequest('POST', '/api/tasks', taskData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user-stats'] });
      toast({
        title: "任务创建成功",
        description: "模板任务已添加到您的任务列表",
      });
    },
    onError: (error) => {
      console.error('Task creation failed:', error);
      toast({
        title: "创建失败",
        description: "无法创建任务，请重试",
        variant: "destructive",
      });
    }
  });

  // Create goal from template mutation
  const createGoalMutation = useMutation({
    mutationFn: async (goalData: InsertGoal) => {
      return await apiRequest('POST', '/api/goals', goalData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      toast({
        title: "目标创建成功",
        description: "模板目标已添加到您的目标列表",
      });
    },
    onError: (error) => {
      console.error('Goal creation failed:', error);
      toast({
        title: "创建失败",
        description: "无法创建目标，请重试",
        variant: "destructive",
      });
    }
  });

  const handleUseTemplate = (template: Template) => {
    if (template.type === 'goal') {
      const goalData: InsertGoal = {
        title: template.title,
        description: template.description,
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        userId: "" // Will be set by backend
      };
      createGoalMutation.mutate(goalData);
    } else {
      const taskData: InsertTask = {
        title: template.title,
        description: template.description,
        estimatedDuration: template.estimatedDuration || 30,
        expReward: template.expReward,
        difficulty: template.difficulty,
        userId: "" // Will be set by backend
      };
      createTaskMutation.mutate(taskData);
    }
  };

  const categories = [
    { id: 'all', label: '全部', icon: <Target className="h-4 w-4" /> },
    { id: 'health', label: '健康', icon: <Heart className="h-4 w-4" /> },
    { id: 'learning', label: '学习', icon: <BookOpen className="h-4 w-4" /> },
    { id: 'career', label: '职业', icon: <Briefcase className="h-4 w-4" /> },
    { id: 'relationships', label: '社交', icon: <Users className="h-4 w-4" /> }
  ];

  const filteredTemplates = selectedCategory === 'all' 
    ? TEMPLATE_DATA 
    : TEMPLATE_DATA.filter(template => template.category === selectedCategory);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-700 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'hard': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '简单';
      case 'medium': return '中等';
      case 'hard': return '困难';
      default: return '未知';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">模板中心</h2>
          <p className="text-sm text-muted-foreground">
            选择预设模板快速创建任务和目标
          </p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(category.id)}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            {category.icon}
            {category.label}
          </Button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {template.icon}
                  <CardTitle className="text-sm font-medium">
                    {template.title}
                  </CardTitle>
                </div>
                <Badge 
                  variant="outline"
                  className={`text-xs ${template.type === 'goal' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}
                >
                  {template.type === 'goal' ? '目标' : '任务'}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground line-clamp-2">
                {template.description}
              </p>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getDifficultyColor(template.difficulty)}`}
                >
                  {getDifficultyLabel(template.difficulty)}
                </Badge>
                
                {template.estimatedDuration && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {template.estimatedDuration}分钟
                  </div>
                )}

                <div className="flex items-center gap-1 text-xs text-blue-600">
                  <Star className="h-3 w-3" />
                  {template.expReward} XP
                </div>
              </div>

              <div className="flex items-center gap-1 flex-wrap">
                {template.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {template.tags.length > 2 && (
                  <span className="text-xs text-muted-foreground">
                    +{template.tags.length - 2}
                  </span>
                )}
              </div>

              <Button
                onClick={() => handleUseTemplate(template)}
                disabled={createTaskMutation.isPending || createGoalMutation.isPending}
                size="sm"
                className="w-full bg-primary hover:bg-primary/90 text-white border-0"
                style={{ backgroundColor: '#3b82f6', color: '#ffffff', fontWeight: '600' }}
              >
                <Plus className="h-4 w-4 mr-2" style={{ color: '#ffffff' }} />
                使用模板
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">此分类暂无模板</p>
        </div>
      )}
    </div>
  );
}