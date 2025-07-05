import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, User, Menu, X, Home, Target, Calendar, BookOpen, Brain, Sparkles, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";


import type { UserProfile } from "@shared/schema";

interface NavigationProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

export default function Navigation({ currentPage, onPageChange }: NavigationProps) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const { user } = useAuth();

  // Fetch user profile data to get the display name
  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["/api/data?type=profile"],
    enabled: !!user,
  });

  const handleLogout = () => {
    // Clear authentication data
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    
    // Redirect to home page
    window.location.href = "/";
  };



  const navigationItems = [
    { 
      id: "dashboard", 
      href: "/", 
      icon: Home, 
      label: "仪表板", 
      description: "概览和统计" 
    },
    { 
      id: "tasks", 
      href: "/tasks", 
      icon: Calendar, 
      label: "任务", 
      description: "日常任务管理" 
    },
    { 
      id: "skills", 
      href: "/skills", 
      icon: Brain, 
      label: "技能", 
      description: "技能树和成长" 
    },
    { 
      id: "goals", 
      href: "/goals", 
      icon: Target, 
      label: "目标", 
      description: "长期目标追踪" 
    },
    { 
      id: "log", 
      href: "/log", 
      icon: BookOpen, 
      label: "日志", 
      description: "活动记录" 
    }
  ];

  const handleNavItemClick = (pageId: string) => {
    onPageChange(pageId);
    setIsMobileMenuOpen(false);
  };

  // Determine active page from current location
  const getActivePageFromLocation = (location: string) => {
    if (location === '/') return 'dashboard';
    if (location === '/tasks') return 'tasks';
    if (location === '/skills') return 'skills';
    if (location === '/goals') return 'goals';
    if (location === '/log') return 'log';
    return 'dashboard';
  };

  const activePage = getActivePageFromLocation(location);

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 bg-background/98 backdrop-blur-lg border-b border-border/60 z-50 shadow-sm">
        <div className="flex justify-between items-center py-3 px-6 max-w-7xl mx-auto w-full">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-lg" style={{ color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>L</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-bold text-foreground">Level Up Solo</span>
              <span className="text-xs text-muted-foreground">个人成长RPG游戏化平台</span>
            </div>
          </div>

          {/* Desktop Navigation Items */}
          <div className="flex space-x-2">
            {navigationItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  data-testid={`nav-${item.id}`}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                    activePage === item.id
                      ? "bg-primary text-primary-foreground shadow-md scale-105"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                  }`}
                  onClick={() => onPageChange(item.id)}
                >
                  <IconComponent className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* User Dropdown Menu */}
          <div className="flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-3 bg-muted/30 rounded-xl px-3 py-2 hover:bg-muted/50 transition-colors">
                  {user?.profileImageUrl ? (
                    <img 
                      src={user.profileImageUrl} 
                      alt="Profile" 
                      className="w-8 h-8 rounded-full object-cover border-2 border-primary/20"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <span className="text-sm text-foreground font-medium">
                    {profile?.name || user?.firstName || user?.email || "User"}
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-2">
                <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg p-3 mb-2">
                  <div className="flex items-center space-x-3">
                    <User className="w-5 h-5" />
                    <div>
                      <div className="text-sm font-medium">用户名</div>
                      <div className="text-xs opacity-90">
                        {profile?.name || user?.firstName || "Peter Mu"}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Email</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {user?.email}
                  </span>
                </div>
                
                <DropdownMenuSeparator className="my-2" />
                
                <DropdownMenuItem 
                  onClick={handleLogout} 
                  className="flex items-center space-x-2 p-3 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/20 rounded-md cursor-pointer focus:bg-transparent data-[highlighted]:bg-green-50 data-[highlighted]:text-green-700"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-medium">退出登录</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>
      {/* Mobile Navigation */}
      <nav className="md:hidden fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-b border-border z-50">
        <div className="flex justify-between items-center py-4 px-4">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm" style={{ color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>L</span>
            </div>
            <span className="text-lg font-bold text-foreground">LevelUp Solo</span>
          </div>

          {/* Hamburger Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </Button>
        </div>
      </nav>
      {/* Mobile Slide-out Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Menu Panel */}
          <div className="absolute top-0 left-0 h-full w-80 max-w-[85vw] bg-background border-r border-border shadow-xl">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div className="flex items-center space-x-3">
                  {user?.profileImageUrl ? (
                    <img 
                      src={user.profileImageUrl} 
                      alt="Profile" 
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-muted-foreground" />
                  )}
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {profile?.name || user?.firstName || user?.email || "User"}
                    </div>
                    <div className="text-xs text-muted-foreground">个人成长追踪</div>
                  </div>
                </div>
              </div>

              {/* Navigation Items */}
              <div className="flex-1 py-6">
                <div className="space-y-2 px-4">
                  {navigationItems.map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                          activePage === item.id
                            ? "bg-primary text-primary-foreground"
                            : "text-foreground hover:bg-muted"
                        }`}
                        onClick={() => handleNavItemClick(item.id)}
                      >
                        <IconComponent className="w-5 h-5" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{item.label}</div>
                          <div className="text-xs opacity-75">{item.description}</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Logout Button */}
              <div className="p-4 border-t border-border">
                <Button 
                  onClick={handleLogout} 
                  variant="outline" 
                  className="w-full justify-start"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  登出
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}


    </>
  );
}