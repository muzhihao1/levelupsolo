import { useState } from "react";
import { useLocation } from "wouter";

import TemplatesSection from "@/components/templates-section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles, Target, Clock } from "lucide-react";

export default function Templates() {
  const [location] = useLocation();

  const breadcrumbItems = [
    { label: "仪表盘", href: "/" },
    { label: "模板中心", href: "/templates" }
  ];

  return (
    <div className="space-y-6">
      
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-blue-600" />
              模板中心
            </h1>
            <p className="text-muted-foreground mt-2">
              选择预设模板快速创建任务和目标，或使用AI智能解析自然语言输入
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Target className="h-4 w-4" />
                精选模板
              </div>
              <div className="flex items-center gap-1 mt-1">
                <Clock className="h-4 w-4" />
                即时创建
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Templates Section */}
      <TemplatesSection />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="text-center p-4">
          <div className="text-2xl font-bold text-blue-600">12+</div>
          <div className="text-sm text-muted-foreground">精选模板</div>
        </Card>
        <Card className="text-center p-4">
          <div className="text-2xl font-bold text-green-600">AI</div>
          <div className="text-sm text-muted-foreground">智能解析</div>
        </Card>
        <Card className="text-center p-4">
          <div className="text-2xl font-bold text-purple-600">5</div>
          <div className="text-sm text-muted-foreground">成长领域</div>
        </Card>
      </div>
    </div>
  );
}