import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Zap, BarChart } from "lucide-react";

/**
 * AI 性能测试组件
 * 用于测试和展示 AI 任务创建的性能
 */
export function AIPerformanceTest() {
  const [isTestingBefore, setIsTestingBefore] = useState(false);
  const [isTestingAfter, setIsTestingAfter] = useState(false);
  const [results, setResults] = useState<{
    before?: number;
    after?: number;
  }>({});

  const testTasks = [
    "完成项目报告",
    "健身30分钟",
    "学习新技能",
    "整理房间",
    "阅读一本书"
  ];

  const runPerformanceTest = async () => {
    const times: number[] = [];
    
    for (const task of testTasks) {
      const start = performance.now();
      
      try {
        await apiRequest("POST", "/api/tasks/intelligent-create", {
          description: task
        });
      } catch (error) {
        console.error("Test failed:", error);
      }
      
      const duration = performance.now() - start;
      times.push(duration);
      
      // 延迟避免频率限制
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // 返回平均时间
    return times.reduce((a, b) => a + b, 0) / times.length;
  };

  const handleTestBefore = async () => {
    setIsTestingBefore(true);
    try {
      const avgTime = await runPerformanceTest();
      setResults(prev => ({ ...prev, before: avgTime }));
    } finally {
      setIsTestingBefore(false);
    }
  };

  const handleTestAfter = async () => {
    setIsTestingAfter(true);
    try {
      const avgTime = await runPerformanceTest();
      setResults(prev => ({ ...prev, after: avgTime }));
    } finally {
      setIsTestingAfter(false);
    }
  };

  const improvement = results.before && results.after
    ? ((results.before - results.after) / results.before * 100).toFixed(1)
    : null;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          AI 性能测试工具
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          测试 AI 任务创建的响应速度，对比优化前后的性能提升
        </p>

        <div className="grid grid-cols-2 gap-4">
          {/* 优化前测试 */}
          <div className="space-y-2">
            <Button
              onClick={handleTestBefore}
              disabled={isTestingBefore || isTestingAfter}
              variant="outline"
              className="w-full"
            >
              {isTestingBefore ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  测试中...
                </>
              ) : (
                "测试优化前速度"
              )}
            </Button>
            
            {results.before && (
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {(results.before / 1000).toFixed(2)}s
                </div>
                <div className="text-xs text-muted-foreground">平均响应时间</div>
              </div>
            )}
          </div>

          {/* 优化后测试 */}
          <div className="space-y-2">
            <Button
              onClick={handleTestAfter}
              disabled={isTestingBefore || isTestingAfter}
              variant="outline"
              className="w-full"
            >
              {isTestingAfter ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  测试中...
                </>
              ) : (
                "测试优化后速度"
              )}
            </Button>
            
            {results.after && (
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {(results.after / 1000).toFixed(2)}s
                </div>
                <div className="text-xs text-muted-foreground">平均响应时间</div>
              </div>
            )}
          </div>
        </div>

        {/* 性能提升结果 */}
        {improvement && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
            <BarChart className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <div className="text-3xl font-bold text-green-600">
              提升 {improvement}%
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              响应时间减少了 {((results.before! - results.after!) / 1000).toFixed(2)} 秒
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p>* 测试将创建 5 个示例任务</p>
          <p>* 实际性能可能因网络状况而异</p>
          <p>* 建议在相同网络环境下对比测试</p>
        </div>
      </CardContent>
    </Card>
  );
}