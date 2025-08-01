import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect, Suspense, lazy } from "react";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/navigation";
import AIAssistant from "@/components/ai-assistant";
import AIFloatingButton from "@/components/ai-floating-button";
import { GlobalFloatingTimer } from "@/components/global-floating-timer";

import PerformanceMonitoring from "@/components/performance-monitoring";
import Landing from "@/pages/landing";
import NotFound from "@/pages/not-found";
import { Bot } from "lucide-react";

// Lazy load authenticated pages
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Tasks = lazy(() => import("@/pages/tasks"));
const SkillTree = lazy(() => import("@/pages/skill-tree"));
const GoalsSimple = lazy(() => import("@/pages/goals"));
const GrowthLog = lazy(() => import("@/pages/growth-log"));
const WeeklySummary = lazy(() => import("@/pages/weekly-summary"));
const AuthPage = lazy(() => import("@/pages/auth"));
const DebugUser = lazy(() => import("@/pages/debug-user"));
const FixData = lazy(() => import("@/pages/fix-data"));
const TestTaskCreation = lazy(() => import("@/pages/test-task-creation"));
const ApiTest = lazy(() => import("@/pages/api-test"));
const Pomodoro = lazy(() => import("@/pages/pomodoro"));
const Support = lazy(() => import("@/pages/support"));
const AccountDeletion = lazy(() => import("@/pages/account-deletion"));
const PrivacyPolicy = lazy(() => import("@/pages/privacy-policy"));

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isAIAssistantVisible, setIsAIAssistantVisible] = useState(false);
  

  



  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      }>
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/landing" component={Landing} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/support" component={Support} />
          <Route path="/account-deletion" component={AccountDeletion} />
          <Route path="/privacy-policy" component={PrivacyPolicy} />
          <Route component={Landing} />
        </Switch>
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Skip to content link for accessibility */}
      <a href="#main-content" className="skip-to-content">
        跳转到主要内容
      </a>

      <header role="banner">
        <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />
      </header>

      <main id="main-content" role="main" className="pb-6 pt-20 md:pt-24 px-2 md:px-4 max-w-7xl mx-auto">
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        }>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/tasks" component={Tasks} />
            <Route path="/skills" component={SkillTree} />
            <Route path="/goals" component={GoalsSimple} />
            <Route path="/log" component={GrowthLog} />
            <Route path="/weekly-summary" component={WeeklySummary} />
            <Route path="/pomodoro" component={Pomodoro} />
            <Route path="/support" component={Support} />
            <Route path="/account-deletion" component={AccountDeletion} />
            <Route path="/privacy-policy" component={PrivacyPolicy} />
            <Route path="/debug-user" component={DebugUser} />
            <Route path="/fix-data" component={FixData} />
            <Route path="/test-task" component={TestTaskCreation} />
            <Route path="/api-test" component={ApiTest} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </main>


      {/* AI Assistant Integration - Top Right Corner like Elisi */}
      {!isAIAssistantVisible && (
        <button
          data-testid="ai-assistant-button"
          onClick={() => setIsAIAssistantVisible(true)}
          className="fixed top-20 right-6 z-[1010] w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center cursor-pointer"
        >
          <Bot className="w-6 h-6 text-white" />
        </button>
      )}
      
      <AIAssistant 
        isVisible={isAIAssistantVisible}
        onToggle={() => setIsAIAssistantVisible(!isAIAssistantVisible)}
        onPageChange={(page) => {
          const routeMap: Record<string, string> = {
            'tasks': '/tasks',
            'skills': '/skills', 
            'goals': '/goals',
            'dashboard': '/',
            'log': '/log'
          };
          setLocation(routeMap[page] || '/');
        }}
      />
      
      {/* Mode Toggle - Professional/Game Mode */}



      {/* Global Floating Timer */}
      <GlobalFloatingTimer />

      {/* Performance Monitoring */}
      <PerformanceMonitoring />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;