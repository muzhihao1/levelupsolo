import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HabiticaStats } from "@/components/habitica-stats";
import UnifiedRPGTaskManager from "@/components/unified-rpg-task-manager";
import type { UserStats } from "@shared/schema";

export default function HabiticaDashboard() {
  // 获取用户游戏统计数据
  const { data: userStats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: ['/api/data?type=stats'],
    retry: false
  });

  if (statsLoading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载游戏数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          🎮 Level Up Solo
        </h1>
        <p className="text-muted-foreground">
          将任务管理转化为RPG游戏体验，通过完成习惯、每日任务和待办事项来提升等级和获得奖励
        </p>
      </div>

      {/* 游戏化统计显示 */}
      {userStats && (
        <HabiticaStats stats={userStats} />
      )}

      {/* 任务管理系统 */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">⚔️</span>
              任务冒险
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              完成任务获得经验值和金币，培养积极习惯，保持每日连击！
            </p>
          </CardHeader>
          <CardContent>
            <UnifiedRPGTaskManager />
          </CardContent>
        </Card>

        {/* 游戏化说明 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <span className="text-lg">🔄</span>
                习惯 (Habits)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                长期养成的习惯，可以是正向（运动、阅读）或负向（戒烟、少吃糖）。
                每次执行都会影响习惯强度值。
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <span className="text-lg">📅</span>
                每日任务 (Dailies)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                需要每天完成的任务。完成可获得经验和金币，
                未完成会减少生命值。连续完成可增加连击数。
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <span className="text-lg">📋</span>
                待办事项 (To-Dos)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                一次性任务，完成后消失。根据难度获得不同的
                经验值和金币奖励。适合项目和目标相关任务。
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 奖励系统说明 */}
        <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">🎁</span>
              奖励系统
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="space-y-2">
                <div className="text-2xl">⚡</div>
                <div className="text-sm font-medium">经验值 (XP)</div>
                <div className="text-xs text-muted-foreground">升级解锁新功能</div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl">🪙</div>
                <div className="text-sm font-medium">金币 (GP)</div>
                <div className="text-xs text-muted-foreground">购买奖励和装备</div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl">❤️</div>
                <div className="text-sm font-medium">生命值 (HP)</div>
                <div className="text-xs text-muted-foreground">健康状态指标</div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl">🔥</div>
                <div className="text-sm font-medium">连击数</div>
                <div className="text-xs text-muted-foreground">连续完成天数</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}