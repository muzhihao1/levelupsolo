# levelupsolo.net 域名配置指南

## 部署完成后的域名配置步骤

### 1. 在 Railway 中添加自定义域名

1. 进入 Railway Dashboard
2. 选择你的项目
3. 点击 "Settings" → "Domains"
4. 点击 "Add Custom Domain"
5. 输入 `levelupsolo.net` 和 `www.levelupsolo.net`

### 2. 配置 DNS 记录

Railway 会提供 CNAME 记录，你需要在域名注册商处配置：

#### 主域名 (levelupsolo.net)
- 类型: A
- 名称: @
- 值: Railway 提供的 IP 地址

#### WWW 子域名 (www.levelupsolo.net)
- 类型: CNAME
- 名称: www
- 值: Railway 提供的域名 (类似 xxx.up.railway.app)

#### API 子域名 (可选，推荐)
- 类型: CNAME
- 名称: api
- 值: Railway 提供的域名

### 3. SSL 证书

Railway 会自动为你的域名配置 Let's Encrypt SSL 证书，无需额外操作。

### 4. 建议的域名结构

- `levelupsolo.net` - 主网站
- `www.levelupsolo.net` - 重定向到主网站
- `api.levelupsolo.net` - API 端点（如果前后端分离）
- `app.levelupsolo.net` - iOS/Android 应用深度链接

### 5. 域名注册商配置

常见域名注册商的 DNS 配置位置：

#### Namecheap
Domain List → Manage → Advanced DNS

#### GoDaddy
My Products → DNS → Manage DNS

#### Cloudflare
选择域名 → DNS → Records

#### 阿里云/腾讯云
控制台 → 域名管理 → 解析设置

## 配置完成后

1. DNS 生效需要 5-30 分钟
2. 可以使用 `nslookup levelupsolo.net` 检查
3. Railway 会自动配置 SSL 证书
4. 建议开启 HTTPS 强制重定向

## 环境变量更新

部署后需要在 Railway 中更新：
```
VERCEL_URL=https://levelupsolo.net
```