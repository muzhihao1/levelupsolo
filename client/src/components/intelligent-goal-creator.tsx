import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Target, Trophy, Coins } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AIGeneratedLabel from "@/components/ai-generated-label";

interface IntelligentGoalCreatorProps {
  onGoalCreated?: () => void;
}

export default function IntelligentGoalCreator({ onGoalCreated }: IntelligentGoalCreatorProps) {
  const [description, setDescription] = useState("");
  const [createdGoal, setCreatedGoal] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createGoalMutation = useMutation({
    mutationFn: async (goalDescription: string) => {
      return await apiRequest("POST", "/api/crud?resource=goals", {
        title: goalDescription,
        description: goalDescription,
        expReward: 500
      });
    },
    onSuccess: (goal) => {
      setCreatedGoal(goal);
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["/api/data?type=goals"] });
      toast({
        title: "目标创建成功",
        description: "AI已为您智能分析并创建了结构化目标",
      });
      onGoalCreated?.();
    },
    onError: (error) => {
      console.error("创建目标失败:", error);
      toast({
        title: "创建失败",
        description: "智能目标创建失败，请重试",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!description.trim()) {
      toast({
        title: "请输入目标描述",
        description: "请详细描述您想要实现的目标",
        variant: "destructive",
      });
      return;
    }

    createGoalMutation.mutate(description);
  };

  return (
    <div className="space-y-4">
      <Card className="border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI智能目标创建
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            描述您的目标，AI将自动分析并创建结构化的主线任务，包含经验奖励、金币奖励和里程碑
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="例如：我想学习Python编程，从基础语法开始到能够开发简单的Web应用..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="resize-none bg-background border-border text-foreground placeholder:text-muted-foreground"
          />
          
          <Button 
            onClick={handleSubmit}
            disabled={createGoalMutation.isPending || !description.trim()}
            className="w-full bg-purple-700 hover:bg-purple-800 font-medium text-white border-0"
            style={{ backgroundColor: '#7c3aed', color: '#ffffff', fontWeight: '600', border: 'none' }}
          >
            {createGoalMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                AI正在分析中...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                创建智能目标
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {createdGoal && (
        <Card className="border-green-200 dark:border-green-800 bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <Target className="h-5 w-5" />
              创建成功: {createdGoal.title}
              <AIGeneratedLabel type="generated" />
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {createdGoal.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="flex items-center gap-1 bg-purple-100 text-purple-700">
                <Trophy className="h-3 w-3" />
                完成奖励: {createdGoal.expReward} EXP
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1 bg-yellow-100 text-yellow-700">
                <Coins className="h-3 w-3" />
                {createdGoal.goldReward} 金币
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1 border-blue-500 text-blue-400">
                <Target className="h-3 w-3" />
                番茄钟: {createdGoal.pomodoroExpReward} EXP + {createdGoal.pomodoroGoldReward} 金币
              </Badge>
            </div>

            {createdGoal.skillTags && createdGoal.skillTags.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-white">关联技能:</p>
                <div className="flex flex-wrap gap-1">
                  {createdGoal.skillTags.map((tag: string, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs border-slate-500 text-slate-300">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {createdGoal.milestones && createdGoal.milestones.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-white">自动生成的里程碑:</p>
                <div className="space-y-2">
                  {createdGoal.milestones.map((milestone: any, index: number) => (
                    <div key={index} className="flex items-start gap-3 p-2 bg-slate-700 rounded">
                      <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-1"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{milestone.title}</p>
                        {milestone.description && (
                          <p className="text-xs text-slate-400 mt-1">{milestone.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="pt-2 border-t border-slate-600">
              <p className="text-xs text-slate-400">
                目标已成功创建并添加到主线任务列表中，现在可以开始挑战Boss！
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}