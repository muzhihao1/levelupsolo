import { Router } from "express";
import OpenAI from "openai";
import { isAuthenticated } from "./replitAuth";

const router = Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// AI Chat endpoint
router.post("/chat", isAuthenticated, async (req, res) => {
  try {
    const { message, context } = req.body;
    const userId = req.user?.id;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: "Message is required" });
    }

    // Build context prompt based on user data
    let contextPrompt = `你是一个专业的个人成长AI助手，帮助用户在技能发展、目标达成和任务管理方面获得成功。

用户背景信息:
- 用户ID: ${userId}`;

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

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
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
    res.status(500).json({ 
      error: "AI服务暂时不可用，请稍后再试",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// AI Suggestions endpoint
router.post("/suggestions", isAuthenticated, async (req, res) => {
  try {
    const { context } = req.body;
    const userId = req.user?.id;

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

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
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
    res.status(500).json({ 
      error: "AI建议服务暂时不可用",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// AI Task Generation endpoint
router.post("/generate-tasks", isAuthenticated, async (req, res) => {
  try {
    const { goalTitle, goalDescription, context } = req.body;

    if (!goalTitle) {
      return res.status(400).json({ error: "Goal title is required" });
    }

    let prompt = `你是一个专业的项目管理AI助手。基于以下目标，生成5-8个具体的任务步骤:

目标: ${goalTitle}
描述: ${goalDescription || '无具体描述'}`;

    if (context?.profile) {
      prompt += `

用户背景:
- 职业: ${context.profile.occupation || '未知'}
- 经验水平: 根据用户技能推断`;
    }

    prompt += `

请生成任务要求:
1. 每个任务要具体、可执行
2. 按逻辑顺序排列
3. 包含明确的完成标准
4. 适合用户的技能水平
5. 每个任务标题简洁（15字以内）
6. 每个任务描述详细但不超过50字

输出格式（JSON）:
{
  "tasks": [
    {
      "title": "任务标题",
      "description": "任务描述",
      "priority": "high|medium|low",
      "estimatedMinutes": 数字
    }
  ]
}`;

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 800,
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{"tasks": []}');

    res.json({
      tasks: result.tasks || [],
      aiGenerated: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("AI Task Generation error:", error);
    res.status(500).json({ 
      error: "AI任务生成服务暂时不可用",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// AI Goal Analysis endpoint
router.post("/analyze-goal", isAuthenticated, async (req, res) => {
  try {
    const { goal, context } = req.body;

    if (!goal || !goal.title) {
      return res.status(400).json({ error: "Goal data is required" });
    }

    let prompt = `你是一个专业的目标分析AI助手。分析以下目标并提供洞察:

目标信息:
- 标题: ${goal.title}
- 描述: ${goal.description || '无描述'}
- 完成度: ${Math.round((goal.progress || 0) * 100)}%
- 经验奖励: ${goal.expReward || 0} XP`;

    if (goal.milestones && goal.milestones.length > 0) {
      prompt += `
- 里程碑数量: ${goal.milestones.length}
- 已完成里程碑: ${goal.milestones.filter((m: any) => m.completed).length}`;
    }

    if (context?.skills) {
      prompt += `

相关技能水平:
${context.skills.map((skill: any) => `- ${skill.name}: Lv.${skill.level}`).join('\n')}`;
    }

    prompt += `

请提供以下分析（JSON格式）:
{
  "insights": [
    "洞察1：关于目标进度的分析",
    "洞察2：关于执行策略的建议",
    "洞察3：关于潜在风险的提醒"
  ],
  "recommendations": [
    "建议1：具体的下一步行动",
    "建议2：资源配置建议"
  ],
  "riskAssessment": "风险评估总结"
}`;

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 600,
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const analysis = JSON.parse(response.choices[0].message.content || '{}');

    res.json({
      ...analysis,
      aiGenerated: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("AI Goal Analysis error:", error);
    res.status(500).json({ 
      error: "AI目标分析服务暂时不可用",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Parse Quick Add input endpoint
router.post('/parse-input', isAuthenticated, async (req, res) => {
  try {
    const { input, context } = req.body;

    if (!input || typeof input !== 'string') {
      return res.status(400).json({ error: 'Invalid input' });
    }

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
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
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
});

export default router;