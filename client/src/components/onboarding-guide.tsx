import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Target, PlayCircle, Trophy, ArrowRight, X, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface OnboardingGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function OnboardingGuide({ isOpen, onClose, onComplete }: OnboardingGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const queryClient = useQueryClient();

  // Mutation to mark onboarding as completed
  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('PATCH', '/api/crud?resource=users', { hasCompletedOnboarding: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=profile'] });
      onComplete();
    },
    onError: (error) => {
      console.error('Failed to update onboarding status:', error);
      onComplete(); // Still complete locally even if API fails
    }
  });

  const steps = [
    {
      title: "欢迎来到 LevelUp Solo",
      icon: Trophy,
      description: "开启你的个人成长RPG之旅",
      content: (
        <div className="text-center space-y-4">
          <div className="w-24 h-24 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Trophy className="h-12 w-12 text-white" />
          </div>
          <h3 className="text-3xl font-bold text-foreground">欢迎成为冒险者！</h3>
          <p className="text-muted-foreground leading-relaxed text-lg">
            LevelUp Solo 将帮助你把个人成长变成一场激动人心的RPG冒险。
            通过完成任务、升级技能、解锁成就来实现你的目标。
          </p>
          <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
            <p className="text-primary text-sm font-medium">
              💡 提示：就像游戏中的角色一样，你将通过完成日常任务来获得经验值和升级！
            </p>
          </div>
        </div>
      )
    },
    {
      title: "设定你的目标",
      icon: Target,
      description: "创建主线任务",
      content: (
        <div className="space-y-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500/30 to-blue-600/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Target className="h-8 w-8 text-blue-400" />
          </div>
          <h3 className="text-xl font-bold text-foreground text-center">第一步：设定目标</h3>
          <div className="space-y-3">
            <div className="bg-card rounded-lg p-4 border border-border">
              <h4 className="font-semibold text-foreground mb-2">🎯 什么是主线任务？</h4>
              <p className="text-muted-foreground text-sm">
                主线任务是你的长期目标，比如"学习新技能"、"提升健康"或"完成项目"。
                系统会帮你把大目标分解成可执行的小任务。
              </p>
            </div>
            <div className="bg-card rounded-lg p-4 border border-border">
              <h4 className="font-semibold text-foreground mb-2">🤖 AI智能建议</h4>
              <p className="text-muted-foreground text-sm">
                使用AI助手来创建目标，它会自动为你生成里程碑和建议任务。
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "完成日常任务",
      icon: PlayCircle,
      description: "开始你的冒险",
      content: (
        <div className="space-y-4">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500/30 to-green-600/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <PlayCircle className="h-8 w-8 text-green-400" />
          </div>
          <h3 className="text-xl font-bold text-foreground text-center">第二步：完成任务</h3>
          <div className="space-y-3">
            <div className="bg-card rounded-lg p-4 border border-border">
              <h4 className="font-semibold text-foreground mb-2">⚔️ 番茄钟战斗系统</h4>
              <p className="text-muted-foreground text-sm">
                使用番茄钟专注法来完成任务，每次专注就像在打Boss战！
                完成后获得经验值和金币奖励。
              </p>
            </div>
            <div className="bg-card rounded-lg p-4 border border-border">
              <h4 className="font-semibold text-foreground mb-2">🎮 三种任务类型</h4>
              <ul className="text-muted-foreground text-sm space-y-1">
                <li>• <span className="text-accent">主线任务</span>：长期目标相关</li>
                <li>• <span className="text-primary">支线任务</span>：日常待办事项</li>
                <li>• <span className="text-green-600">习惯任务</span>：每日重复习惯</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "升级和成长",
      icon: Trophy,
      description: "追踪你的进步",
      content: (
        <div className="space-y-4">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500/30 to-purple-600/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Trophy className="h-8 w-8 text-purple-400" />
          </div>
          <h3 className="text-xl font-bold text-foreground text-center">第三步：升级成长</h3>
          <div className="space-y-3">
            <div className="bg-card rounded-lg p-4 border border-border">
              <h4 className="font-semibold text-foreground mb-2">📊 六大核心技能</h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>• 情绪稳定力</div>
                <div>• 学习能力</div>
                <div>• 沟通表达</div>
                <div>• 身体健康</div>
                <div>• 专业技能</div>
                <div>• 时间管理</div>
              </div>
            </div>
            <div className="bg-card rounded-lg p-4 border border-border">
              <h4 className="font-semibold text-foreground mb-2">🏆 成就系统</h4>
              <p className="text-muted-foreground text-sm">
                解锁各种成就徽章，追踪连击天数，查看详细的成长数据分析。
              </p>
            </div>
          </div>
        </div>
      )
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = steps[currentStep];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] bg-card border-border overflow-y-auto" aria-describedby="onboarding-description">
        <DialogHeader>
          <DialogTitle className="text-foreground text-center">
            新手引导 ({currentStep + 1}/{steps.length})
          </DialogTitle>
          <DialogDescription>
            {steps[currentStep].description}
          </DialogDescription>
        </DialogHeader>

        <div id="onboarding-description" className="py-6">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    index <= currentStep
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {index < currentStep ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
              ))}
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Step Content */}
          <div className="px-4">
            {currentStepData.content}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-700">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="text-slate-300 border-slate-600 hover:bg-slate-700"
          >
            上一步
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                completeOnboardingMutation.mutate();
              }}
              className="text-slate-400 hover:text-slate-300"
            >
              跳过教程
            </Button>
            <div className="text-sm text-slate-400">
              {currentStep + 1} / {steps.length}
            </div>
          </div>

          <Button
            onClick={nextStep}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {currentStep === steps.length - 1 ? '开始冒险' : '下一步'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}