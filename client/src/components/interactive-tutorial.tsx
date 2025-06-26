import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, Circle, ArrowRight, Target, Plus, Users, X, ChevronLeft, ChevronRight } from "lucide-react";

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string;
  action: string;
  completed: boolean;
  position: "top" | "bottom" | "left" | "right";
}

interface InteractiveTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: "welcome",
    title: "欢迎来到LevelUp Solo",
    description: "我们将通过3个简单步骤帮你快速上手这个个人成长平台",
    targetSelector: "",
    action: "开始教程",
    completed: false,
    position: "top"
  },
  {
    id: "create-task",
    title: "创建你的第一个任务",
    description: "点击右下角的 + 按钮来快速添加任务。你可以使用自然语言输入，AI会帮你智能解析。点击按钮后可以关闭弹窗继续教程。",
    targetSelector: "[data-testid='quick-add-button']",
    action: "继续下一步",
    completed: false,
    position: "left"
  },
  {
    id: "check-skills", 
    title: "查看技能树",
    description: "完成任务会提升相关技能等级。点击导航中的'技能'查看你的六大核心能力发展",
    targetSelector: "[data-testid='nav-skills']",
    action: "继续下一步",
    completed: false,
    position: "bottom"
  },
  {
    id: "ai-assistant",
    title: "使用AI助手",
    description: "右上角的AI助手可以为你提供个性化建议、分析进度并回答问题",
    targetSelector: "[data-testid='ai-assistant-button']", 
    action: "完成教程",
    completed: false,
    position: "left"
  }
];

export default function InteractiveTutorial({ onComplete, onSkip }: InteractiveTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState(tutorialSteps);
  const [isVisible, setIsVisible] = useState(true);
  const [highlightElement, setHighlightElement] = useState<HTMLElement | null>(null);
  const [userInteracted, setUserInteracted] = useState(false);

  useEffect(() => {
    const currentStepData = steps[currentStep];
    if (currentStepData?.targetSelector) {
      const element = document.querySelector(currentStepData.targetSelector) as HTMLElement;
      setHighlightElement(element);
      
      if (element) {
        // Add highlight styling without blocking other elements
        element.style.position = "relative";
        element.style.zIndex = "1002";
        element.style.outline = "3px solid hsl(var(--primary))";
        element.style.outlineOffset = "4px";
        element.style.borderRadius = "8px";
        element.style.boxShadow = "0 0 20px rgba(59, 130, 246, 0.5)";
        // Ensure element stays interactive
        element.style.pointerEvents = "auto";
        
        // Add click listener for interactive steps
        const handleElementClick = () => {
          if (currentStep === 1) { // Create task step
            setUserInteracted(true);
          }
        };
        
        element.addEventListener('click', handleElementClick);
        
        // Scroll element into view
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        
        return () => {
          element.removeEventListener('click', handleElementClick);
        };
      }
    }

    return () => {
      if (highlightElement) {
        highlightElement.style.position = "";
        highlightElement.style.zIndex = "";
        highlightElement.style.outline = "";
        highlightElement.style.outlineOffset = "";
        highlightElement.style.borderRadius = "";
        highlightElement.style.boxShadow = "";
      }
    };
  }, [currentStep, highlightElement]);

  const handleNext = () => {
    const newSteps = [...steps];
    newSteps[currentStep].completed = true;
    setSteps(newSteps);

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleStepAction = () => {
    // For steps that require user interaction, don't auto-advance
    if (currentStep === 1) { // Create task step
      // Just show guidance, let user create task manually
      // Don't advance automatically
      return;
    }
    
    handleNext();
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    // Clean up any highlights
    if (highlightElement) {
      highlightElement.style.position = "";
      highlightElement.style.zIndex = "";
      highlightElement.style.outline = "";
      highlightElement.style.outlineOffset = "";
      highlightElement.style.borderRadius = "";
      highlightElement.style.boxShadow = "";
    }
    
    // Store completion in localStorage
    localStorage.setItem('tutorial-completed', 'true');
    setIsVisible(false);
    onComplete();
  };

  const handleSkip = () => {
    // Clean up any highlights
    if (highlightElement) {
      highlightElement.style.position = "";
      highlightElement.style.zIndex = "";
      highlightElement.style.outline = "";
      highlightElement.style.outlineOffset = "";
      highlightElement.style.borderRadius = "";
      highlightElement.style.boxShadow = "";
    }
    
    localStorage.setItem('tutorial-skipped', 'true');
    setIsVisible(false);
    onSkip();
  };

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  if (!isVisible) return null;

  return (
    <Dialog open={isVisible} onOpenChange={setIsVisible}>
      <DialogContent className="max-w-md" aria-describedby="tutorial-description">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              新手引导
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div id="tutorial-description" className="space-y-4">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">进度</span>
              <span className="font-medium">{currentStep + 1} / {steps.length}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Current Step */}
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                {currentStep === 0 ? (
                  <Users className="h-5 w-5 text-primary" />
                ) : currentStepData.completed ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
                {currentStepData.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-muted-foreground mb-4">
                {currentStepData.description}
              </p>
              
              {currentStep === 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-700 font-medium">
                    💡 提示：整个教程只需要1-2分钟，让你快速掌握核心功能
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              上一步
            </Button>

            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
                跳过教程
              </Button>
              
              <Button onClick={handleNext} className="flex items-center gap-2">
                {currentStep === 0 ? "开始教程" : 
                 currentStep === steps.length - 1 ? "完成教程" : 
                 "继续下一步"}
                {currentStep < steps.length - 1 && <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index <= currentStep 
                    ? "bg-primary" 
                    : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}