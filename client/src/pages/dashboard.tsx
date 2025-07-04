import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Target } from "lucide-react";
import ProfileQuestionnaire from "@/components/profile-questionnaire";
import ProfileSummary from "@/components/profile-summary";
import OnboardingGuide from "@/components/onboarding-guide";

import { apiRequest } from "@/lib/queryClient";
import type { Skill, Goal, Task, UserStats, UserProfile, InsertUserProfile } from "@shared/schema";

interface GoalWithMilestones extends Goal {
  milestones?: Array<{
    id: number;
    completed: boolean;
  }>;
}

export default function Dashboard() {
  const [showProfileQuestionnaire, setShowProfileQuestionnaire] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const queryClient = useQueryClient();

  // Fetch user profile
  const { data: userProfile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ['/api/data?type=profile'],
    retry: false
  });

  // Fetch user stats
  const { data: userStats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: ['/api/data?type=stats'],
    retry: false
  });

  // Save user profile mutation
  const saveProfileMutation = useMutation({
    mutationFn: async (profile: InsertUserProfile) => {
      return await apiRequest('POST', '/api/crud?resource=profile', profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data?type=profile'] });
      setShowProfileQuestionnaire(false);
    },
    onError: (error) => {
      console.error('Profile save failed:', error);
      setShowProfileQuestionnaire(false);
    }
  });

  const handleProfileComplete = (profile: InsertUserProfile) => {
    saveProfileMutation.mutate(profile);
  };

  const handleEditProfile = () => {
    setShowProfileQuestionnaire(true);
  };

  // Fetch data
  const { data: skills = [] } = useQuery<Skill[]>({
    queryKey: ['/api/data?type=skills']
  });

  const { data: goals = [] } = useQuery<GoalWithMilestones[]>({
    queryKey: ['/api/data?type=goals']
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['/api/data?type=tasks']
  });

  // Check if onboarding should be shown
  useEffect(() => {
    if (!profileLoading && userProfile === null) {
      setShowProfileQuestionnaire(true);
    } else if (userProfile) {
      setShowProfileQuestionnaire(false);
      
      // Only show onboarding for users who haven't completed it
      if (!userProfile.hasCompletedOnboarding) {
        setShowOnboarding(true);
      }
    }
  }, [profileLoading, userProfile]);

  // Calculate today's stats
  const todayTasks = tasks.filter(task => {
    const today = new Date().toDateString();
    return new Date(task.createdAt).toDateString() === today;
  });
  
  const completedTodayTasks = todayTasks.filter(task => task.completed);
  const todayExp = completedTodayTasks.reduce((sum, task) => sum + (task.expReward || 0), 0);
  
  const inProgressGoals = goals.filter(goal => !goal.completedAt);

  return (
    <div className="min-h-screen bg-background">

      {/* Clean Hero Section */}
      <div className="bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-6">
              <span className="text-sm font-medium text-primary contrast-high">个人成长RPG游戏化平台</span>
            </div>
            <h1 className="text-hierarchy-h1 mb-4">
              升级你的成长之旅
            </h1>
            <p className="text-hierarchy-body max-w-2xl mx-auto">
              将日常任务转化为史诗冒险，见证自己的成长
            </p>
          </div>
          
          <div className="flex justify-center">
            <button 
              onClick={() => setShowOnboarding(true)}
              className="interactive-primary px-8 py-3 rounded-lg font-semibold text-lg hover:scale-105 transition-transform"
            >
              开始你的旅程
            </button>
          </div>
        </div>
      </div>

      {/* Simplified Progress Overview */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 grid-responsive-tablet">
          {/* Today's Completed Tasks */}
          <Card className="bg-card border-border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-foreground">今日完成任务</h2>
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold text-foreground mb-2">
                  {completedTodayTasks.length}
                </div>
                <div className="text-lg text-muted-foreground">
                  共 {todayTasks.length} 个任务
                </div>
                {todayExp > 0 && (
                  <div className="mt-4 inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-2">
                    <span className="text-sm font-medium text-accent">
                      今日获得 +{todayExp} XP
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Active Goals */}
          <Card className="bg-card border-border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-foreground">活跃目标</h2>
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold text-foreground mb-2">
                  {inProgressGoals.length}
                </div>
                <div className="text-lg text-muted-foreground">
                  个目标进行中
                </div>
                {inProgressGoals.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm text-muted-foreground mb-2">下一个里程碑:</div>
                    <div className="text-sm font-medium text-foreground truncate">
                      {inProgressGoals[0].title}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Profile Summary */}
      {userProfile && (
        <div className="max-w-6xl mx-auto px-6 pb-12">
          <Card className="bg-card border-border shadow-sm">
            <CardContent className="p-8">
              <ProfileSummary profile={userProfile} onEdit={handleEditProfile} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Profile Questionnaire */}
      <ProfileQuestionnaire 
        isOpen={showProfileQuestionnaire}
        onComplete={handleProfileComplete}
      />

      {/* Onboarding Guide */}
      <OnboardingGuide 
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={() => {
          localStorage.setItem('onboarding_completed', 'true');
          setShowOnboarding(false);
        }}
      />
    </div>
  );
}