import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Target, CheckCircle, ArrowRight, Sparkles, PlayCircle } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  const handleStartJourney = () => {
    handleLogin();
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Clean Header */}
      <header className="py-6 px-6 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white">LevelUp Solo</h1>
            </div>
          </div>
          <Button 
            onClick={handleLogin} 
            variant="ghost" 
            className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          >
            登录
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-8">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">个人成长RPG游戏化平台</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight tracking-tight">
            升级你的
            <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              个人成长
            </span>
          </h1>
          
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            通过游戏化的个人发展提升技能、完成任务、解锁成就，培养更好的习惯并实现目标。
          </p>
          
          <Button 
            onClick={handleStartJourney}
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg px-10 py-4 rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
          >
            开始你的旅程
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Quick Start Guide */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">开始你的成长之旅</h2>
            <p className="text-lg text-muted-foreground">三个简单步骤，开启游戏化个人发展</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500/30 to-blue-600/30 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Target className="h-10 w-10 text-blue-400" />
              </div>
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-2xl font-bold text-foreground mb-4">1. 设定目标</h3>
                <p className="text-muted-foreground leading-relaxed">使用AI智能助手制定个人成长目标，自动分解为可执行的里程碑任务</p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500/30 to-green-600/30 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <PlayCircle className="h-10 w-10 text-green-400" />
              </div>
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-2xl font-bold text-foreground mb-4">2. 完成任务</h3>
                <p className="text-muted-foreground leading-relaxed">将目标转化为日常任务，通过番茄钟专注法完成挑战，获得经验值奖励</p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500/30 to-purple-600/30 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Trophy className="h-10 w-10 text-purple-400" />
              </div>
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-2xl font-bold text-foreground mb-4">3. 升级成长</h3>
                <p className="text-muted-foreground leading-relaxed">追踪进度数据，解锁成就徽章，在六大核心技能中不断升级提升</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-card rounded-lg p-6 border border-border">
              <h3 className="text-xl font-semibold text-foreground mb-3">🎯 智能目标设定</h3>
              <p className="text-muted-foreground">AI驱动的目标创建，支持里程碑跟踪和进度可视化。</p>
            </div>
            
            <div className="bg-card rounded-lg p-6 border border-border">
              <h3 className="text-xl font-semibold text-foreground mb-3">⚔️ RPG战斗系统</h3>
              <p className="text-muted-foreground">将专注时间转化为史诗般的Boss战，沉浸式番茄钟计时器。</p>
            </div>
            
            <div className="bg-card rounded-lg p-6 border border-border">
              <h3 className="text-xl font-semibold text-foreground mb-3">📊 技能进阶</h3>
              <p className="text-muted-foreground">升级六大核心技能，通过详细数据分析跟踪你的成长。</p>
            </div>
            
            <div className="bg-card rounded-lg p-6 border border-border">
              <h3 className="text-xl font-semibold text-foreground mb-3">🏆 成就系统</h3>
              <p className="text-muted-foreground">解锁奖励，庆祝个人发展旅程中的里程碑时刻。</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-8 border border-primary/20">
            <h3 className="text-2xl font-bold text-foreground mb-4">准备好升级你的人生了吗？</h3>
            <p className="text-muted-foreground mb-6">加入成千上万已经踏上个人成长旅程的用户行列。</p>
            <Button 
              onClick={handleStartJourney}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3"
            >
              立即开始
            </Button>
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-muted-foreground text-sm">
            &copy; 2024 LevelUp Solo. 游戏化你的个人成长旅程。
          </p>
        </div>
      </footer>
    </div>
  );
}