# Railway Environment Variable Setup

## 必需的环境变量

在 Railway 项目设置中，需要添加以下环境变量：

### 1. DATABASE_URL
- **说明**: PostgreSQL 数据库连接字符串
- **格式**: `postgresql://user:password@host:port/database`
- **示例**: `postgresql://postgres:password@db.railway.internal:5432/railway`

### 2. OPENAI_API_KEY
- **说明**: OpenAI API 密钥，用于 AI 功能
- **获取方式**: https://platform.openai.com/api-keys
- **格式**: `sk-...`

### 3. JWT_SECRET
- **说明**: JWT 令牌签名密钥
- **生成方式**: 使用随机字符串生成器或运行 `openssl rand -base64 32`
- **示例**: `your-super-secret-jwt-key-here`

## 可选的环境变量

### 4. REPLIT_CLIENT_ID (可选)
- **说明**: Replit OAuth 客户端 ID
- **用途**: 用户认证（如果不使用 Replit 认证可以忽略）

### 5. REPLIT_CLIENT_SECRET (可选)
- **说明**: Replit OAuth 客户端密钥
- **用途**: 用户认证（如果不使用 Replit 认证可以忽略）

## 在 Railway 中设置环境变量

1. 登录 Railway 控制台
2. 进入你的项目
3. 点击 "Variables" 标签
4. 点击 "New Variable"
5. 添加每个环境变量：
   - 变量名：例如 `DATABASE_URL`
   - 值：对应的值

## 验证部署

部署完成后，访问以下端点检查状态：
- `https://your-app.railway.app/api/health` - 检查服务器状态和环境变量
- `https://your-app.railway.app/api/security/status` - 检查安全配置

## 故障排除

如果网站无法访问：
1. 检查 Railway 日志中的错误信息
2. 确认所有必需的环境变量都已设置
3. 访问 /api/health 端点查看具体缺少哪些配置