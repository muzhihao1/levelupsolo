import { Badge } from "@/components/ui/badge";
import { Bot, Sparkles, Brain, Lightbulb } from "lucide-react";

interface AIGeneratedLabelProps {
  type?: 'generated' | 'insight' | 'suggestion' | 'analysis';
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export default function AIGeneratedLabel({ 
  type = 'generated', 
  size = 'sm',
  showIcon = true 
}: AIGeneratedLabelProps) {
  const getConfig = () => {
    switch (type) {
      case 'insight':
        return {
          icon: Brain,
          text: 'AI洞察',
          className: 'bg-purple-100 text-purple-700 border-purple-200'
        };
      case 'suggestion':
        return {
          icon: Lightbulb,
          text: 'AI建议',
          className: 'bg-blue-100 text-blue-700 border-blue-200'
        };
      case 'analysis':
        return {
          icon: Sparkles,
          text: 'AI分析',
          className: 'bg-green-100 text-green-700 border-green-200'
        };
      default:
        return {
          icon: Bot,
          text: 'AI生成',
          className: 'bg-gray-100 text-gray-700 border-gray-200'
        };
    }
  };

  const config = getConfig();
  const IconComponent = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={`${config.className} ${size === 'sm' ? 'text-xs' : 'text-sm'} font-medium`}
    >
      {showIcon && <IconComponent className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />}
      {config.text}
    </Badge>
  );
}