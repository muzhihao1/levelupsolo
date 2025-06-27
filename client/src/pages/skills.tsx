import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import SkillsRadarChart from "@/components/charts/skills-radar-chart";
import SkillsBarChart from "@/components/charts/skills-bar-chart";
import SkillTree from "@/components/skill-tree";
import type { Skill } from "@shared/schema";

export default function Skills() {
  
  const { toast } = useToast();

  const { data: skills = [] } = useQuery<Skill[]>({
    queryKey: ['/api/data?type=skills']
  });

  // 图标映射函数 - 将Font Awesome类名转换为emoji
  const getIconEmoji = (iconClass: string): string => {
    const iconMap: { [key: string]: string } = {
      'fas fa-brain': '🧠',
      'fas fa-lightbulb': '💡', 
      'fas fa-heart': '❤️',
      'fas fa-dumbbell': '💪',
      'fas fa-book': '📚',
      'fas fa-code': '💻',
      'fas fa-palette': '🎨',
      'fas fa-users': '👥',
      'fas fa-chart-line': '📈',
      'fas fa-trophy': '🏆',
      'fas fa-star': '⭐',
      'fas fa-target': '🎯',
      'fas fa-rocket': '🚀',
      'fas fa-leaf': '🌱',
      'fas fa-fire': '🔥',
      'fas fa-crown': '👑',
      'fas fa-gem': '💎',
      'fas fa-shield': '🛡️',
      'fas fa-magic': '✨',
      'fas fa-compass': '🧭'
    };
    
    return iconMap[iconClass] || '🎯';
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "bg-green-400";
    if (progress >= 60) return "bg-yellow-400";
    if (progress >= 40) return "bg-orange-400";
    return "bg-red-400";
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/20 rounded-2xl p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2 text-foreground">💪 核心技能</h1>
          <p className="text-muted-foreground">六大核心能力发展</p>
        </div>
      </div>

      

      {/* Skills Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {skills.map((skill) => {
          // Calculate current level experience progress
          const currentLevelExp = Math.max(0, skill.exp);
          const nextLevelExpRequired = Math.max(1, skill.maxExp);
          const progress = Math.max(0, Math.min(100, (currentLevelExp / nextLevelExpRequired) * 100));
          
          return (
            <Card 
              key={skill.id} 
              className="bg-card border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg"
              style={{ borderColor: `${skill.color}40` }}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-md"
                      style={{ backgroundColor: skill.color }}
                    >
                      <span className="text-lg">{getIconEmoji(skill.icon)}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground text-sm leading-tight">{skill.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                          Lv.{skill.level}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">经验值</span>
                    <span className="font-medium text-foreground">{currentLevelExp}/{nextLevelExpRequired}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <Progress 
                      value={progress} 
                      className="h-2"
                      style={{ 
                        backgroundColor: `${skill.color}20`
                      }}
                    />
                    <div className="text-center text-xs text-muted-foreground">
                      {Math.round(progress)}% 至下一级
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {skills.length === 0 && (
        <Card className="bg-card border-border">
          <CardContent className="text-center py-12">
            <i className="fas fa-chart-line text-4xl text-muted-foreground mb-4"></i>
            <h3 className="text-xl font-semibold text-foreground mb-2">还没有技能数据</h3>
            <p className="text-muted-foreground">完成一些任务来开始技能成长之旅吧！</p>
          </CardContent>
        </Card>
      )}

      {/* Skill Tree Section */}
      {skills.length > 0 && (
        <SkillTree skills={skills} />
      )}

      {/* Charts Section */}
      {skills.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Skills Radar Chart */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center text-foreground">
                <i className="fas fa-chart-area text-primary mr-2"></i>
                技能雷达图
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SkillsRadarChart skills={skills} />
            </CardContent>
          </Card>

          {/* Skills Progress Bar Chart */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center text-foreground">
                <i className="fas fa-chart-bar text-accent mr-2"></i>
                技能经验值排行
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SkillsBarChart skills={skills} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
