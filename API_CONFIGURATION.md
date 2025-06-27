# API配置说明

## OpenAI API Key配置

Level Up Solo使用OpenAI API来提供智能任务分析和创建功能。如果您想启用这些AI功能，需要配置OpenAI API Key。

### 获取OpenAI API Key

1. 访问 [OpenAI Platform](https://platform.openai.com/)
2. 注册或登录您的账户
3. 导航到 API Keys 页面
4. 创建新的API Key
5. 复制生成的Key（请妥善保管，只会显示一次）

### 配置API Key

1. 打开项目根目录下的 `.env` 文件
2. 找到 `OPENAI_API_KEY=` 这一行
3. 在等号后面粘贴您的API Key：
   ```
   OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
4. 保存文件
5. 重启开发服务器

### 功能说明

配置OpenAI API Key后，您可以使用以下AI功能：

- **智能任务分析**：自动判断任务类型（习惯/待办）
- **难度评估**：根据任务内容智能评估难度
- **技能分配**：自动为任务分配相关技能
- **能量球计算**：智能计算任务所需的能量球数量

### 无API Key运行

如果您不想使用AI功能，应用仍然可以正常运行：

- 任务创建将使用简单的规则判断
- 包含"每天"、"坚持"、"养成"等关键词的任务会被识别为习惯
- 其他任务默认为待办事项
- 难度根据任务描述长度简单判断

### 注意事项

- OpenAI API使用需要付费，请注意您的使用额度
- API Key是敏感信息，请勿提交到版本控制系统
- 生产环境中，请使用环境变量管理API Key