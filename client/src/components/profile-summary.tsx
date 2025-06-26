import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { UserProfile } from "@shared/schema";

interface ProfileSummaryProps {
  profile: UserProfile;
  onEdit: () => void;
}

// 生成英雄介绍的函数
function generateHeroIntroduction(profile: UserProfile): string {
  const age = profile.age || '未知年龄';
  const occupation = profile.occupation || '探索者';
  const mission = profile.mission || '追求个人成长';
  
  const templates = [
    `${age}岁的${occupation}，正在为了"${mission}"而不断努力，在独自升级的路上勇敢前行`,
    `来自${occupation}领域的成长者，以"${mission}"为目标，追求卓越的升级之路`,
    `${age}岁的${occupation}英雄，怀着"${mission}"的使命，在个人成长的战场上不断突破`,
    `${occupation}背景的独行者，专注于"${mission}"，正书写属于自己的升级传奇`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
}

export default function ProfileSummary({ profile, onEdit }: ProfileSummaryProps) {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground flex items-center">
            <i className="fas fa-mask text-accent mr-2"></i>
            英雄介绍
          </CardTitle>
          <Button
            onClick={onEdit}
            variant="outline"
            size="sm"
            className="text-accent border-accent hover:bg-accent/10"
          >
            <i className="fas fa-edit mr-1"></i>
            编辑
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* 英雄一句话介绍 */}
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-xl p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5"></div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-accent/10 rounded-full -translate-y-12 translate-x-12"></div>
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-primary/10 rounded-full translate-y-10 -translate-x-10"></div>
          
          <div className="relative z-10 space-y-4">
            <div className="text-4xl">⚡</div>
            <h3 className="text-2xl font-bold text-foreground">
              {profile.name}
            </h3>
            <p className="text-muted-foreground text-xl leading-relaxed font-medium max-w-2xl mx-auto">
              {generateHeroIntroduction(profile)}
            </p>
          </div>
        </div>

        <div className="mt-6 bg-muted rounded-lg p-4">
          <p className="text-center text-muted-foreground text-sm">
            AI将根据此英雄档案为您提供个性化的任务分析和成长建议
          </p>
        </div>
      </CardContent>
    </Card>
  );
}