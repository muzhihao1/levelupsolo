import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function PrivacyPolicy() {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold">隐私政策</CardTitle>
          <p className="text-muted-foreground">最后更新：2024年12月</p>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-6">
              <section>
                <h2 className="text-xl font-semibold mb-3">1. 概述</h2>
                <p className="text-muted-foreground">
                  Level Up Solo（以下简称"我们"）非常重视您的隐私。本隐私政策说明了我们如何收集、使用、存储和保护您的个人信息。
                  使用我们的服务即表示您同意本隐私政策中描述的做法。
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">2. 访客模式和注册用户</h2>
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold">2.1 访客模式</h3>
                    <p className="text-muted-foreground">
                      我们提供访客模式，让您无需注册即可使用大部分核心功能：
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground mt-2">
                      <li>创建和管理任务</li>
                      <li>追踪技能进度</li>
                      <li>使用番茄钟功能</li>
                      <li>查看基础统计</li>
                    </ul>
                    <p className="text-muted-foreground mt-2">
                      访客模式下的所有数据仅存储在您的设备本地，我们不会收集任何个人信息。
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold">2.2 注册用户</h3>
                    <p className="text-muted-foreground">
                      创建账户后，您可以享受以下额外功能：
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground mt-2">
                      <li>跨设备数据同步</li>
                      <li>AI任务分类和建议</li>
                      <li>数据备份和恢复</li>
                      <li>高级统计分析</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">3. 我们收集的信息</h2>
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold">3.1 您提供的信息</h3>
                    <ul className="list-disc list-inside text-muted-foreground">
                      <li>账户信息：邮箱、用户名、密码（加密存储）</li>
                      <li>个人资料：姓名、年龄、职业（可选）</li>
                      <li>使用数据：任务、目标、技能进度</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold">3.2 自动收集的信息</h3>
                    <ul className="list-disc list-inside text-muted-foreground">
                      <li>设备信息：操作系统、浏览器类型</li>
                      <li>使用统计：功能使用频率、会话时长</li>
                      <li>错误日志：应用崩溃和错误信息</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">4. 信息使用方式</h2>
                <p className="text-muted-foreground">我们使用收集的信息用于：</p>
                <ul className="list-disc list-inside text-muted-foreground mt-2">
                  <li>提供和改进我们的服务</li>
                  <li>个性化您的使用体验</li>
                  <li>发送服务相关通知</li>
                  <li>防止欺诈和滥用</li>
                  <li>遵守法律义务</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">5. 数据存储和安全</h2>
                <div className="space-y-3">
                  <p className="text-muted-foreground">
                    我们采用行业标准的安全措施保护您的数据：
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground">
                    <li>使用HTTPS加密所有数据传输</li>
                    <li>密码采用bcrypt加密存储</li>
                    <li>定期安全审计和更新</li>
                    <li>限制员工访问用户数据</li>
                  </ul>
                  <p className="text-muted-foreground mt-2">
                    数据存储在安全的云服务器上，并定期备份。
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">6. 数据共享</h2>
                <p className="text-muted-foreground">
                  我们不会出售、交易或以其他方式向第三方转让您的个人信息，除非：
                </p>
                <ul className="list-disc list-inside text-muted-foreground mt-2">
                  <li>获得您的明确同意</li>
                  <li>遵守法律要求或法院命令</li>
                  <li>保护我们的权利、财产或安全</li>
                  <li>与可信的服务提供商合作（如云存储服务）</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">7. 您的权利</h2>
                <p className="text-muted-foreground">您对您的个人数据拥有以下权利：</p>
                <ul className="list-disc list-inside text-muted-foreground mt-2">
                  <li><strong>访问权</strong>：您可以请求访问我们持有的关于您的数据</li>
                  <li><strong>更正权</strong>：您可以更正不准确的个人信息</li>
                  <li><strong>删除权</strong>：您可以请求删除您的账户和所有相关数据</li>
                  <li><strong>导出权</strong>：您可以导出您的数据副本</li>
                  <li><strong>限制处理权</strong>：您可以限制我们处理您数据的方式</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">8. 账户删除</h2>
                <div className="space-y-3">
                  <p className="text-muted-foreground">
                    您可以随时删除您的账户。删除账户的方式：
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground">
                    <li>在应用设置中选择"删除账户"</li>
                    <li>访问 <a href="/account-deletion" className="text-primary hover:underline">账户删除页面</a></li>
                    <li>联系客服申请删除</li>
                  </ul>
                  <p className="text-muted-foreground mt-2">
                    删除请求提交后，您的账户将在30天后永久删除。在此期间，您可以通过重新登录来取消删除请求。
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">9. 儿童隐私</h2>
                <p className="text-muted-foreground">
                  我们的服务不面向13岁以下的儿童。我们不会故意收集13岁以下儿童的个人信息。
                  如果您发现您的孩子向我们提供了个人信息，请联系我们。
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">10. 隐私政策更新</h2>
                <p className="text-muted-foreground">
                  我们可能会不时更新本隐私政策。更新后的政策将在本页面发布，并更新"最后更新"日期。
                  重大更改时，我们会通过邮件或应用内通知告知您。
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">11. 联系我们</h2>
                <p className="text-muted-foreground">
                  如果您对本隐私政策有任何疑问或concerns，请通过以下方式联系我们：
                </p>
                <ul className="list-disc list-inside text-muted-foreground mt-2">
                  <li>邮箱：support@levelupsolo.net</li>
                  <li>支持页面：<a href="/support" className="text-primary hover:underline">用户支持</a></li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">12. 法律合规</h2>
                <p className="text-muted-foreground">
                  本隐私政策符合以下法规要求：
                </p>
                <ul className="list-disc list-inside text-muted-foreground mt-2">
                  <li>欧盟通用数据保护条例（GDPR）</li>
                  <li>加州消费者隐私法案（CCPA）</li>
                  <li>其他适用的数据保护法律</li>
                </ul>
              </section>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}