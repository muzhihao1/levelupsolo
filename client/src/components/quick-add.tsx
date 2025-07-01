import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Plus, CheckCircle, Bot, Brain, Target, Zap, Calendar, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { InsertTask, InsertGoal } from "@shared/schema";

interface ParsedInput {
  type: 'task' | 'goal' | 'habit';
  category: 'main_quest' | 'side_quest' | 'habit';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedDuration?: number;
  confidence: number;
}

interface QuickAddProps {
  className?: string;
  variant?: 'floating' | 'inline';
}

export default function QuickAdd({ className = "", variant = "floating" }: QuickAddProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [parsedSuggestion, setParsedSuggestion] = useState<ParsedInput | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [isParsingAI, setIsParsingAI] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Local fallback parsing function
  const generateFallbackParsing = (text: string) => {
    const cleanText = text.replace(/\b(pao bu|yun dong|jian shen|duan lian|xue xi|mei tian|jian chi)\b/gi, (match) => {
      const pinyinMap: Record<string, string> = {
        'pao bu': '跑步', 'yun dong': '运动', 'jian shen': '健身',
        'duan lian': '锻炼', 'xue xi': '学习', 'mei tian': '每天', 'jian chi': '坚持'
      };
      return pinyinMap[match.toLowerCase()] || match;
    });
    
    const title = cleanText.length > 50 ? cleanText.slice(0, 47) + '...' : cleanText;
    let description = cleanText;
    let category: 'main_quest' | 'side_quest' | 'habit' = 'side_quest';
    let priority: 'high' | 'medium' | 'low' = 'medium';
    
    const textLower = cleanText.toLowerCase();
    
    // 检查是否是读书任务
    if (textLower.includes('读完') || textLower.includes('看完') || textLower.includes('阅读') || 
        textLower.includes('du wan') || textLower.includes('kan wan') || textLower.includes('yue du') ||
        (textLower.includes('读') && textLower.includes('书')) || 
        (textLower.includes('看') && textLower.includes('书'))) {
      description = `完成${cleanText}，获取知识和见解`;
      category = 'side_quest'; // 读完一本书是一次性任务
      priority = 'medium';
    } else if (textLower.includes('学习') || textLower.includes('xue xi')) {
      description = `掌握${cleanText.replace(/学习|xue xi/g, '')}的核心知识和技能`;
      category = 'main_quest';
      priority = 'high';
    } else if ((textLower.includes('每天') || textLower.includes('每日') || textLower.includes('坚持')) &&
               (textLower.includes('跑步') || textLower.includes('pao bu') || 
                textLower.includes('运动') || textLower.includes('yun dong') ||
                textLower.includes('健身') || textLower.includes('jian shen') ||
                textLower.includes('锻炼') || textLower.includes('duan lian'))) {
      description = `建立${cleanText}的运动习惯，提升身体健康水平`;
      category = 'habit';
      priority = 'medium';
    } else if (textLower.includes('设计') || textLower.includes('方案') || textLower.includes('计划')) {
      description = `制定并完善${cleanText}的详细方案`;
      category = 'main_quest';
    } else if (cleanText.length > 15) {
      description = `完成任务：${cleanText}`;
    } else {
      description = `处理${cleanText}相关事务`;
    }
    
    return {
      parsed: {
        type: 'task' as const,
        category: category,
        title: title,
        description: description,
        priority: priority,
        estimatedDuration: 30,
        confidence: 0.8
      },
      aiGenerated: false,
      fallback: true
    };
  };

  const parseInputMutation = useMutation({
    mutationFn: async (text: string) => {
      try {
        const response = await apiRequest('POST', '/api/ai/parse-input', {
          input: text
        });
        const data = await response.json();
        return data;
      } catch (error) {
        // Return fallback parsing for any errors
        return generateFallbackParsing(text);
      }
    },
    onSuccess: (data) => {
      console.log('AI parsing response:', data);
      setIsParsingAI(false);
      if (data?.parsed) {
        setParsedSuggestion(data.parsed);
        setSelectedCategory(data.parsed.category);
        setCustomTitle(data.parsed.title);
        setCustomDescription(data.parsed.description);
      }
    },
    onError: (error) => {
      console.error('AI parsing failed:', error);
      setIsParsingAI(false);
      
      // Use local fallback when AI fails
      if (input.trim()) {
        const fallbackResult = generateFallbackParsing(input.trim());
        setParsedSuggestion(fallbackResult.parsed);
        setSelectedCategory(fallbackResult.parsed.category);
        setCustomTitle(fallbackResult.parsed.title);
        setCustomDescription(fallbackResult.parsed.description);
      }
      
      // Provide local fallback when AI fails
      if (parseInputMutation.variables) {
        const fallbackResult = generateFallbackParsing(parseInputMutation.variables);
        setParsedSuggestion(fallbackResult.parsed);
        setSelectedCategory(fallbackResult.parsed.category);
        setCustomTitle(fallbackResult.parsed.title);
        setCustomDescription(fallbackResult.parsed.description);
      }
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: InsertTask) => {
      return await apiRequest('POST', '/api/crud?resource=tasks', taskData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=stats'] });
      toast({ title: "任务创建成功!", description: "新任务已添加到你的任务列表" });
      resetForm();
    },
    onError: (error) => {
      toast({ title: "创建失败", description: "请稍后重试", variant: "destructive" });
    }
  });

  const createGoalMutation = useMutation({
    mutationFn: async (goalData: InsertGoal) => {
      return await apiRequest('POST', '/api/crud?resource=goals', goalData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=goals'] });
      toast({ title: "目标创建成功!", description: "新目标已添加到你的目标列表" });
      resetForm();
    },
    onError: (error) => {
      toast({ title: "创建失败", description: "请稍后重试", variant: "destructive" });
    }
  });

  const resetForm = () => {
    setInput("");
    setParsedSuggestion(null);
    setSelectedCategory("");
    setCustomTitle("");
    setCustomDescription("");
    setIsOpen(false);
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    
    if (value.trim().length > 5) {
      setIsParsingAI(true);
      setTimeout(() => {
        parseInputMutation.mutate(value);
      }, 1500);
    } else {
      setParsedSuggestion(null);
      setSelectedCategory('');
      setCustomTitle('');
      setCustomDescription('');
    }
  };

  const handleCreate = () => {
    if (!customTitle.trim()) {
      toast({
        title: "请输入标题",
        description: "任务或目标需要一个标题",
        variant: "destructive",
      });
      return;
    }

    const isGoal = selectedCategory === 'main_quest' || parsedSuggestion?.type === 'goal';
    
    if (isGoal) {
      const goalData: InsertGoal = {
        title: customTitle,
        description: customDescription || "",
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        userId: ""
      };
      createGoalMutation.mutate(goalData);
    } else {
      const taskData: InsertTask = {
        title: customTitle,
        description: customDescription || "",
        estimatedDuration: parsedSuggestion?.estimatedDuration || 30,
        userId: ""
      };
      createTaskMutation.mutate(taskData);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'main_quest': return <Target className="h-4 w-4" />;
      case 'side_quest': return <Zap className="h-4 w-4" />;
      case 'habit': return <Calendar className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'main_quest': return '主线任务';
      case 'side_quest': return '支线任务';
      case 'habit': return '习惯养成';
      default: return '其他';
    }
  };

  if (variant === "floating") {
    return (
      <div className="fixed bottom-6 right-6 z-[60]">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              data-testid="quick-add-button"
              size="lg"
              className="h-16 w-16 rounded-full shadow-xl bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 transition-all duration-300 hover:scale-110 cursor-pointer border-2 border-white"
              title="快速添加任务或目标"
            >
              <Plus className="h-7 w-7 text-white" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                快速添加
              </DialogTitle>
              <DialogDescription>
                输入任务或目标描述，AI会智能解析并提供分类建议
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Input
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="例如：每天跑步30分钟、学习React开发..."
                  className="w-full"
                />
              </div>

              {isParsingAI && (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Bot className="h-4 w-4" />
                    <span className="text-sm font-medium">AI解析结果</span>
                    <div className="flex space-x-1">
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}

              {parsedSuggestion && !isParsingAI && (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">AI解析结果</span>
                    <span className="text-xs text-blue-600">
                      {getCategoryLabel(parsedSuggestion.category)}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">建议标题:</span>
                      <p className="text-gray-600 mt-1">{parsedSuggestion.title}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">建议描述:</span>
                      <p className="text-gray-600 mt-1">{parsedSuggestion.description}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>置信度: {Math.round(parsedSuggestion.confidence * 100)}%</span>
                      <span>预计时长: {parsedSuggestion.estimatedDuration}分钟</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">类别</label>
                <div className="grid grid-cols-3 gap-2">
                  {['main_quest', 'side_quest', 'habit'].map((category) => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className="flex items-center gap-2 text-xs"
                    >
                      {getCategoryIcon(category)}
                      {getCategoryLabel(category)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">标题</label>
                  <Input
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="任务或目标标题"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">描述 (可选)</label>
                  <Textarea
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    placeholder="详细描述..."
                    className="mt-1 h-20 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleCreate}
                  disabled={!customTitle.trim() || createTaskMutation.isPending || createGoalMutation.isPending}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  创建
                </Button>
                <Button
                  variant="outline"
                  onClick={resetForm}
                  className="px-6"
                >
                  取消
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return null;
}