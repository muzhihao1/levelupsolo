import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, CheckCircle, Bot, Brain, Target, Zap, Calendar, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { InsertTask, InsertGoal } from "../../../shared/schema";

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

  const parseInputMutation = useMutation({
    mutationFn: async (text: string) => {
      try {
        const response = await apiRequest('POST', '/api/ai/parse-input', {
          input: text
        });
        const data = await response.json();
        return data;
      } catch (error) {
        // Return intelligent fallback structure when API fails
        const cleanText = text.replace(/\b(pao bu|yun dong|jian shen|duan lian|xue xi|mei tian|jian chi)\b/gi, (match) => {
          const pinyinMap: Record<string, string> = {
            'pao bu': '跑步',
            'yun dong': '运动', 
            'jian shen': '健身',
            'duan lian': '锻炼',
            'xue xi': '学习',
            'mei tian': '每天',
            'jian chi': '坚持'
          };
          return pinyinMap[match.toLowerCase()] || match;
        });
        
        const title = cleanText.length > 50 ? cleanText.slice(0, 47) + '...' : cleanText;
        let description = cleanText;
        let category: 'main_quest' | 'side_quest' | 'habit' = 'side_quest';
        let priority: 'high' | 'medium' | 'low' = 'medium';
        
        const textLower = cleanText.toLowerCase();
        
        if (textLower.includes('学习') || textLower.includes('xue xi')) {
          description = `掌握${cleanText.replace(/学习|xue xi/g, '')}的核心知识和技能`;
          category = 'main_quest';
          priority = 'high';
        } 
        else if (textLower.includes('跑步') || textLower.includes('pao bu') || 
                 textLower.includes('运动') || textLower.includes('yun dong') ||
                 textLower.includes('健身') || textLower.includes('jian shen') ||
                 textLower.includes('锻炼') || textLower.includes('duan lian')) {
          description = `建立${cleanText}的运动习惯，提升身体健康水平`;
          category = 'habit';
          priority = 'medium';
        }
        else if (textLower.includes('每天') || textLower.includes('mei tian') ||
                 textLower.includes('坚持') || textLower.includes('jian chi') ||
                 textLower.includes('习惯') || textLower.includes('xi guan')) {
          description = `建立${cleanText}的良好习惯，持续改善生活质量`;
          category = 'habit';
        } 
        else if (textLower.includes('提升') || textLower.includes('ti sheng') ||
                 textLower.includes('技能') || textLower.includes('ji neng') ||
                 textLower.includes('能力') || textLower.includes('neng li')) {
          description = `提升${cleanText}相关的专业能力`;
          category = 'main_quest';
          priority = 'high';
        } 
        else if (textLower.includes('紧急') || textLower.includes('jin ji') ||
                 textLower.includes('重要') || textLower.includes('zhong yao') ||
                 textLower.includes('urgent') || textLower.includes('important')) {
          priority = 'high';
        } 
        else {
          if (textLower.includes('设计') || textLower.includes('方案') || textLower.includes('计划')) {
            description = `制定并完善${cleanText}的详细方案`;
            category = 'main_quest';
          } else if (textLower.includes('会议') || textLower.includes('讨论') || textLower.includes('沟通')) {
            description = `参与${cleanText}，确保有效沟通`;
          } else if (textLower.includes('报告') || textLower.includes('总结') || textLower.includes('文档')) {
            description = `编写和完善${cleanText}相关文档`;
          } else if (cleanText.length > 15) {
            description = `完成任务：${cleanText}`;
          } else {
            description = `处理${cleanText}相关事务`;
          }
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
      if (input.trim().length > 5) {
        const cleanInput = input.replace(/\b(pao bu|yun dong|jian shen|duan lian|xue xi|mei tian|jian chi)\b/gi, (match) => {
          const pinyinMap: Record<string, string> = {
            'pao bu': '跑步',
            'yun dong': '运动', 
            'jian shen': '健身',
            'duan lian': '锻炼',
            'xue xi': '学习',
            'mei tian': '每天',
            'jian chi': '坚持'
          };
          return pinyinMap[match.toLowerCase()] || match;
        });
        
        setInput(cleanInput);
        setCustomTitle(cleanInput);
        
        const title = cleanInput.length > 50 ? cleanInput.slice(0, 47) + '...' : cleanInput;
        let description = cleanInput;
        let category = 'side_quest';
        let priority = 'medium';
        
        const inputLower = cleanInput.toLowerCase();
        
        if (inputLower.includes('学习') || inputLower.includes('xue xi')) {
          description = `掌握${cleanInput.replace(/学习|xue xi/g, '')}的核心知识和技能`;
          category = 'main_quest';
          priority = 'high';
        } 
        else if (inputLower.includes('跑步') || inputLower.includes('pao bu') || 
                 inputLower.includes('运动') || inputLower.includes('yun dong') ||
                 inputLower.includes('健身') || inputLower.includes('jian shen') ||
                 inputLower.includes('锻炼') || inputLower.includes('duan lian')) {
          description = `建立${cleanInput}的运动习惯，提升身体健康水平`;
          category = 'habit';
          priority = 'medium';
        }
        else if (inputLower.includes('每天') || inputLower.includes('mei tian') ||
                 inputLower.includes('坚持') || inputLower.includes('jian chi') ||
                 inputLower.includes('习惯') || inputLower.includes('xi guan')) {
          description = `建立${cleanInput}的良好习惯，持续改善生活质量`;
          category = 'habit';
        } 
        else if (inputLower.includes('提升') || inputLower.includes('ti sheng') ||
                 inputLower.includes('技能') || inputLower.includes('ji neng') ||
                 inputLower.includes('能力') || inputLower.includes('neng li')) {
          description = `提升${cleanInput}相关的专业能力`;
          category = 'main_quest';
          priority = 'high';
        } 
        else if (inputLower.includes('紧急') || inputLower.includes('jin ji') ||
                 inputLower.includes('重要') || inputLower.includes('zhong yao') ||
                 inputLower.includes('urgent') || inputLower.includes('important')) {
          priority = 'high';
        } 
        else {
          if (inputLower.includes('设计') || inputLower.includes('方案') || inputLower.includes('计划')) {
            description = `制定并完善${cleanInput}的详细方案`;
            category = 'main_quest';
          } else if (inputLower.includes('会议') || inputLower.includes('讨论') || inputLower.includes('沟通')) {
            description = `参与${cleanInput}，确保有效沟通`;
          } else if (inputLower.includes('报告') || inputLower.includes('总结') || inputLower.includes('文档')) {
            description = `编写和完善${cleanInput}相关文档`;
          } else if (cleanInput.length > 15) {
            description = `完成任务：${cleanInput}`;
          } else {
            description = `处理${cleanInput}相关事务`;
          }
        }
        
        const basicParsed = {
          type: 'task' as const,
          category: category as any,
          title: title,
          description: description,
          priority: priority as any,
          estimatedDuration: 30,
          confidence: 0.8
        };
        setParsedSuggestion(basicParsed);
        setSelectedCategory(category);
        setCustomTitle(title);
        setCustomDescription(description);
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
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };
      createGoalMutation.mutate(goalData);
    } else {
      const taskData: InsertTask = {
        title: customTitle,
        description: customDescription || "",
        estimatedDuration: parsedSuggestion?.estimatedDuration || 30
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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'main_quest': return 'bg-red-100 text-red-700 border-red-200';
      case 'side_quest': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'habit': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
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
      <div className="fixed bottom-6 left-6 z-[60]">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              size="lg"
              className="h-16 w-16 rounded-full shadow-xl bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 transition-all duration-300 hover:scale-110 cursor-pointer border-2 border-white"
              title="快速添加任务或目标"
            >
              <Plus className="h-7 w-7 text-white" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <div id="quick-add-description" className="sr-only">
              快速添加任务或目标的智能表单
            </div>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                快速添加
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                输入任务或目标描述，AI会智能解析并提供分类建议
              </p>
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
                      className={`flex items-center gap-2 text-xs ${
                        selectedCategory === category ? getCategoryColor(category) : ''
                      }`}
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