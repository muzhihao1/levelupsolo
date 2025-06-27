import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Task title is required' });
    }

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
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 300
    });

    const analysis = JSON.parse(response.choices[0].message.content || "{}");
    return res.status(200).json(analysis);
  } catch (error) {
    console.error('Error analyzing task:', error);
    return res.status(500).json({ message: 'Failed to analyze task' });
  }
}