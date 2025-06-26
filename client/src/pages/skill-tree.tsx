import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Brain, Star, Trophy, Zap, Target, Award, Crown, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";


interface Skill {
  id: number;
  name: string;
  level: number;
  exp: number;
  maxExp: number;
  color: string;
  icon: string;
  skillType: string;
  category: string;
  talentPoints?: number;
  prestige?: number;
  unlocked: boolean;
}

interface Achievement {
  id: number;
  title: string;
  description: string;
  icon: string;
  rarity: string;
  category: string;
  points: number;
  unlockedAt: string;
}

export default function SkillTree() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: skills, isLoading: skillsLoading } = useQuery({
    queryKey: ["/api/skills"],
  });

  // 天赋点使用功能
  const useTalentMutation = useMutation({
    mutationFn: async ({ skillId, enhancement }: { skillId: number; enhancement: string }) => {
      const response = await fetch(`/api/skills/${skillId}/use-talent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enhancement }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "天赋使用失败");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/skills"] });
      toast({
        title: "天赋使用成功",
        description: "技能已获得增强效果",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "天赋使用失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const useTalentPoint = (skillId: number, enhancement: string) => {
    useTalentMutation.mutate({ skillId, enhancement });
  };

  const getSkillIcon = (iconName: string) => {
    const iconMap: { [key: string]: JSX.Element } = {
      brain: <Brain className="w-5 h-5" />,
      star: <Star className="w-5 h-5" />,
      trophy: <Trophy className="w-5 h-5" />,
      zap: <Zap className="w-5 h-5" />,
      target: <Target className="w-5 h-5" />,
      award: <Award className="w-5 h-5" />,
      crown: <Crown className="w-5 h-5" />,
      sparkles: <Sparkles className="w-5 h-5" />,
    };
    return iconMap[iconName] || <Star className="w-5 h-5" />;
  };

  const getPrestigeIcon = (prestige: number) => {
    if (prestige >= 3) return <Crown className="w-4 h-4 text-purple-500" />;
    if (prestige >= 2) return <Trophy className="w-4 h-4 text-gold-500" />;
    if (prestige >= 1) return <Star className="w-4 h-4 text-blue-500" />;
    return null;
  };

  const calculateExpForLevel = (level: number) => {
    return level * 100;
  };

  if (skillsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">加载中...</div>
      </div>
    );
  }

  const skillsArray = (skills as Skill[]) || [];
  
  const totalLevel = skillsArray.reduce((sum: number, skill: Skill) => sum + (skill.level - 1), 0);
  const totalExp = skillsArray.reduce((sum: number, skill: Skill) => sum + skill.exp, 0);
  const totalTalentPoints = skillsArray.reduce((sum: number, skill: Skill) => sum + (skill.talentPoints || 0), 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          核心技能
        </h1>
        <p className="text-muted-foreground">六大核心能力发展</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总等级</CardTitle>
            <Trophy className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLevel}</div>
            <p className="text-xs text-muted-foreground">
              平均等级: {skills && (skills as Skill[]).length > 0 ? (totalLevel / (skills as Skill[]).length + 1).toFixed(1) : 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总经验值</CardTitle>
            <Zap className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExp.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              已获得经验
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">天赋点数</CardTitle>
            <Star className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTalentPoints}</div>
            <p className="text-xs text-muted-foreground">
              可用天赋点
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="skills" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="skills">核心技能</TabsTrigger>
          <TabsTrigger value="talents">天赋增强</TabsTrigger>
        </TabsList>

        {/* Skills Tab */}
        <TabsContent value="skills" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {skillsArray.map((skill: Skill) => {
              // Fix negative percentage calculation - use simple ratio
              const progress = Math.max(0, Math.min(100, (skill.exp / skill.maxExp) * 100));
              
              return (
                <Card 
                  key={skill.id} 
                  className="relative overflow-hidden transition-all duration-200 hover:shadow-lg border-2"
                  style={{ borderColor: skill.color }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg" style={{ backgroundColor: skill.color + '20' }}>
                          <i className={`${skill.icon} text-xl`} style={{ color: skill.color }}></i>
                        </div>
                        <div>
                          <CardTitle className="text-lg font-bold">{skill.name}</CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-sm">Lv.{skill.level}</Badge>
                            {skill.prestige && skill.prestige > 0 && (
                              <div className="flex items-center gap-1">
                                {getPrestigeIcon(skill.prestige)}
                                <span className="text-xs font-medium">{skill.prestige}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>经验值</span>
                        <span>{skill.exp}/{skill.maxExp}</span>
                      </div>
                      <Progress value={progress} className="h-3" />
                      <div className="text-xs text-muted-foreground text-center">
                        {Math.floor(progress)}% 至下一级
                      </div>
                      {skill.talentPoints && skill.talentPoints > 0 && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-accent/10 rounded-lg p-2">
                          <Sparkles className="w-4 h-4 text-yellow-500" />
                          <span>天赋点: {skill.talentPoints}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Talents Tab */}
        <TabsContent value="talents" className="space-y-4">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6" />
              <h3 className="text-xl font-semibold">天赋系统</h3>
            </div>
            <p className="text-muted-foreground">
              总天赋点: {totalTalentPoints}
            </p>
            
            {/* 天赋增强说明 */}
            <div className="bg-card border-border rounded-2xl p-6">
              <h4 className="font-medium text-center mb-6 text-xl text-foreground">天赋增强选项</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 经验加成 */}
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30 rounded-xl p-6 text-center">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      <Zap className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100">经验加成 (1点)</h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">下次任务经验+20%</p>
                    </div>
                  </div>
                </div>

                {/* 等级加速 */}
                <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/30 rounded-xl p-6 text-center">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                      <Target className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-purple-900 dark:text-purple-100">等级加速 (3点)</h3>
                      <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">技能直接获得100经验值</p>
                    </div>
                  </div>
                </div>

                {/* 声望提升 */}
                <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800/30 rounded-xl p-6 text-center">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                      <Crown className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-yellow-900 dark:text-yellow-100">声望提升 (5点)</h3>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">技能声望等级+1</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 可用天赋技能列表 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(skills as Skill[]).filter(skill => skill.talentPoints && skill.talentPoints > 0).map((skill: Skill) => (
                <Card key={skill.id} className="border-2" style={{ borderColor: skill.color }}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <i className={skill.icon} style={{ color: skill.color }}></i>
                      {skill.name}
                      <Badge variant="secondary">
                        {skill.talentPoints} 天赋点
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Button
                        onClick={() => useTalentPoint(skill.id, "experience")}
                        disabled={!skill.talentPoints || skill.talentPoints < 1}
                        className="w-full"
                        variant="outline"
                      >
                        经验加成 (1点)
                      </Button>
                      <Button
                        onClick={() => useTalentPoint(skill.id, "level")}
                        disabled={!skill.talentPoints || skill.talentPoints < 3}
                        className="w-full"
                        variant="outline"
                      >
                        等级加速 (3点)
                      </Button>
                      <Button
                        onClick={() => useTalentPoint(skill.id, "prestige")}
                        disabled={!skill.talentPoints || skill.talentPoints < 5}
                        className="w-full"
                        variant="outline"
                      >
                        声望提升 (5点)
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {(skills as Skill[]).filter(skill => skill.talentPoints && skill.talentPoints > 0).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                暂无可用天赋点的技能<br/>
                完成任务升级技能即可获得天赋点
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}