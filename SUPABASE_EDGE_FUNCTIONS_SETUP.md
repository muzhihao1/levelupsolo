# Supabase Edge Functions 设置指南

## 1. 安装 Supabase CLI

### macOS (推荐)
```bash
# 如果你有 Homebrew
brew install supabase/tap/supabase

# 或者直接下载
curl -L -o supabase.zip https://github.com/supabase/cli/releases/download/v1.123.0/supabase_darwin_arm64.zip
unzip supabase.zip
sudo mv supabase /usr/local/bin/
```

### 验证安装
```bash
supabase --version
```

## 2. 初始化 Supabase 项目

```bash
cd "/Users/liasiloam/Library/CloudStorage/Dropbox/个人项目/！AI项目/level up solo/levelupsolo"
supabase init
```

## 3. 登录到 Supabase

```bash
supabase login
```

这会打开浏览器，生成一个访问令牌。

## 4. 链接到你的项目

```bash
supabase link --project-ref ooepnnsbmtyrcqlqykkr
```

## 5. 创建 Edge Functions

我们需要创建以下函数来替代 Express API：

- `auth` - 处理认证（登录、注册、Token 刷新）
- `tasks` - 任务管理
- `goals` - 目标管理
- `skills` - 技能管理
- `ai` - AI 功能（任务创建、目标规划）

## 6. 部署函数

```bash
supabase functions deploy auth
supabase functions deploy tasks
supabase functions deploy goals
supabase functions deploy skills
supabase functions deploy ai
```

## 7. 设置环境变量

在 Supabase Dashboard 中设置：
1. 进入项目设置
2. Edge Functions → Secrets
3. 添加以下变量：
   - OPENAI_API_KEY
   - JWT_SECRET
   - JWT_REFRESH_SECRET

## 8. 更新前端 API 调用

将所有 API 调用从：
```javascript
fetch('/api/tasks')
```

改为：
```javascript
fetch('https://ooepnnsbmtyrcqlqykkr.supabase.co/functions/v1/tasks')
```

## 9. CORS 配置

Edge Functions 默认支持 CORS，但你可以在函数中自定义：

```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://levelupsolo.net',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```