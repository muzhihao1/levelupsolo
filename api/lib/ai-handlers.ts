import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import OpenAI from 'openai';

// 设置 CORS
export function setCORS(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Verify JWT token
export function verifyToken(authHeader: string | undefined) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('未授权');
  }
  
  const token = authHeader.substring(7);
  return jwt.verify(token, process.env.JWT_SECRET || 'demo-secret') as any;
}

// Chat handler
export async function handleChat(req: VercelRequest, res: VercelResponse) {
  try {
    const decoded = verifyToken(req.headers.authorization);
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

    return res.json({
      response: aiResponse,
      category,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("AI Chat error:", error);
    if (error instanceof jwt.JsonWebTokenError || (error as any).message === '未授权') {
      return res.status(401).json({ message: "无效的令牌" });
    }
    return res.status(500).json({ 
      error: "AI服务暂时不可用，请稍后再试",
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : String(error) : undefined
    });
  }
}

// Suggestions handler
export async function handleSuggestions(req: VercelRequest, res: VercelResponse) {
  try {
    const decoded = verifyToken(req.headers.authorization);
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

    return res.json({
      suggestions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("AI Suggestions error:", error);
    if (error instanceof jwt.JsonWebTokenError || (error as any).message === '未授权') {
      return res.status(401).json({ message: "无效的令牌" });
    }
    return res.status(500).json({ 
      error: "AI建议服务暂时不可用",
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : String(error) : undefined
    });
  }
}

// Parse Input handler
export async function handleParseInput(req: VercelRequest, res: VercelResponse) {
  try {
    const decoded = verifyToken(req.headers.authorization);
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
  } catch (error) {
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