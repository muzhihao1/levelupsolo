import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AIGeneratedLabel from "@/components/ai-generated-label";
import { Lightbulb, X, RefreshCw, CheckCircle } from "lucide-react";

interface ProactiveSuggestion {
  id: string;
  type: 'task' | 'skill' | 'goal' | 'optimization';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
}

interface AIProactiveSuggestionsProps {
  context?: {
    goals?: any[];
    skills?: any[];
    tasks?: any[];
    profile?: any;
  };
}

export default function AIProactiveSuggestions({ context }: AIProactiveSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<ProactiveSuggestion[]>([]);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const [isVisible, setIsVisible] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user data for context if not provided
  const { data: goals } = useQuery({ 
    queryKey: ['/api/goals'],
    enabled: !context?.goals 
  });
  const { data: skills } = useQuery({ 
    queryKey: ['/api/skills'],
    enabled: !context?.skills 
  });
  const { data: tasks } = useQuery({ 
    queryKey: ['/api/tasks'],
    enabled: !context?.tasks 
  });
  const { data: profile } = useQuery({ 
    queryKey: ['/api/profile'],
    enabled: !context?.profile 
  });

  const aiSuggestionsMutation = useMutation({
    mutationFn: async () => {
      const contextData = {
        goals: context?.goals || goals || [],
        skills: context?.skills || skills || [],
        tasks: context?.tasks || tasks || [],
        profile: context?.profile || profile || null
      };

      const response = await apiRequest('POST', '/api/ai/suggestions', {
        context: contextData
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.suggestions && data.suggestions.length > 0) {
        const newSuggestions: ProactiveSuggestion[] = data.suggestions.map((suggestion: string, index: number) => ({
          id: `suggestion-${Date.now()}-${index}`,
          type: determineSuggestionType(suggestion),
          title: extractSuggestionTitle(suggestion),
          description: suggestion,
          priority: determinePriority(suggestion),
          actionable: true
        }));
        setSuggestions(newSuggestions);
        setIsVisible(true);
      }
    },
    onError: (error) => {
      console.error('Failed to fetch AI suggestions:', error);
    }
  });

  // Automatically fetch suggestions when component mounts or context changes
  useEffect(() => {
    const shouldFetchSuggestions = () => {
      const contextData = context || { goals, skills, tasks, profile };
      return contextData.goals && contextData.skills && contextData.tasks;
    };

    if (shouldFetchSuggestions() && suggestions.length === 0) {
      // Delay to avoid immediate API calls on page load
      const timer = setTimeout(() => {
        aiSuggestionsMutation.mutate();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [context, goals, skills, tasks, profile]);

  const determineSuggestionType = (suggestion: string): ProactiveSuggestion['type'] => {
    const lower = suggestion.toLowerCase();
    if (lower.includes('任务') || lower.includes('完成')) return 'task';
    if (lower.includes('技能') || lower.includes('学习')) return 'skill';
    if (lower.includes('目标') || lower.includes('计划')) return 'goal';
    return 'optimization';
  };

  const extractSuggestionTitle = (suggestion: string): string => {
    // Extract the first part of the suggestion as title
    const match = suggestion.match(/^[•\-*]?\s*([^，。！？\n]+)/);
    return match ? match[1].trim() : suggestion.slice(0, 30) + '...';
  };

  const determinePriority = (suggestion: string): ProactiveSuggestion['priority'] => {
    const lower = suggestion.toLowerCase();
    if (lower.includes('重要') || lower.includes('优先') || lower.includes('紧急')) return 'high';
    if (lower.includes('建议') || lower.includes('可以')) return 'medium';
    return 'low';
  };

  const dismissSuggestion = (suggestionId: string) => {
    setDismissedSuggestions(prev => new Set(Array.from(prev).concat([suggestionId])));
  };

  const refreshSuggestions = () => {
    setSuggestions([]);
    setDismissedSuggestions(new Set());
    aiSuggestionsMutation.mutate();
  };

  const getPriorityColor = (priority: ProactiveSuggestion['priority']) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  const visibleSuggestions = suggestions.filter(s => !dismissedSuggestions.has(s.id));

  if (!isVisible || visibleSuggestions.length === 0) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <Lightbulb className="h-5 w-5" />
            AI智能建议
            <AIGeneratedLabel type="suggestion" size="sm" />
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshSuggestions}
              disabled={aiSuggestionsMutation.isPending}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${aiSuggestionsMutation.isPending ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {visibleSuggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className="flex items-start justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
          >
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-gray-900">{suggestion.title}</h4>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getPriorityColor(suggestion.priority)}`}
                >
                  {suggestion.priority === 'high' ? '高优先级' : 
                   suggestion.priority === 'medium' ? '中优先级' : '低优先级'}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {suggestion.description}
              </p>
            </div>
            <div className="flex items-center gap-1 ml-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dismissSuggestion(suggestion.id)}
                className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dismissSuggestion(suggestion.id)}
                className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        
        {aiSuggestionsMutation.isPending && (
          <div className="flex items-center justify-center py-6">
            <div className="flex items-center gap-2 text-blue-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-sm">AI正在分析您的进度...</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}