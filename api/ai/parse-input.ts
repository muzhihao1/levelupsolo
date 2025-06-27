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
    
    const { input, context } = req.body;

    if (!input || typeof input !== 'string') {
      return res.status(400).json({ error: 'Invalid input' });
    }

    // Demo 用户 - 返回默认解析结果
    if (decoded.userId === 'demo_user') {
      const fallbackParsed = {
        type: 'task',
        category: 'side_quest',
        title: input.slice(0, 50),
        description: '基于您的输入创建的任务',
        priority: 'medium',
        estimatedDuration: 30,
        confidence: 0.8
      };
      
      return res.json({
        parsed: fallbackParsed,
        aiGenerated: false,
        timestamp: new Date().toISOString()
      });
    }

    // 真实用户 - 使用 OpenAI
    if (!process.env.OPENAI_API_KEY) {
      // 如果没有配置 OpenAI，返回默认解析
      const fallbackParsed = {
        type: 'task',
        category: 'side_quest',
        title: input.slice(0, 50),
        description: '基于您的输入创建的任务',
        priority: 'medium',
        estimatedDuration: 30,
        confidence: 0.7
      };
      
      return res.json({
        parsed: fallbackParsed,
        aiGenerated: false,
        fallback: true,
        timestamp: new Date().toISOString()
      });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `解析以下用户输入，判断这是任务、目标还是习惯，并提供结构化建议：

用户输入："${input}"

请以JSON格式返回解析结果：
{
  "type": "task|goal|habit",
  "category": "main_quest|side_quest|habit",
  "title": "建议的标题",
  "description": "建议的描述",
  "priority": "high|medium|low",
  "estimatedDuration": 数字(分钟),
  "confidence": 0.0到1.0的置信度
}

分类规则：
- main_quest: 重要的长期目标或关键任务
- side_quest: 日常任务或技能提升
- habit: 需要重复的行为习惯

请确保返回有效的JSON格式。`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "你是一个智能任务解析助手，擅长将自然语言转换为结构化的任务或目标数据。始终返回有效的JSON格式。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 300,
      temperature: 0.3
    });

    const content = response.choices[0].message.content;
    console.log('Raw AI response content:', content);
    
    if (!content) {
      return res.status(500).json({ error: 'AI解析失败' });
    }

    try {
      const parsed = JSON.parse(content);
      console.log('AI parsing successful:', { input, parsed });
      return res.json({
        parsed,
        aiGenerated: true,
        timestamp: new Date().toISOString()
      });
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError, 'Content:', content);
      
      // Fallback: create a simple parsed response if AI response is not valid JSON
      const fallbackParsed = {
        type: 'task',
        category: 'side_quest',
        title: input.slice(0, 50),
        description: '基于您的输入创建的任务',
        priority: 'medium',
        estimatedDuration: 30,
        confidence: 0.8
      };
      
      return res.json({
        parsed: fallbackParsed,
        aiGenerated: true,
        fallback: true,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error: unknown) {
    console.error("AI Input Parsing error:", error);
    
    // Always return a valid parsed response even when AI fails
    const fallbackParsed = {
      type: 'task' as const,
      category: 'side_quest' as const,
      title: req.body.input?.slice(0, 50) || '默认任务',
      description: '基于您的输入创建的任务',
      priority: 'medium' as const,
      estimatedDuration: 30,
      confidence: 0.7
    };
    
    return res.json({
      parsed: fallbackParsed,
      aiGenerated: false,
      fallback: true,
      error: 'AI服务暂时不可用，使用默认解析',
      timestamp: new Date().toISOString()
    });
  }
}