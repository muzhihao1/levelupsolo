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
    
    const { message, context } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: "Message is required" });
    }

    // Demo 用户 - 返回预设回复
    if (decoded.userId === 'demo_user') {
      const demoResponses = [
        "作为演示用户，我建议您先完成一些简单的任务来熟悉系统。",
        "您可以创建一些日常任务来开始您的个人成长之旅。",
        "设定明确的目标是成功的第一步，让我们一起努力！"
      ];
      
      const randomResponse = demoResponses[Math.floor(Math.random() * demoResponses.length)];
      
      return res.json({
        response: randomResponse,
        category: 'general',
        timestamp: new Date().toISOString()
      });
    }

    // 真实用户 - 使用 OpenAI
    if (!process.env.OPENAI_API_KEY) {
      return res.json({
        response: "AI 服务暂时不可用，请稍后再试。",
        category: 'general',
        timestamp: new Date().toISOString()
      });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Build context prompt based on user data
    let contextPrompt = `你是一个专业的个人成长AI助手，帮助用户在技能发展、目标达成和任务管理方面获得成功。

用户背景信息:
- 用户ID: ${decoded.userId}`;

    if (context?.profile) {
      contextPrompt += `
- 姓名: ${context.profile.name || '未设置'}
- 年龄: ${context.profile.age || '未设置'}
- 职业: ${context.profile.occupation || '未设置'}
- 个人使命: ${context.profile.mission || '未设置'}`;
    }

    if (context?.goals && context.goals.length > 0) {
      contextPrompt += `
      
当前目标:
${context.goals.map((goal: any) => `- ${goal.title}: ${goal.description || '无描述'} (完成度: ${Math.round((goal.progress || 0) * 100)}%)`).join('\n')}`;
    }

    if (context?.skills && context.skills.length > 0) {
      contextPrompt += `

技能情况:
${context.skills.map((skill: any) => `- ${skill.name}: 等级 ${skill.level}, 经验 ${skill.exp}/${skill.maxExp}`).join('\n')}`;
    }

    if (context?.tasks && context.tasks.length > 0) {
      const activeTasks = context.tasks.filter((task: any) => !task.completed);
      if (activeTasks.length > 0) {
        contextPrompt += `

待完成任务:
${activeTasks.slice(0, 5).map((task: any) => `- ${task.title}: ${task.description || '无描述'}`).join('\n')}`;
      }
    }

    contextPrompt += `

请根据以上信息，以友好、专业、激励的语气回答用户的问题。如果提供建议或洞察，请基于用户的实际情况。回答要简洁明了，重点突出。`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: contextPrompt
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const aiResponse = response.choices[0].message.content;
    
    // Determine response category based on keywords
    let category = 'general';
    const messageContent = message.toLowerCase();
    if (messageContent.includes('建议') || messageContent.includes('推荐')) {
      category = 'suggestion';
    } else if (messageContent.includes('分析') || messageContent.includes('进度')) {
      category = 'insight';
    } else if (messageContent.includes('如何') || messageContent.includes('怎么')) {
      category = 'advice';
    }

    res.json({
      response: aiResponse,
      category,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("AI Chat error:", error);
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "无效的令牌" });
    }
    res.status(500).json({ 
      error: "AI服务暂时不可用，请稍后再试",
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : String(error) : undefined
    });
  }
}