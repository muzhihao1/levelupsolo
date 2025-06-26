import { Progress } from "@/components/ui/progress";
import { Coins, Zap, Flame, Circle } from "lucide-react";
import type { UserStats } from "@shared/schema";

interface HabiticaStatsProps {
  stats: UserStats;
}

export function HabiticaStats({ stats }: HabiticaStatsProps) {
  const experiencePercentage = (stats.experience / stats.experienceToNext) * 100;
  const energyPercentage = (stats.energyBalls / stats.maxEnergyBalls) * 100;



  const getEnergyColor = () => {
    if (energyPercentage >= 75) return "bg-cyan-500";
    if (energyPercentage >= 50) return "bg-blue-500";
    if (energyPercentage >= 25) return "bg-purple-500";
    return "bg-red-500";
  };

  const getExperienceColor = () => {
    return "bg-blue-500";
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
      {/* Level Card */}
      <div 
        className="rounded-lg p-4 border border-purple-500/30"
        style={{ backgroundColor: 'rgb(51 65 85 / 0.5)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-5 w-5 text-purple-400" />
          <span className="text-sm font-medium text-purple-300">等级值</span>
        </div>
        <div className="space-y-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">Lv.{stats.level}</div>
            <div className="text-xs text-gray-300">{stats.experience} / {stats.experienceToNext}</div>
          </div>
          <Progress 
            value={experiencePercentage} 
            className="h-2"
          />
          <div 
            className="rounded-lg p-2 border border-purple-500/30"
            style={{ backgroundColor: 'rgb(88 28 135 / 0.3)' }}
          >
            <div className="text-center text-xs text-purple-300">
              进步: {Math.round(experiencePercentage)}%
            </div>
          </div>
        </div>
      </div>

      {/* Energy Balls Card */}
      <div 
        className="rounded-lg p-4 border border-cyan-500/30"
        style={{ backgroundColor: 'rgb(51 65 85 / 0.5)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Circle className="h-5 w-5 text-cyan-400" />
          <span className="text-sm font-medium text-cyan-300">能量球</span>
        </div>
        <div className="space-y-3">
          <div className="text-center">
            <div className="text-lg font-bold text-cyan-400">
              {energyPercentage >= 75 ? "精力充沛" : 
               energyPercentage >= 50 ? "状态良好" :
               energyPercentage >= 25 ? "需要休息" : "精力耗尽"}
            </div>
            <div className="text-xs text-gray-300">🔵 {stats.energyBalls} / {stats.maxEnergyBalls}</div>
          </div>
          <Progress 
            value={energyPercentage} 
            className="h-2"
          />
          <div 
            className="rounded-lg p-2 border border-cyan-500/30"
            style={{ backgroundColor: 'rgb(22 78 99 / 0.3)' }}
          >
            <div className="text-center text-xs text-cyan-300">
              每球 = {stats.energyBallDuration}分钟专注
            </div>
            <div className="text-center text-xs text-cyan-400 mt-1">
              💤 每日0点自动恢复
            </div>
          </div>
        </div>
      </div>



      {/* Streak Card */}
      <div 
        className="rounded-lg p-4 border border-orange-500/30"
        style={{ backgroundColor: 'rgb(51 65 85 / 0.5)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Flame className="h-5 w-5 text-orange-400" />
          <span className="text-sm font-medium text-orange-300">连击天数</span>
        </div>
        <div className="space-y-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400">{stats.streak}</div>
            <div className="text-xs text-orange-500">天连续成长</div>
          </div>
          <div 
            className="rounded-lg p-2 border border-orange-500/30 flex items-center justify-center gap-1"
            style={{ backgroundColor: 'rgb(154 52 18 / 0.3)' }}
          >
            <div className="text-center text-xs text-orange-300">
              <span>🔥</span>
              <span>保持动力!</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}