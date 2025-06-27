import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import OpenAI from 'openai';

// 设置 CORS
function setCORS(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCORS(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // 从 Authorization header 获取 token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "未授权" });
    }
    
    const token = authHeader.substring(7);
    
    // 验证 token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'demo-secret') as any;
    
    const { context } = req.body;

    // Demo 用户 - 返回预设建议
    if (decoded.userId === 'demo_user') {
      const demoSuggestions = [
        "• 创建您的第一个技能，开始追踪进度",
        "• 设定一个小目标，比如每天阅读30分钟",
        "• 完成一些简单的任务来熟悉系统",
        "• 尝试使用番茄钟来提高专注力"
      ];
      
      return res.json({
        suggestions: demoSuggestions,
        timestamp: new Date().toISOString()
      });
    }

    // 真实用户 - 使用 OpenAI
    if (!process.env.OPENAI_API_KEY) {
      // 如果没有 OpenAI API，返回通用建议
      const genericSuggestions = [
        "• 查看您的待办任务，优先完成重要的任务",
        "• 为您的目标设定具体的里程碑",
        "• 保持每日打卡习惯，建立良好的节奏",
        "• 定期回顾和调整您的计划"
      ];
      
      return res.json({
        suggestions: genericSuggestions,
        timestamp: new Date().toISOString()
      });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    let prompt = `你是一个专业的个人成长AI助手。基于用户当前的情况，提供3-5个具体、可执行的建议。

用户情况分析:`;

    if (context?.goals && context.goals.length > 0) {
      const activeGoals = context.goals.filter((goal: any) => !goal.completed);
      prompt += `
目标状态: 有 ${activeGoals.length} 个活跃目标
${activeGoals.map((goal: any) => `- ${goal.title} (完成度: ${Math.round((goal.progress || 0) * 100)}%)`).join('\n')}`;
    } else {
      prompt += `
目标状态: 暂无活跃目标`;
    }

    if (context?.skills && context.skills.length > 0) {
      const skillLevels = context.skills.map((skill: any) => ({ name: skill.name, level: skill.level }));
      prompt += `

技能等级: ${skillLevels.map((s: any) => `${s.name}(Lv.${s.level})`).join(', ')}`;
    }

    if (context?.tasks && context.tasks.length > 0) {
      const activeTasks = context.tasks.filter((task: any) => !task.completed);
      prompt += `

待完成任务数: ${activeTasks.length}个`;
    }

    prompt += `

请提供具体的建议，包括:
1. 基于当前进度的任务优化建议
2. 技能发展的下一步行动
3. 目标推进的策略建议
4. 时间管理和效率提升建议

每个建议要简洁明了，可直接执行。用"•"开头列出建议。`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 400,
      temperature: 0.8,
    });

    const suggestions = response.choices[0].message.content
      ?.split('\n')
      .filter(line => line.trim().startsWith('•'))
      .map(line => line.trim()) || [];

    res.json({
      suggestions,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("AI Suggestions error:", error);
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "无效的令牌" });
    }
    res.status(500).json({ 
      error: "AI建议服务暂时不可用",
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : String(error) : undefined
    });
  }
}