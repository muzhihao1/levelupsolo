import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ChevronDown, ChevronUp, Mail, FileText, Users, HelpCircle } from "lucide-react";

const contactFormSchema = z.object({
  name: z.string().min(2, "姓名至少需要2个字符"),
  email: z.string().email("请输入有效的邮箱地址"),
  subject: z.string().min(5, "主题至少需要5个字符"),
  message: z.string().min(10, "消息内容至少需要10个字符"),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

export default function Support() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema)
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/support/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast({
          title: "发送成功",
          description: "我们已收到您的消息，将尽快回复您。",
        });
        reset();
      } else {
        throw new Error("发送失败");
      }
    } catch (error) {
      toast({
        title: "发送失败",
        description: "请稍后重试或直接发送邮件至 support@levelupsolo.net",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const faqItems = [
    {
      question: "如何在不注册的情况下使用应用？",
      answer: "Level Up Solo 支持访客模式！您无需注册即可使用大部分核心功能，包括创建任务、追踪进度、使用番茄钟等。只有需要数据同步、AI功能等高级特性时才需要注册账户。"
    },
    {
      question: "注册账户有什么好处？",
      answer: "注册账户后，您可以：1) 在多设备间同步数据 2) 使用AI任务分类和建议功能 3) 数据自动备份 4) 查看详细的统计分析 5) 参与社区活动"
    },
    {
      question: "什么是能量球系统？",
      answer: "能量球代表您每天的精力单位。每天有18个能量球，每个代表15分钟的专注时间。完成任务会消耗能量球，合理分配能量球可以帮助您更好地管理时间和精力。"
    },
    {
      question: "如何删除我的账户？",
      answer: "您可以在应用设置中找到\"账户管理\"选项，选择\"删除账户\"。或者访问账户删除页面。删除请求提交后，您的数据将在30天内完全删除。在此期间，您可以随时取消删除请求。"
    },
    {
      question: "我的数据安全吗？",
      answer: "我们非常重视您的数据安全。所有数据传输都使用HTTPS加密，敏感信息采用行业标准的加密存储。我们遵守GDPR和其他隐私法规，您可以随时导出或删除您的数据。详情请查看我们的隐私政策。"
    },
    {
      question: "如何使用AI功能？",
      answer: "AI功能可以帮助您自动分类任务、分配技能点、制定目标计划。在创建任务时，AI会根据任务内容智能推荐相关技能。您也可以使用AI助手获得个性化建议和指导。"
    }
  ];

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <div className="space-y-8">
        {/* 页面标题 */}
        <div className="text-center">
          <h1 className="text-4xl font-bold">帮助与支持</h1>
          <p className="text-muted-foreground mt-2">我们随时准备为您提供帮助</p>
        </div>

        {/* 快速链接卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                使用指南
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">查看详细的功能说明和使用教程</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                社区论坛
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">与其他用户交流经验和技巧</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                联系我们
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">直接向我们的支持团队发送消息</p>
            </CardContent>
          </Card>
        </div>

        {/* FAQ 部分 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              常见问题
            </CardTitle>
            <CardDescription>
              这里是用户最常问的问题和解答
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {faqItems.map((item, index) => (
              <div key={index} className="border-b last:border-0 pb-4 last:pb-0">
                <button
                  className="w-full text-left flex justify-between items-center py-2 hover:text-primary transition-colors"
                  onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                >
                  <span className="font-medium">{item.question}</span>
                  {expandedFAQ === index ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {expandedFAQ === index && (
                  <p className="mt-2 text-muted-foreground pl-2">{item.answer}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 联系表单 */}
        <Card>
          <CardHeader>
            <CardTitle>联系支持团队</CardTitle>
            <CardDescription>
              如果您在FAQ中没有找到答案，请直接联系我们
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-2xl mx-auto">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">姓名</Label>
                    <Input
                      id="name"
                      {...register("name")}
                      placeholder="您的姓名"
                    />
                    {errors.name && (
                      <p className="text-sm text-red-500">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">邮箱</Label>
                    <Input
                      id="email"
                      type="email"
                      {...register("email")}
                      placeholder="your@email.com"
                    />
                    {errors.email && (
                      <p className="text-sm text-red-500">{errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">主题</Label>
                  <Input
                    id="subject"
                    {...register("subject")}
                    placeholder="简要描述您的问题"
                  />
                  {errors.subject && (
                    <p className="text-sm text-red-500">{errors.subject.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">消息内容</Label>
                  <Textarea
                    id="message"
                    {...register("message")}
                    placeholder="请详细描述您遇到的问题..."
                    rows={5}
                  />
                  {errors.message && (
                    <p className="text-sm text-red-500">{errors.message.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "发送中..." : "发送消息"}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        {/* 底部信息 */}
        <div className="text-center text-muted-foreground">
          <p>Level Up Solo - 让个人成长变得有趣</p>
          <p className="mt-2">© 2024 Level Up Solo. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}