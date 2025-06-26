
import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

interface UserStateData {
  energyLevel: 'high' | 'medium' | 'low';
  availableTime: number;
  mood: 'good' | 'neutral' | 'tired';
  focusLevel: number;
}

interface UserStateSelectorProps {
  onStateUpdate: (state: UserStateData) => void;
  currentState?: UserStateData;
}

export function UserStateSelector({ onStateUpdate, currentState }: UserStateSelectorProps) {
  const [state, setState] = useState<UserStateData>(currentState || {
    energyLevel: 'medium',
    availableTime: 30,
    mood: 'neutral',
    focusLevel: 5
  });
  const [isLoading, setIsLoading] = useState(false);

  // 组件加载时获取现有状态或设置默认状态
  React.useEffect(() => {
    const loadUserState = async () => {
      if (!currentState) {
        setIsLoading(true);
        try {
          const response = await fetch('/api/user-state', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
          });
          
          if (response.ok) {
            const existingState = await response.json();
            setState(existingState);
            onStateUpdate(existingState);
          } else {
            // 如果获取失败，使用默认状态
            onStateUpdate(state);
          }
        } catch (error) {
          console.error('Error loading user state:', error);
          onStateUpdate(state);
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    loadUserState();
  }, []);

  const energyOptions = [
    { value: 'high', label: '精力充沛', emoji: '⚡' },
    { value: 'medium', label: '一般', emoji: '😊' },
    { value: 'low', label: '有点累', emoji: '😴' }
  ];

  const timeOptions = [
    { value: 15, label: '15分钟' },
    { value: 30, label: '30分钟' },
    { value: 60, label: '1小时' },
    { value: 120, label: '2小时+' }
  ];

  const moodOptions = [
    { value: 'good', label: '心情不错', emoji: '😄' },
    { value: 'neutral', label: '平静', emoji: '😐' },
    { value: 'tired', label: '有些疲惫', emoji: '😞' }
  ];

  const handleStateChange = (key: keyof UserStateData, value: any) => {
    const newState = { ...state, [key]: value };
    setState(newState);
    onStateUpdate(newState);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🧠 当前状态
          <Badge variant="secondary">AI将基于此推荐任务</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2">今天感觉如何？</h4>
          <div className="flex gap-2 flex-wrap">
            {energyOptions.map((option) => (
              <Button
                key={option.value}
                variant={state.energyLevel === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => handleStateChange('energyLevel', option.value)}
                className="flex items-center gap-1"
              >
                <span>{option.emoji}</span>
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2">有多少时间？</h4>
          <div className="flex gap-2 flex-wrap">
            {timeOptions.map((option) => (
              <Button
                key={option.value}
                variant={state.availableTime === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => handleStateChange('availableTime', option.value)}
              >
                ⏱️ {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2">心情状态</h4>
          <div className="flex gap-2 flex-wrap">
            {moodOptions.map((option) => (
              <Button
                key={option.value}
                variant={state.mood === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => handleStateChange('mood', option.value)}
                className="flex items-center gap-1"
              >
                <span>{option.emoji}</span>
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
