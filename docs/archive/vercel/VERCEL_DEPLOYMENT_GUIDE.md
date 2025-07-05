# Vercel部署配置指南

## 🚨 紧急修复：环境变量配置

您的应用在Vercel上出现500错误，是因为环境变量没有正确配置。请立即按以下步骤操作：

### 1. 登录Vercel控制台

1. 访问 [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. 找到您的 `levelupsolo` 项目
3. 点击进入项目页面

### 2. 配置环境变量

在项目页面中：

1. 点击 **Settings** 标签
2. 在左侧菜单中点击 **Environment Variables**
3. 添加以下环境变量：

#### 必需的环境变量：

**DATABASE_URL**
```
postgresql://postgres:zbrGHpuON0CNfZBt@db.ooepnnsbmtyrcqlqykkr.supabase.co:5432/postgres
```

**OPENAI_API_KEY**
```
[您的OpenAI API密钥 - 请从.env文件复制]
```

**SESSION_SECRET**
```
level-up-solo-secret-2024-production
```

**JWT_SECRET**
```
jwt-secret-for-level-up-solo-2024
```

#### 配置步骤：

1. 点击 **Add New** 按钮
2. 在 **Name** 字段输入变量名（如 `DATABASE_URL`）
3. 在 **Value** 字段输入对应的值
4. 确保 **Environment** 选择 **Production**, **Preview**, 和 **Development** 都勾选
5. 点击 **Save**
6. 重复以上步骤添加所有4个环境变量

### 3. 重新部署

配置完环境变量后：

1. 在项目页面点击 **Deployments** 标签
2. 找到最新的部署记录
3. 点击右侧的三个点菜单
4. 选择 **Redeploy**
5. 等待重新部署完成

### 4. 验证修复

重新部署完成后：

1. 访问您的网站：https://www.levelupsolo.net
2. 尝试登录并创建任务
3. 检查是否还有500错误

## 故障排除

### 如果仍然有错误：

1. **检查数据库连接**
   - 确保Supabase数据库正在运行
   - 验证数据库密码是否正确

2. **检查API密钥**
   - 确保OpenAI API密钥有效且有额度
   - 检查密钥是否正确复制（没有多余空格）

3. **查看部署日志**
   - 在Vercel控制台的 **Functions** 标签下查看错误日志
   - 查找具体的错误信息

### 常见问题：

**Q: 环境变量设置后还是不生效？**
A: 必须重新部署才能应用新的环境变量。

**Q: 数据库连接失败？**
A: 检查DATABASE_URL是否完全正确，包括密码部分。

**Q: OpenAI API调用失败？**
A: 检查API密钥是否有效，是否有足够的使用额度。

## 安全说明

✅ 所有敏感信息都通过Vercel的环境变量系统安全存储
✅ 不会在前端代码中暴露
✅ 使用HTTPS加密传输

## 下一步

配置完成并验证功能正常后，您可以：

1. 继续使用网页版应用
2. 开始iOS应用开发
3. 添加更多功能和优化

如果遇到任何问题，请提供具体的错误信息以便进一步诊断。