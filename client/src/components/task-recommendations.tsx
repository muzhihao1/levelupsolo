import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Clock, Zap, Target } from 'lucide-react';

interface TaskRecommendation {
  taskId: string;
  reason: string;
  confidence: number;
  type: 'micro' | 'milestone' | 'warmup';
  task?: any;
}

interface TaskRecommendationsProps {
  userState: any;
  onTaskStart: (taskId: string) => void;
}

export function TaskRecommendations({ userState, onTaskStart }: TaskRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<TaskRecommendation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('UserState changed:', userState);
    if (userState) {
      fetchRecommendations();
    }
  }, [userState]);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      console.log('Fetching recommendations...');
      const response = await fetch('/api/recommendations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Received recommendations:', data);
      setRecommendations(data || []);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      // 设置一些fallback推荐
      setRecommendations([
        {
          taskId: 'fallback-1',
          reason: '网络连接问题，这里是默认推荐任务',
          confidence: 0.8,
          type: 'micro'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'warmup': return '🔥';
      case 'micro': return '⚡';
      case 'milestone': return '🎯';
      default: return '📝';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'warmup': return '热身任务';
      case 'micro': return '微任务';
      case 'milestone': return '里程碑';
      default: return '任务';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  // 根据用户状态智能生成任务标题
  const getRecommendedTaskTitle = (rec: TaskRecommendation, index: number) => {
    const baseTitles = [
      "SCI论文文献调研 - 搜索相关研究",
      "确定研究课题 - 分析研究方向", 
      "论文大纲制定 - 框架设计"
    ];

    if (userState.energyLevel === 'low') {
      return ["轻松浏览文献资料", "整理现有研究笔记", "回顾研究进展"][index] || baseTitles[index];
    }

    if (userState.energyLevel === 'high') {
      return ["深度分析研究文献", "撰写论文核心章节", "创新研究方法设计"][index] || baseTitles[index];
    }

    return baseTitles[index] || "学习任务";
  };

  // 根据用户状态估算任务时长
  const getEstimatedDuration = (state: any, rec: TaskRecommendation) => {
    const baseDuration = 15;

    if (state.availableTime <= 15) return 10;
    if (state.availableTime <= 30) return 15;
    if (state.availableTime <= 60) return 25;
    return 30;
  };

  // 计算经验奖励
  const getExpReward = (rec: TaskRecommendation) => {
    return Math.floor(10 + rec.confidence * 10);
  };

  // 推荐相关技能
  const getRecommendedSkill = (rec: TaskRecommendation) => {
    const skills = ["心智成长力", "意志执行力", "情绪稳定力"];
    return skills[Math.floor(Math.random() * skills.length)];
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">正在为您生成个性化推荐...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          💡 为您推荐
          <Badge variant="secondary">基于当前状态</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            暂无推荐任务，请先设置您的当前状态
          </div>
        ) : (
          recommendations.map((rec, index) => (
            <div
              key={rec.taskId}
              className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{getTypeIcon(rec.type)}</span>
                    <Badge variant="outline">{getTypeLabel(rec.type)}</Badge>
                    {index === 0 && (
                      <Badge className="bg-purple-500 text-white">推荐</Badge>
                    )}
                  </div>

                  <h4 className="font-medium mb-1">
                    {getRecommendedTaskTitle(rec, index)}
                  </h4>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      预计{getEstimatedDuration(userState, rec)}分钟
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap className="w-4 h-4" />
                      +{getExpReward(rec)} EXP
                    </div>
                    <div className="flex items-center gap-1">
                      <Target className="w-4 h-4" />
                      {getRecommendedSkill(rec)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-muted-foreground">推荐度:</span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getConfidenceColor(rec.confidence)} transition-all duration-300`}
                        style={{ width: `${rec.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(rec.confidence * 100)}%
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground mb-3">
                    💡 {rec.reason}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={() => onTaskStart(rec.taskId)}
                  className="flex-1"
                  variant={index === 0 ? "default" : "outline"}
                >
                  {index === 0 ? '开始学习' : '选择此任务'}
                </Button>
                <Button variant="ghost" size="sm">
                  不感兴趣
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}