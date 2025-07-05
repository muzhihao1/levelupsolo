# Code Quality Check Tool

## 概述
Code Quality Check Tool 是一个综合性的代码质量分析工具，用于检测代码复杂度、重复代码、代码规范等问题。它可以帮助团队维护高质量的代码库。

## 功能特点

### 🔍 6 种质量检查
1. **Complexity（复杂度）** - 分析函数的圈复杂度
2. **Duplicate（重复代码）** - 检测相似的代码块
3. **Size（文件大小）** - 识别过大的文件
4. **Length（函数长度）** - 找出过长的函数
5. **TODO（待办事项）** - 追踪 TODO/FIXME 标记
6. **Import（导入分析）** - 检测潜在的循环依赖

### 📊 多种输出格式
- **Console** - 终端友好的文本报告
- **JSON** - 机器可读的结构化数据
- **HTML** - 可视化的网页报告

### ⚙️ 高度可配置
- 可自定义复杂度阈值
- 可调整文件和函数大小限制
- 可配置重复代码检测敏感度
- 支持自定义文件包含/排除规则

## 使用方法

### 基础使用
```bash
# 运行默认质量检查
npm run quality:check

# 生成 HTML 报告
npm run quality:report

# 严格模式检查
npm run quality:strict
```

### 直接运行
```bash
# 基础分析
tsx tools/code-quality-checker.ts

# 自定义复杂度阈值
tsx tools/code-quality-checker.ts --complexity 5

# 生成 HTML 报告
tsx tools/code-quality-checker.ts --html quality-report.html

# 生成 JSON 报告
tsx tools/code-quality-checker.ts --json quality-report.json
```

### 命令行选项
```
Options:
  -c, --complexity <n>        最大圈复杂度（默认：10）
  -f, --file-lines <n>        最大文件行数（默认：300）
  -l, --function-lines <n>    最大函数行数（默认：50）
  -d, --min-duplicate <n>     最小重复行数（默认：6）
  --no-todos                  禁用 TODO/FIXME 检测
  --no-imports                禁用导入分析
  --include <patterns>        包含的文件模式（逗号分隔）
  --exclude <patterns>        排除的文件模式（逗号分隔）
  --json [file]               输出 JSON 报告
  --html [file]               输出 HTML 报告
  -h, --help                  显示帮助信息
```

## 质量标准说明

### 复杂度（Cyclomatic Complexity）
- **1-5**: 简单，易于理解和测试
- **6-10**: 中等复杂度，可能需要重构
- **11-20**: 复杂，建议拆分
- **20+**: 高度复杂，必须重构

### 文件大小
- **< 100 行**: 理想大小
- **100-300 行**: 可接受
- **300-500 行**: 考虑拆分
- **500+ 行**: 建议重构

### 函数长度
- **< 20 行**: 理想长度
- **20-50 行**: 可接受
- **50-100 行**: 考虑拆分
- **100+ 行**: 必须重构

### 重复代码
- **6-10 行**: 轻微重复
- **10-20 行**: 中度重复
- **20+ 行**: 严重重复

## 报告解读

### Console 输出示例
```
📊 Code Quality Report
============================================================
Generated: 2024-01-01 12:00:00

📈 Summary:
  Total Files: 150
  Total Lines: 25,000
  Total Issues: 45
  Average Complexity: 4.5
  Duplicate Blocks: 8

🚦 Issues by Severity:
  ❌ error: 5
  ⚠️ warning: 30
  ℹ️ info: 10

📋 Issues by Type:
  complexity: 15
  duplicate: 8
  size: 5
  length: 7
  todo: 10

🔍 Top Issues:
1. ⚠️ [COMPLEXITY] server/routes.ts:125
   Function has cyclomatic complexity of 15 (max: 10)
...
```

### HTML 报告特点
- 交互式图表和统计
- 问题分类和排序
- 文件级别的详细分析
- 重复代码可视化
- 改进建议

### JSON 报告结构
```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "summary": {
    "totalFiles": 150,
    "totalLines": 25000,
    "totalIssues": 45,
    "issuesBySeverity": {
      "error": 5,
      "warning": 30,
      "info": 10
    },
    "issuesByType": {
      "complexity": 15,
      "duplicate": 8,
      "size": 5,
      "length": 7,
      "todo": 10
    },
    "averageComplexity": 4.5,
    "duplicateBlocks": 8
  },
  "files": [...],
  "duplicates": [...],
  "topIssues": [...]
}
```

## 集成到 CI/CD

### GitHub Actions 示例
```yaml
- name: Run Code Quality Check
  run: npm run quality:check
  
- name: Generate Quality Report
  if: always()
  run: npm run quality:report
  
- name: Upload Quality Report
  uses: actions/upload-artifact@v3
  with:
    name: quality-report
    path: quality-report.html
```

### 作为 Git Hook
```bash
# .git/hooks/pre-commit
#!/bin/sh
npm run quality:check
```

## 配置文件支持

创建 `.code-quality.json` 配置文件：
```json
{
  "maxComplexity": 8,
  "maxFileLines": 250,
  "maxFunctionLines": 40,
  "minDuplicateLines": 5,
  "include": ["src/**/*.ts", "client/**/*.tsx"],
  "exclude": ["**/*.test.ts", "**/*.spec.ts"],
  "checkTodos": true,
  "checkImports": true
}
```

## 最佳实践

### 1. 定期运行
- 每次提交前运行检查
- 在 CI/CD 中自动运行
- 定期生成报告追踪趋势

### 2. 渐进式改进
- 先修复错误级别的问题
- 逐步降低复杂度阈值
- 持续减少重复代码

### 3. 团队标准
- 制定团队的质量标准
- 在代码审查中参考报告
- 将质量指标纳入 KPI

## 常见问题

### Q: 如何忽略特定文件？
A: 使用 `--exclude` 选项或在配置文件中设置 `exclude` 数组。

### Q: 复杂度分析不准确？
A: TypeScript 的复杂度计算基于 AST，某些模式可能被误判。可以重构代码或调整阈值。

### Q: 重复代码误报太多？
A: 增加 `--min-duplicate` 值，或排除测试文件和生成的代码。

### Q: 如何处理大型代码库？
A: 使用 `--include` 选项分批分析，或提高各项阈值逐步改进。

## 改进建议

根据分析结果，工具会提供以下类型的建议：

1. **复杂度优化**
   - 拆分复杂函数
   - 使用早返回减少嵌套
   - 提取辅助函数

2. **重复代码消除**
   - 提取公共函数
   - 创建共享模块
   - 使用继承或组合

3. **文件组织**
   - 拆分大文件
   - 按功能模块化
   - 改善文件命名

4. **技术债务管理**
   - 优先处理 TODO 项
   - 定期清理死代码
   - 更新过时的模式

## 未来计划

### v2.0 功能
- [ ] 增量分析模式
- [ ] 代码味道检测
- [ ] 安全漏洞扫描
- [ ] 性能反模式检测
- [ ] 自定义规则支持

### v3.0 功能
- [ ] AI 驱动的重构建议
- [ ] 代码质量趋势分析
- [ ] 团队质量仪表板
- [ ] IDE 插件集成
- [ ] 自动修复功能

## 相关工具

- **ESLint**: 代码风格和错误检查
- **TypeScript**: 类型检查
- **Health Dashboard**: 项目健康监控
- **Cross-platform Validator**: 跨平台兼容性检查

---

💡 **提示**: 代码质量是一个持续改进的过程。使用此工具定期评估和改进代码质量，可以显著提高项目的可维护性和稳定性。