# Level Up Solo 服务器迁移方案

## 推荐方案对比

### 方案一：Vercel + Supabase（推荐） ⭐⭐⭐⭐⭐

**优势：**
- **Vercel**：免费套餐足够使用，自动部署，全球 CDN
- **Supabase**：PostgreSQL 托管服务，免费套餐提供 500MB 存储
- **总成本**：完全免费（初期）
- **部署简单**：GitHub 集成，推送即部署

**劣势：**
- Vercel 不适合长连接（WebSocket）
- 需要分离前后端部署

### 方案二：Railway ⭐⭐⭐⭐

**优势：**
- 一站式部署（前端+后端+数据库）
- 支持 WebSocket
- $5/月信用额度
- 部署简单

**劣势：**
- 免费额度有限
- 需要信用卡验证

### 方案三：Render ⭐⭐⭐⭐

**优势：**
- 免费套餐支持 Web 服务
- PostgreSQL 免费 90 天
- 自动部署
- 支持后台任务

**劣势：**
- 免费实例会休眠（类似 Replit）
- 数据库 90 天后需付费

### 方案四：DigitalOcean App Platform ⭐⭐⭐

**优势：**
- 稳定可靠
- 完整的 PaaS 服务
- 良好的文档

**劣势：**
- 最低 $5/月起
- 没有免费套餐

## 推荐实施方案：Vercel + Supabase

### 为什么选择这个方案？

1. **成本最优**：完全免费开始，随着用户增长再升级
2. **性能最佳**：Vercel 全球 CDN，Supabase 不会休眠
3. **开发友好**：都有良好的开发体验和文档
4. **扩展性好**：未来可以轻松迁移或升级

## 迁移步骤

### 第一步：准备 Supabase 数据库

1. **创建 Supabase 账号**
   - 访问 https://supabase.com
   - 使用 GitHub 账号注册
   - 创建新项目（选择离你最近的区域）

2. **获取数据库连接信息**
   - 进入项目设置 → Database
   - 复制 Connection String (URI)
   - 保存密码（只显示一次）

3. **迁移数据库结构**
   ```bash
   # 1. 导出现有数据库结构
   pg_dump --schema-only DATABASE_URL > schema.sql
   
   # 2. 导入到 Supabase
   psql SUPABASE_DATABASE_URL < schema.sql
   ```

### 第二步：改造项目结构

1. **分离前后端代码**
   ```
   levelupsolo/
   ├── apps/
   │   ├── web/          # React 前端
   │   ├── api/          # Express API
   │   └── mobile/       # React Native
   ├── packages/
   │   └── shared/       # 共享代码
   └── package.json      # Monorepo 配置
   ```

2. **配置 Monorepo**
   ```json
   // package.json
   {
     "name": "levelupsolo",
     "private": true,
     "workspaces": [
       "apps/*",
       "packages/*"
     ],
     "scripts": {
       "dev:web": "npm run dev -w apps/web",
       "dev:api": "npm run dev -w apps/api",
       "dev:mobile": "npm run dev -w apps/mobile",
       "build": "npm run build -w apps/web && npm run build -w apps/api"
     }
   }
   ```

### 第三步：配置 Vercel 部署

1. **安装 Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **部署 API**
   ```bash
   cd apps/api
   vercel --prod
   ```

3. **部署前端**
   ```bash
   cd apps/web
   vercel --prod
   ```

### 第四步：更新环境变量

1. **Supabase 连接**
   ```env
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
   SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
   ```

2. **Vercel 环境变量**
   - 在 Vercel Dashboard 添加所有环境变量
   - 包括 OpenAI API Key、JWT Secret 等

## 数据迁移脚本

```typescript
// migrate-data.ts
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const OLD_DB_URL = process.env.OLD_DATABASE_URL;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

async function migrateData() {
  // 连接旧数据库
  const oldDb = new pg.Client({ connectionString: OLD_DB_URL });
  await oldDb.connect();
  
  // 连接 Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  // 迁移用户数据
  const users = await oldDb.query('SELECT * FROM users');
  for (const user of users.rows) {
    await supabase.from('users').insert(user);
  }
  
  // 迁移其他表...
  
  console.log('Migration completed!');
}

migrateData().catch(console.error);
```

## 注意事项

1. **数据备份**：迁移前必须完整备份
2. **逐步迁移**：先迁移开发环境测试
3. **回滚计划**：准备好快速回滚方案
4. **监控设置**：配置错误监控和性能监控

## 成本预估

### 初期（0-1000 用户）
- Vercel: $0（免费套餐）
- Supabase: $0（免费套餐）
- 总计: $0/月

### 成长期（1000-10000 用户）
- Vercel Pro: $20/月
- Supabase Pro: $25/月
- 总计: $45/月

### 扩展期（10000+ 用户）
- Vercel Enterprise: 定制价格
- Supabase Team: $599/月起
- 或迁移到自建服务器