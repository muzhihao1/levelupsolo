import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Bot, Send, X, Minimize2, Maximize2, Sparkles, Brain, Target, Calendar, Lightbulb } from "lucide-react";

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  category?: 'suggestion' | 'insight' | 'advice' | 'general';
}

interface AIAssistantProps {
  isVisible: boolean;
  onToggle: () => void;
  onPageChange?: (page: string) => void;
}

export default function AIAssistant({ isVisible, onToggle, onPageChange }: AIAssistantProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: '你好！我是你的个人成长AI助手。我可以帮你分析目标进度、推荐任务、提供技能发展建议。',
      timestamp: new Date(),
      category: 'general'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user data for context
  const { data: goals } = useQuery({ queryKey: ['/api/goals'] });
  const { data: skills } = useQuery({ queryKey: ['/api/skills'] });
  const { data: tasks } = useQuery({ queryKey: ['/api/tasks'] });
  const { data: profile } = useQuery({ queryKey: ['/api/profile'] });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // AI Chat Mutation
  const aiChatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest('POST', '/api/ai/chat', {
        message,
        context: {
          goals: goals || [],
          skills: skills || [],
          tasks: tasks || [],
          profile: profile || null
        }
      });
      return response.json();
    },
    onSuccess: (data) => {
      const aiMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'ai',
        content: data.response,
        timestamp: new Date(),
        category: data.category || 'general'
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    },
    onError: (error) => {
      setIsTyping(false);
      toast({
        title: "AI助手暂时不可用",
        description: "请稍后再试",
        variant: "destructive"
      });
    }
  });

  // AI Suggestions Mutation
  const aiSuggestionsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/ai/suggestions', {
        context: {
          goals: goals || [],
          skills: skills || [],
          tasks: tasks || [],
          profile: profile || null
        }
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.suggestions && data.suggestions.length > 0) {
        const suggestionMessage: ChatMessage = {
          id: Date.now().toString(),
          type: 'ai',
          content: `🎯 **AI智能建议**\n\n${data.suggestions.join('\n\n')}`,
          timestamp: new Date(),
          category: 'suggestion'
        };
        setMessages(prev => [...prev, suggestionMessage]);
      }
    }
  });

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);
    
    aiChatMutation.mutate(inputMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'suggestion': return <Target className="w-4 h-4 text-blue-500" />;
      case 'insight': return <Brain className="w-4 h-4 text-purple-500" />;
      case 'advice': return <Lightbulb className="w-4 h-4 text-yellow-500" />;
      default: return <Bot className="w-4 h-4 text-primary" />;
    }
  };

  const getCategoryLabel = (category?: string) => {
    switch (category) {
      case 'suggestion': return 'AI建议';
      case 'insight': return 'AI洞察';
      case 'advice': return 'AI指导';
      default: return 'AI助手';
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-[1004] transition-all duration-300 ${
      isMinimized ? 'w-80 h-16' : 'w-96 h-[36rem]'
    }`}>
      <Card className="h-full shadow-2xl border-primary/20">
        {/* Header */}
        <CardHeader className="flex flex-row items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-accent/10 border-b">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium text-foreground">AI成长助手</CardTitle>
              <p className="text-xs text-muted-foreground">智能个人发展顾问</p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="w-8 h-8 p-0"
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="w-8 h-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        {!isMinimized && (
          <>
            {/* Smart Recommendations Section */}
            <CardContent className="p-0 border-b">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <span className="font-medium text-sm text-gray-800 dark:text-gray-200">智能推荐</span>
                </div>
                <div className="space-y-2">
                  <div 
                    className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-200 hover:shadow-sm transition-shadow cursor-pointer"
                    onClick={() => {
                      onPageChange?.('tasks');
                      onToggle();
                    }}
                  >
                    <Calendar className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-800">专注完成当前任务</div>
                      <div className="text-xs text-gray-600 mt-1">你有 9 个未完成任务，建议先完成几个</div>
                      <Badge variant="secondary" className="text-xs mt-1">优化建议</Badge>
                    </div>
                  </div>
                  
                  <div 
                    className="flex items-start gap-3 p-3 bg-white rounded-lg border border-green-200 hover:shadow-sm transition-shadow cursor-pointer"
                    onClick={() => {
                      onPageChange?.('skills');
                      onToggle();
                    }}
                  >
                    <Target className="h-4 w-4 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-800">技能发展建议</div>
                      <div className="text-xs text-gray-600 mt-1">情绪稳定力技能还有很大提升空间</div>
                      <Badge variant="secondary" className="text-xs mt-1">数据洞察</Badge>
                    </div>
                  </div>
                  
                  <div 
                    className="flex items-start gap-3 p-3 bg-white rounded-lg border border-orange-200 hover:shadow-sm transition-shadow cursor-pointer"
                    onClick={() => {
                      onPageChange?.('goals');
                      onToggle();
                    }}
                  >
                    <Lightbulb className="h-4 w-4 text-orange-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-800">探索模板中心</div>
                      <div className="text-xs text-gray-600 mt-1">发现更多专业的任务和目标模板</div>
                      <Badge variant="secondary" className="text-xs mt-1">优化建议</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>

            {/* Messages */}
            <CardContent className="p-0 flex-1">
              <ScrollArea className="h-48 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.type === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        {message.type === 'ai' && message.category && (
                          <div className="flex items-center space-x-2 mb-2">
                            {getCategoryIcon(message.category)}
                            <Badge variant="secondary" className="text-xs">
                              {getCategoryLabel(message.category)}
                            </Badge>
                          </div>
                        )}
                        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                        <div className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString('zh-CN', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-muted text-foreground rounded-lg p-3 max-w-[80%]">
                        <div className="flex items-center space-x-2">
                          <Bot className="w-4 h-4 text-primary" />
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div ref={messagesEndRef} />
              </ScrollArea>
            </CardContent>

            {/* Quick Actions */}
            <div className="p-3 border-t border-border">
              <div className="flex flex-wrap gap-2 mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => aiSuggestionsMutation.mutate()}
                  disabled={aiSuggestionsMutation.isPending}
                  className="text-xs"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  获取建议
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const message = "分析我的技能发展情况";
                    setInputMessage(message);
                    handleSendMessage();
                  }}
                  className="text-xs"
                >
                  <Brain className="w-3 h-3 mr-1" />
                  技能分析
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const message = "帮我规划今天的任务";
                    setInputMessage(message);
                    handleSendMessage();
                  }}
                  className="text-xs"
                >
                  <Calendar className="w-3 h-3 mr-1" />
                  任务规划
                </Button>
              </div>

              {/* Input */}
              <div className="flex space-x-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="输入你的问题..."
                  className="flex-1 text-sm"
                  disabled={isTyping}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isTyping}
                  size="sm"
                  className="px-3"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}