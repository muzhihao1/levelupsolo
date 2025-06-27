import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function DebugUserPage() {
  const { data: userData, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  const { data: profileData, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ["/api/data", { type: "profile" }],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      const response = await fetch("/api/data?type=profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error(`Profile error: ${response.status}`);
      return response.json();
    },
  });

  const { data: tasksData, isLoading: tasksLoading, error: tasksError } = useQuery({
    queryKey: ["/api/data", { type: "tasks" }],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      const response = await fetch("/api/data?type=tasks", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error(`Tasks error: ${response.status}`);
      return response.json();
    },
  });

  const { data: skillsData, isLoading: skillsLoading, error: skillsError } = useQuery({
    queryKey: ["/api/data", { type: "skills" }],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      const response = await fetch("/api/data?type=skills", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error(`Skills error: ${response.status}`);
      return response.json();
    },
  });

  if (userLoading || profileLoading || tasksLoading || skillsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">用户数据调试页面</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>用户基本信息</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
            {userError ? (
              <span className="text-red-500">错误: {userError.message}</span>
            ) : (
              JSON.stringify(userData, null, 2)
            )}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>用户档案 (Profile)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
            {profileError ? (
              <span className="text-red-500">错误: {profileError.message}</span>
            ) : (
              JSON.stringify(profileData, null, 2)
            )}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>任务列表 (共 {tasksData?.length || 0} 个任务)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto max-h-96 overflow-y-auto">
            {tasksError ? (
              <span className="text-red-500">错误: {tasksError.message}</span>
            ) : (
              JSON.stringify(tasksData, null, 2)
            )}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>技能列表 (共 {skillsData?.length || 0} 个技能)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto max-h-96 overflow-y-auto">
            {skillsError ? (
              <span className="text-red-500">错误: {skillsError.message}</span>
            ) : (
              JSON.stringify(skillsData, null, 2)
            )}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>本地存储的 Token</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>Access Token:</strong> {localStorage.getItem("accessToken")?.substring(0, 50)}...</p>
            <p><strong>Refresh Token:</strong> {localStorage.getItem("refreshToken")?.substring(0, 50)}...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}