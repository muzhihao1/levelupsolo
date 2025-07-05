import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Zap } from "lucide-react";

interface TaskDetail {
  taskId: number;
  taskTitle: string;
  battleTime: number;
  energyBalls: number;
  cycles: number;
}

interface DailyBattleReport {
  date: string;
  totalBattleTime: number;
  energyBallsConsumed: number;
  tasksCompleted: number;
  pomodoroCycles: number;
  taskDetails: TaskDetail[];
}

export default function DailyBattleReportCard() {
  const today = new Date().toISOString().split('T')[0];
  
  const { data: report, isLoading, error } = useQuery({
    queryKey: ['battle-report', 'daily', today],
    queryFn: async () => {
      try {
        const data = await apiRequest('GET', `/api/battle-reports/daily?date=${today}`);
        return data as DailyBattleReport;
      } catch (error) {
        console.error('Failed to fetch battle report:', error);
        // Return empty report on error instead of throwing
        return {
          date: today,
          totalBattleTime: 0,
          energyBallsConsumed: 0,
          tasksCompleted: 0,
          pomodoroCycles: 0,
          taskDetails: []
        };
      }
    },
    retry: 1, // Only retry once
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000 // Keep in cache for 10 minutes
  });

  if (isLoading) {
    return (
      <Card className="bg-card border-border shadow-sm">
        <CardContent className="p-8">
          <Skeleton className="h-6 w-32 mb-6" />
          <div className="space-y-4">
            <Skeleton className="h-12 w-20 mx-auto" />
            <Skeleton className="h-4 w-24 mx-auto" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins} 分钟`;
  };

  const totalBattleTime = report?.totalBattleTime || 0;
  const energyBalls = report?.energyBallsConsumed || 0;

  return (
    <Card className="bg-card border-border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-foreground">今日战斗</h2>
          <Clock className="h-6 w-6 text-orange-500" />
        </div>
        <div className="text-center">
          <div className="text-5xl font-bold text-foreground mb-2">
            {formatTime(totalBattleTime)}
          </div>
          <div className="text-lg text-muted-foreground mb-4">
            战斗时长
          </div>
          {energyBalls > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-2">
              <Zap className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-accent">
                消耗 {energyBalls} 能量球
              </span>
            </div>
          )}
          {totalBattleTime === 0 && (
            <div className="mt-4">
              <div className="text-sm text-muted-foreground">今天还没有开始战斗</div>
              <div className="text-sm font-medium text-foreground mt-2">
                开始挑战Boss
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}