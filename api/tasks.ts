import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from './_lib/storage';
import { createInsertSchema } from 'drizzle-zod';
import { tasks } from '@shared/schema';
import { z } from 'zod';
import OpenAI from 'openai';

const insertTaskSchema = createInsertSchema(tasks);

// CORS setup
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

  // Extract the operation from the URL path
  const pathParts = req.url?.split('/') || [];
  const operation = pathParts[pathParts.length - 1];

  // Get user ID from auth header or query
  const userId = req.headers.authorization?.replace('Bearer ', '') || req.query.userId;
  
  if (!userId) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  switch (operation) {
    case 'tasks':
      return handleTasks(req, res, userId as string);
    case 'analyze-task':
      return handleAnalyzeTask(req, res, userId as string);
    case 'intelligent-create':
      return handleIntelligentCreate(req, res, userId as string);
    default:
      // Default to tasks CRUD operations
      return handleTasks(req, res, userId as string);
  }
}

// Main tasks CRUD handler
async function handleTasks(req: VercelRequest, res: VercelResponse, userId: string) {
  try {
    if (req.method === 'GET') {
      const tasks = await storage.getTasks(userId);
      return res.status(200).json(tasks);
    }
    
    if (req.method === 'POST') {
      const taskData = insertTaskSchema.parse({
        ...req.body,
        userId
      });
      
      const task = await storage.createTask(taskData);
      return res.status(200).json(task);
    }
    
    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid task data', errors: error.errors });
    }
    console.error('Error handling tasks:', error);
    return res.status(500).json({ message: 'Failed to handle tasks' });
  }
}

// Analyze task handler
async function handleAnalyzeTask(req: VercelRequest, res: VercelResponse, userId: string) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Task title is required' });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim() === '') {
      console.warn('OpenAI API key not configured, returning default analysis');
      // Return a default analysis when OpenAI is not available
      return res.json({
        category: 'todo',
        difficulty: 'medium',
        skills: ['通用技能'],
        estimatedDuration: 30,
        reasoning: 'AI分析暂时不可用，使用默认设置'
      });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `分析以下任务，智能建议最适合的分类和难度。任务标题："${title}"，描述："${description || '无'}"。

请返回JSON格式，包含：
{
  "category": "habit|daily|todo",
  "difficulty": "easy|medium|hard",
  "skills": ["相关技能1", "相关技能2"],
  "estimatedDuration": 30,
  "reasoning": "分析原因"
}

分类建议：
- habit: 需要重复培养的习惯（如运动、学习、阅读）
- daily: 每日必须完成的任务（如工作、例行检查）
- todo: 一次性待办事项（如购物、修理、项目任务）`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 300
    });

    const analysis = JSON.parse(response.choices[0].message.content || '{}');
    return res.json(analysis);
  } catch (error) {
    console.error('Error analyzing task:', error);
    return res.status(500).json({ message: 'Failed to analyze task' });
  }
}

// Intelligent create handler
async function handleIntelligentCreate(req: VercelRequest, res: VercelResponse, userId: string) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({ message: 'Task description is required' });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim() === '') {
      console.warn('OpenAI API key not configured, using simple task creation');
      
      // Simple rule-based task creation without AI
      const taskCategory = description.includes('每天') || description.includes('坚持') || description.includes('养成') 
        ? 'habit' 
        : 'todo';
      
      const difficulty = description.length > 50 ? 'hard' : description.length > 20 ? 'medium' : 'easy';
      const energyBalls = difficulty === 'hard' ? 4 : difficulty === 'medium' ? 2 : 1;
      
      const taskData = {
        userId,
        title: description.trim(),
        description: null,
        taskCategory: taskCategory,
        taskType: taskCategory,
        difficulty: difficulty,
        expReward: difficulty === 'hard' ? 35 : difficulty === 'medium' ? 20 : 10,
        estimatedDuration: energyBalls * 15,
        requiredEnergyBalls: energyBalls,
        tags: [],
        skills: [],
        skillId: null,
        completed: false,
        ...(taskCategory === 'habit' && {
          isRecurring: true,
          recurringPattern: 'daily',
          habitStreak: 0,
          habitValue: 0,
          habitDirection: 'positive'
        })
      };

      const newTask = await storage.createTask(taskData);
      return res.json({ 
        task: newTask, 
        analysis: {
          category: taskCategory,
          title: description.trim(),
          difficulty: difficulty,
          skillName: null,
          energyBalls: energyBalls
        }
      });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `分析以下任务描述，判断是习惯还是支线任务，并分配合适的核心技能和能量球需求：

任务描述："${description}"

分类判定规则：
- 习惯(habit)：需要长期坚持养成的重复性行为，强调"养成"和"坚持"
  例如：每天运动、坚持阅读、定期冥想、保持早睡、养成记录习惯、坚持学习等
  关键词：每天、坚持、养成、定期、保持、习惯、打卡

- 支线任务(todo)：有明确完成状态的具体任务，包括一次性阅读、学习特定内容等
  例如：读某篇文章、看某个视频、完成某个报告、学习某个技能、参加某个会议、购买某物品等
  关键词：读、看、完成、学习、参加、购买、处理、解决、制作、写、研究

特殊说明：
- "读生财帖子"、"看教程"、"学习某技术" → todo（有具体完成目标的学习任务）
- "坚持每天阅读"、"养成学习习惯" → habit（强调养成的重复行为）

核心技能分类（必须从以下六个固定技能中选择一个）：
- 身体掌控力：体育运动、健身、身体健康、体能训练等
- 心智成长力：学习、阅读、研究、思考、认知提升等
- 意志执行力：工作任务、项目执行、目标达成、自律行为等
- 关系经营力：社交、沟通、团队合作、人际关系等
- 财富掌控力：理财、投资、经济管理、资源优化等
- 情绪稳定力：情绪管理、心理健康、压力调节、内心平衡等

能量球系统（每个能量球=15分钟专注时间）：
- 简单任务：1个能量球（15分钟）
- 中等任务：2-3个能量球（30-45分钟）
- 困难任务：4-6个能量球（60-90分钟）

返回JSON格式：
{
  "category": "habit|todo",
  "title": "简洁的任务标题", 
  "difficulty": "easy|medium|hard",
  "skillName": "对应的核心技能名称",
  "energyBalls": 1-6
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 200
    });

    const analysis = JSON.parse(response.choices[0].message.content || '{}');

    const difficultyRewards = {
      easy: { xp: 10 },
      medium: { xp: 20 },
      hard: { xp: 35 }
    } as const;

    const difficulty = analysis.difficulty || 'medium';
    const rewards = difficultyRewards[difficulty as keyof typeof difficultyRewards];
    const taskCategory = analysis.category || 'todo';
    const skillName = analysis.skillName;
    const requiredEnergyBalls = analysis.energyBalls || (() => {
      // Fallback energy ball calculation based on difficulty
      switch(difficulty) {
        case 'easy': return 1;
        case 'medium': return 2;
        case 'hard': return 4;
        default: return 2;
      }
    })();

    // Map AI response to core skills and find matching skill
    let skillId = null;
    if (skillName) {
      // Initialize core skills if they don't exist
      await storage.initializeCoreSkills(userId);

      // Get user's core skills
      const userSkills = await storage.getSkills(userId);
      let skill = userSkills.find(s => s.name === skillName);

      // If exact match not found, use core skill mapping
      if (!skill && skillName) {
        skill = await storage.findOrCreateSkill(skillName, userId) || undefined;
      }

      if (skill) {
        skillId = skill.id;
      }
    }

    // Create task with AI-determined category and skill assignment
    const taskData = {
      userId,
      title: analysis.title || description.trim(),
      description: null,
      taskCategory: taskCategory,
      taskType: taskCategory,
      difficulty: difficulty,
      expReward: rewards.xp,
      estimatedDuration: requiredEnergyBalls * 15, // Energy balls * 15 minutes
      requiredEnergyBalls: requiredEnergyBalls,
      tags: skillName ? [skillName] : [],
      skills: skillName ? [skillName] : [],
      skillId: skillId,
      completed: false,
      // Add habit-specific properties for habit tasks
      ...(taskCategory === 'habit' && {
        isRecurring: true,
        recurringPattern: 'daily',
        habitStreak: 0,
        habitValue: 0,
        habitDirection: 'positive'
      })
    };

    const newTask = await storage.createTask(taskData);

    return res.json({ task: newTask, analysis });
  } catch (error) {
    console.error('Error creating intelligent task:', error);
    return res.status(500).json({ message: 'Failed to create intelligent task' });
  }
}