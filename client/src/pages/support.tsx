import { useState } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Mail, MessageSquare, FileText, Shield, BookOpen, ExternalLink } from "lucide-react";

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export default function Support() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ContactFormData>();

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
          title: "消息已发送",
          description: "我们已收到您的消息，将在24-48小时内回复。",
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

  const faqs = [
    {
      question: "如何开始使用 Level Up Solo？",
      answer: "您可以直接下载iOS应用或访问网页版开始使用。应用支持访客模式，无需注册即可体验核心功能，包括任务管理、技能追踪等。如果需要数据同步和AI功能，可以选择创建账户。"
    },
    {
      question: "哪些功能需要注册账户？",
      answer: "大部分核心功能都可以在访客模式下使用，包括：创建任务、设定目标、追踪技能进度、使用番茄钟等。需要账户的功能包括：跨设备数据同步、AI任务分类、数据导出、高级统计分析。"
    },
    {
      question: "如何同步我的数据？",
      answer: "创建账户后，您的数据将自动在所有设备间同步。支持iOS应用和网页版之间的实时同步。如果您之前使用访客模式，创建账户后可以选择将本地数据迁移到云端。"
    },
    {
      question: "技能系统如何工作？",
      answer: "Level Up Solo包含六大核心技能：意志力、体能、情感、财务、人际和智力。完成相关任务可以获得对应技能的经验值，提升技能等级。每个技能都有独特的成长曲线和奖励系统。"
    },
    {
      question: "什么是能量球系统？",
      answer: "能量球代表您每天的精力单位。每天有18个能量球，每个代表15分钟的专注时间。完成任务会消耗能量球，合理分配能量球可以帮助您更好地管理时间和精力。"
    },
    {
      question: "如何删除我的账户？",
      answer: "您可以在应用设置中找到"账户管理"选项，选择"删除账户"。或者访问 <a href='/account-deletion' class='text-primary hover:underline'>账户删除页面</a>。删除请求提交后，您的数据将在30天内完全删除。在此期间，您可以随时取消删除请求。"
    },
    {
      question: "我的数据安全吗？",
      answer: "我们非常重视您的数据安全。所有数据传输都使用HTTPS加密，敏感信息采用行业标准的加密存储。我们遵守GDPR和其他隐私法规，您可以随时导出或删除您的数据。详情请查看我们的<a href='/privacy-policy' class='text-primary hover:underline'>隐私政策</a>。"
    },
    {
      question: "如何使用AI功能？",
      answer: "AI功能可以帮助您自动分类任务、分配技能点、制定目标计划。在创建任务时，AI会根据任务内容智能推荐相关技能。您也可以使用AI助手获得个性化建议和指导。"
    }
  ];

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Level Up Solo 用户支持</h1>
          <p className="text-lg text-muted-foreground">
            我们致力于为您提供最好的使用体验
          </p>
        </div>

        {/* 快速链接 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="text-center">
              <BookOpen className="w-8 h-8 mx-auto mb-2 text-primary" />
              <CardTitle className="text-lg">使用指南</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                快速了解如何使用应用的各项功能
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="text-center">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-primary" />
              <CardTitle className="text-lg">常见问题</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                查看用户最常问的问题和解答
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="text-center">
              <Shield className="w-8 h-8 mx-auto mb-2 text-primary" />
              <CardTitle className="text-lg">隐私安全</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                了解我们如何保护您的数据
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="text-center">
              <Mail className="w-8 h-8 mx-auto mb-2 text-primary" />
              <CardTitle className="text-lg">联系我们</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                直接联系我们的支持团队
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 常见问题 */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl">常见问题</CardTitle>
            <CardDescription>
              以下是用户最常咨询的问题，点击查看答案
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div 
                      className="text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: faq.answer }}
                    />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* 联系表单 */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl">联系我们</CardTitle>
            <CardDescription>
              如果您没有找到需要的答案，请通过以下方式联系我们
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* 联系信息 */}
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">直接联系</h3>
                  <div className="space-y-2 text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      support@levelupsolo.net
                    </p>
                    <p>响应时间：24-48小时</p>
                    <p>工作时间：周一至周五 9:00-18:00 (UTC+8)</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">其他资源</h3>
                  <div className="space-y-2">
                    <a href="/privacy-policy" className="flex items-center gap-2 text-primary hover:underline">
                      <FileText className="w-4 h-4" />
                      隐私政策
                    </a>
                    <a href="/terms-of-service" className="flex items-center gap-2 text-primary hover:underline">
                      <FileText className="w-4 h-4" />
                      服务条款
                    </a>
                    <a href="/account-deletion" className="flex items-center gap-2 text-primary hover:underline">
                      <Shield className="w-4 h-4" />
                      删除账户
                    </a>
                  </div>
                </div>
              </div>

              {/* 联系表单 */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="name">姓名</Label>
                  <Input
                    id="name"
                    {...register("name", { required: "请输入您的姓名" })}
                    placeholder="您的姓名"
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">邮箱</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email", { 
                      required: "请输入您的邮箱",
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "请输入有效的邮箱地址"
                      }
                    })}
                    placeholder="your@email.com"
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="subject">问题类型</Label>
                  <Select onValueChange={(value) => register("subject").onChange({ target: { value } })}>
                    <SelectTrigger>
                      <SelectValue placeholder="请选择问题类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technical">技术问题</SelectItem>
                      <SelectItem value="account">账户问题</SelectItem>
                      <SelectItem value="feature">功能建议</SelectItem>
                      <SelectItem value="bug">错误报告</SelectItem>
                      <SelectItem value="other">其他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="message">详细描述</Label>
                  <Textarea
                    id="message"
                    {...register("message", { 
                      required: "请描述您的问题",
                      minLength: {
                        value: 10,
                        message: "请至少输入10个字符"
                      }
                    })}
                    placeholder="请详细描述您遇到的问题或建议..."
                    rows={5}
                  />
                  {errors.message && (
                    <p className="text-sm text-red-500 mt-1">{errors.message.message}</p>
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