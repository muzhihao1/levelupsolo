import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Briefcase, 
  Gamepad2, 
  Settings,
  Eye,
  EyeOff
} from "lucide-react";

interface ModeToggleProps {
  onModeChange?: (mode: 'professional' | 'game') => void;
}

export default function ModeToggle({ onModeChange }: ModeToggleProps) {
  const [currentMode, setCurrentMode] = useState<'professional' | 'game'>('game');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const savedMode = localStorage.getItem('display_mode') as 'professional' | 'game';
    if (savedMode) {
      setCurrentMode(savedMode);
      onModeChange?.(savedMode);
    }
  }, [onModeChange]);

  const handleModeChange = (isGameMode: boolean) => {
    const newMode = isGameMode ? 'game' : 'professional';
    setCurrentMode(newMode);
    localStorage.setItem('display_mode', newMode);
    onModeChange?.(newMode);
    
    // Apply mode changes to body class for global styling
    document.body.classList.toggle('professional-mode', newMode === 'professional');
    document.body.classList.toggle('game-mode', newMode === 'game');
  };

  const getModeDescription = (mode: 'professional' | 'game') => {
    return mode === 'professional' 
      ? '专注于核心功能，隐藏游戏化元素，适合工作环境'
      : '完整RPG体验，包含等级、技能树、经验值等游戏化元素';
  };

  const getModeFeatures = (mode: 'professional' | 'game') => {
    if (mode === 'professional') {
      return [
        '简洁界面设计',
        '隐藏等级和经验值',
        '专业术语替换',
        '减少动画效果',
        '数据导向显示'
      ];
    }
    return [
      'RPG风格界面',
      '等级和经验系统',
      '技能树可视化',
      '成就和徽章',
      '游戏化激励'
    ];
  };

  if (!isVisible) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed top-20 right-6 z-40 bg-background/80 backdrop-blur-sm border"
        title="显示模式切换"
      >
        <Settings className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className="fixed top-20 right-6 z-40 w-80">
      <Card className="shadow-lg border-primary/20 bg-background/95 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              <span className="font-medium">显示模式</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className="h-8 w-8 p-0"
            >
              <EyeOff className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            {/* Mode Toggle */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Briefcase className={`h-5 w-5 ${currentMode === 'professional' ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="text-sm font-medium">专业模式</span>
              </div>
              <Switch
                checked={currentMode === 'game'}
                onCheckedChange={handleModeChange}
                className="data-[state=checked]:bg-primary"
              />
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">游戏模式</span>
                <Gamepad2 className={`h-5 w-5 ${currentMode === 'game' ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
            </div>

            {/* Current Mode Info */}
            <div className="p-3 border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={currentMode === 'professional' ? 'secondary' : 'default'}>
                  {currentMode === 'professional' ? '专业模式' : '游戏模式'}
                </Badge>
                {currentMode === 'professional' && (
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                )}
                {currentMode === 'game' && (
                  <Gamepad2 className="h-4 w-4 text-primary" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                {getModeDescription(currentMode)}
              </p>
              
              <div className="space-y-1">
                <span className="text-xs font-medium text-foreground">功能特点：</span>
                {getModeFeatures(currentMode).map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-1 h-1 bg-primary rounded-full" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>

            {/* Preview Options */}
            <div className="flex gap-2">
              <Button
                variant={currentMode === 'professional' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleModeChange(false)}
                className="flex-1 text-xs"
              >
                <Briefcase className="h-3 w-3 mr-1" />
                专业
              </Button>
              <Button
                variant={currentMode === 'game' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleModeChange(true)}
                className="flex-1 text-xs"
              >
                <Gamepad2 className="h-3 w-3 mr-1" />
                游戏
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}