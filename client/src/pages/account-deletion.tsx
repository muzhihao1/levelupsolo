import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle, CheckCircle, Info } from "lucide-react";

export default function AccountDeletion() {
  const { isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"warning" | "confirm" | "processing" | "completed">("warning");
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== "DELETE") {
      toast({
        title: "确认文本不正确",
        description: "请输入 DELETE 来确认删除账户",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    setStep("processing");

    try {
      const response = await fetch("/api/v1/users/account", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setStep("completed");
        
        // Log out after 5 seconds
        setTimeout(() => {
          logout();
          setLocation("/");
        }, 5000);
      } else {
        throw new Error("删除请求失败");
      }
    } catch (error) {
      toast({
        title: "删除失败",
        description: "账户删除请求处理失败，请稍后重试",
        variant: "destructive",
      });
      setStep("confirm");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container max-w-2xl mx-auto py-16 px-4">
        <Card>
          <CardHeader>
            <CardTitle>请先登录</CardTitle>
            <CardDescription>
              您需要登录才能删除账户
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/auth")}>
              前往登录
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-16 px-4">
      {step === "warning" && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <CardTitle className="text-red-600">删除账户警告</CardTitle>
            </div>
            <CardDescription>
              请仔细阅读以下信息，删除账户是不可逆的操作
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>删除账户将导致以下后果：</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>所有任务、目标和进度数据将被永久删除</li>
                  <li>技能等级和经验值将无法恢复</li>
                  <li>所有成就和统计数据将丢失</li>
                  <li>无法使用相同邮箱重新注册</li>
                  <li>此操作在30天后生效，期间可以取消</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>删除前建议：</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>导出您的数据备份</li>
                  <li>保存重要的任务和目标信息</li>
                  <li>确认您真的想要删除账户</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setLocation("/")}>
              取消
            </Button>
            <Button variant="destructive" onClick={() => setStep("confirm")}>
              我了解后果，继续删除
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === "confirm" && (
        <Card>
          <CardHeader>
            <CardTitle>确认删除账户</CardTitle>
            <CardDescription>
              这是最后一次确认，请输入 DELETE 来确认删除您的账户
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="confirm">
                请输入 <span className="font-mono font-bold">DELETE</span> 来确认
              </Label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="输入 DELETE"
                className="font-mono"
              />
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                账户将在30天后永久删除。在此期间，您可以通过登录来取消删除请求。
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setStep("warning")}>
              返回
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={confirmText !== "DELETE" || isDeleting}
            >
              {isDeleting ? "处理中..." : "确认删除账户"}
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === "processing" && (
        <Card>
          <CardContent className="py-16">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-lg">正在处理您的删除请求...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "completed" && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <CardTitle className="text-green-600">删除请求已提交</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>删除请求已成功提交</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>您的账户将在30天后永久删除</li>
                  <li>确认邮件已发送至您的注册邮箱</li>
                  <li>如需取消删除，请在30天内重新登录</li>
                  <li>5秒后将自动退出登录...</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}