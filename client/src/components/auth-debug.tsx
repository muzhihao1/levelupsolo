import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";

export default function AuthDebug() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkAuth = async () => {
    setLoading(true);
    try {
      // 1. Check localStorage token
      const accessToken = localStorage.getItem("accessToken");
      const refreshToken = localStorage.getItem("refreshToken");
      
      // 2. Check auth debug endpoint
      const debugResponse = await fetch('/api/auth/debug');
      const debugData = await debugResponse.json();
      
      // 3. Check auth user endpoint
      let userData = null;
      let userError = null;
      try {
        const userResponse = await apiRequest('GET', '/api/auth/user');
        userData = userResponse;
      } catch (error) {
        userError = error.message;
      }
      
      // 4. Check available tasks endpoint
      let tasksData = null;
      let tasksError = null;
      try {
        const tasksResponse = await apiRequest('GET', '/api/pomodoro/available-tasks');
        tasksData = tasksResponse;
      } catch (error) {
        tasksError = error.message;
      }
      
      setDebugInfo({
        localStorage: {
          hasAccessToken: !!accessToken,
          accessTokenLength: accessToken?.length || 0,
          hasRefreshToken: !!refreshToken,
        },
        authDebug: debugData,
        authUser: {
          success: !!userData,
          data: userData,
          error: userError,
        },
        availableTasks: {
          success: !!tasksData,
          data: tasksData,
          error: tasksError,
        },
      });
    } catch (error) {
      console.error('Debug check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>认证调试信息</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={checkAuth} disabled={loading} className="mb-4">
          {loading ? "检查中..." : "检查认证状态"}
        </Button>
        
        {debugInfo && (
          <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}