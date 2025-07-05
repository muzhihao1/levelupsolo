import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";

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
  
  const { data: report, isLoading } = useQuery({
    queryKey: ['battle-report', 'daily', today],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/battle-reports/daily?date=${today}`);
      return response.json() as Promise<DailyBattleReport>;
    }
  });

  if (isLoading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}小时${mins}分钟`;
    }
    return `${mins}分钟`;
  };

  return (
    <Card className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <i className="fas fa-scroll text-amber-500"></i>
            今日战报
          </span>
          <span className="text-sm text-gray-400 font-normal">
            {new Date().toLocaleDateString('zh-CN')}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 统计数据网格 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center mb-1">
              <i className="fas fa-clock text-blue-400 text-lg"></i>
            </div>
            <div className="text-2xl font-bold text-white">
              {formatTime(report?.totalBattleTime || 0)}
            </div>
            <div className="text-xs text-gray-400 mt-1">战斗时长</div>
          </div>
          
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center mb-1">
              <i className="fas fa-fire text-orange-400 text-lg"></i>
            </div>
            <div className="text-2xl font-bold text-white">
              {report?.energyBallsConsumed || 0}
            </div>
            <div className="text-xs text-gray-400 mt-1">能量球消耗</div>
          </div>
          
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center mb-1">
              <i className="fas fa-check-circle text-green-400 text-lg"></i>
            </div>
            <div className="text-2xl font-bold text-white">
              {report?.tasksCompleted || 0}
            </div>
            <div className="text-xs text-gray-400 mt-1">完成任务</div>
          </div>
          
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center mb-1">
              <i className="fas fa-sync text-purple-400 text-lg"></i>
            </div>
            <div className="text-2xl font-bold text-white">
              {report?.pomodoroCycles || 0}
            </div>
            <div className="text-xs text-gray-400 mt-1">番茄周期</div>
          </div>
        </div>

        {/* 任务详情列表 */}
        {report?.taskDetails && report.taskDetails.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300 mb-2">完成的任务</h4>
            <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
              {report.taskDetails.map((task, index) => (
                <div 
                  key={`${task.taskId}-${index}`}
                  className="flex items-center justify-between bg-slate-700/30 rounded px-3 py-2 text-sm"
                >
                  <span className="text-gray-200 truncate flex-1 mr-2">
                    {task.taskTitle}
                  </span>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <i className="fas fa-clock"></i>
                      {task.battleTime}分
                    </span>
                    <span className="flex items-center gap-1">
                      <i className="fas fa-fire"></i>
                      {task.energyBalls}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 空状态 */}
        {(!report || report.totalBattleTime === 0) && (
          <div className="text-center py-6">
            <i className="fas fa-swords text-4xl text-gray-600 mb-3 block"></i>
            <p className="text-gray-400 text-sm">今天还没有开始战斗</p>
            <p className="text-gray-500 text-xs mt-1">开始挑战Boss，记录你的成长！</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}