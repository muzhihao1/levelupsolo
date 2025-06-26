import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bot, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AIFloatingButtonProps {
  onClick: () => void;
  hasNotifications?: boolean;
}

export default function AIFloatingButton({ onClick, hasNotifications = false }: AIFloatingButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="relative">
      <Button
        data-testid="ai-assistant-button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('AI Assistant button clicked!', { 
            timestamp: Date.now(),
            target: e.target,
            currentTarget: e.currentTarget 
          });
          onClick();
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 relative group cursor-pointer"
        size="lg"
      >
        <div className="relative">
          <Bot className="w-6 h-6 text-primary-foreground" />
          {hasNotifications && (
            <div className="absolute -top-2 -right-2 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          )}
        </div>
        
        {/* Tooltip */}
        {isHovered && (
          <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-popover text-popover-foreground text-sm rounded-lg shadow-lg border whitespace-nowrap">
            AI成长助手
            <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-popover" />
          </div>
        )}
      </Button>

      {/* Pulsing ring animation */}
      <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: '3s' }} />
    </div>
  );
}