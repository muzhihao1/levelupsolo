// 优化版 AI 任务创建 - 保持智能，提升速度
import { Request, Response } from "express";
import OpenAI from "openai";
import { storage } from "./storage";
import { z } from "zod";
import { logger } from "./utils/logger";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 技能缓存 - 避免重复查询
const skillsCache = new Map<string, { data: any[], timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

// AI 响应缓存 - 相似任务使用缓存结果
const aiResponseCache = new Map<string, { result: any, timestamp: number }>();
const AI_CACHE_TTL = 60 * 60 * 1000; // 1小时缓存

// 请求去重 - 防止同时多个相同请求
const pendingRequests = new Map<string, Promise<any>>();

/**
 * 获取用户技能（带缓存）
 */
async function getUserSkillsCached(userId: string) {
  const cacheKey = `skills_${userId}`;
  const cached = skillsCache.get(cacheKey);
  
  // 检查缓存是否有效
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    logger.debug("Skills cache hit", { userId });
    return cached.data;
  }
  
  // 初始化并获取技能
  logger.debug("Skills cache miss, fetching", { userId });
  await storage.initializeCoreSkills(userId);
  const skills = await storage.getUserSkills(userId);
  
  // 更新缓存
  skillsCache.set(cacheKey, { data: skills, timestamp: Date.now() });
  
  // 定期清理缓存
  setTimeout(() => skillsCache.delete(cacheKey), CACHE_TTL);
  
  return skills;
}

/**
 * 生成 AI 缓存键
 */
function getAICacheKey(description: string): string {
  // 规范化描述，忽略大小写和多余空格
  return description.toLowerCase().trim().replace(/\s+/g, ' ').substring(0, 50);
}

/**
 * 优化的 AI 任务创建端点
 */
export async function intelligentCreateTaskOptimized(req: Request, res: Response) {
  try {
    const startTime = Date.now();
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    // 验证输入
    const schema = z.object({
      description: z.string().min(1).max(500)
    });
    
    const { description } = schema.parse(req.body);
    
    // 检查是否有相同的请求正在处理
    const requestKey = `${userId}_${description}`;
    if (pendingRequests.has(requestKey)) {
      logger.debug("Deduplicating request", { userId, description });
      const result = await pendingRequests.get(requestKey);
      return res.json(result);
    }
    
    // 创建请求处理 Promise
    const requestPromise = (async () => {
      try {
        // 并行执行：获取技能 + 检查 AI 缓存
        const aiCacheKey = getAICacheKey(description);
        const [skills, cachedAI] = await Promise.all([
          getUserSkillsCached(userId),
          Promise.resolve(aiResponseCache.get(aiCacheKey))
        ]);
        
        let aiResult;
        
        // 检查 AI 缓存
        if (cachedAI && Date.now() - cachedAI.timestamp < AI_CACHE_TTL) {
          logger.debug("AI cache hit", { description: aiCacheKey });
          aiResult = cachedAI.result;
        } else {
          // 调用 OpenAI - 使用更快的模型和优化的 prompt
          logger.debug("Calling OpenAI", { description });
          
          const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", // 比 gpt-4o 快 3-5 倍
            messages: [
              {
                role: "system",
                content: `你是任务分类助手。快速分析任务并返回JSON：
{
  "title": "简洁的任务标题",
  "taskCategory": "goal"(主线)/"todo"(支线)/"habit"(习惯),
  "taskType": "main"(重要长期)/"simple"(普通),
  "difficulty": "easy"/"medium"/"hard",
  "estimatedDuration": 15-120(分钟),
  "expReward": 10-100,
  "suggestedSkillName": "${skills.map(s => s.name).join('/')}"
}`
              },
              {
                role: "user",
                content: description
              }
            ],
            temperature: 0.3, // 降低随机性，提高速度
            max_tokens: 150,  // 减少 token 限制
            response_format: { type: "json_object" }
          });
          
          aiResult = JSON.parse(completion.choices[0].message.content || "{}");
          
          // 缓存 AI 响应
          aiResponseCache.set(aiCacheKey, { 
            result: aiResult, 
            timestamp: Date.now() 
          });
          
          // 定期清理缓存
          setTimeout(() => aiResponseCache.delete(aiCacheKey), AI_CACHE_TTL);
        }
        
        // 处理 AI 结果
        const taskTitle = aiResult.title || description;
        const taskCategory = aiResult.taskCategory || "todo";
        const taskType = aiResult.taskType || "simple";
        const difficulty = aiResult.difficulty || "medium";
        const estimatedDuration = aiResult.estimatedDuration || 30;
        const expReward = aiResult.expReward || 20;
        
        // 匹配技能
        const matchingSkill = skills.find(s => 
          s.name === aiResult.suggestedSkillName
        );
        
        // 创建任务
        const task = await storage.createTask({
          userId,
          title: taskTitle,
          description: `AI分析：${description}`,
          taskCategory,
          taskType,
          skillId: matchingSkill?.id || null,
          estimatedDuration,
          expReward,
          difficulty,
          requiredEnergyBalls: Math.ceil(estimatedDuration / 15),
          completed: false,
          tags: null,
          dueDate: null,
          parentGoalId: null,
          parentTaskId: null,
          order: 0
        });
        
        const endTime = Date.now();
        logger.info("AI task created", { 
          userId, 
          taskId: task.id,
          duration: endTime - startTime,
          cached: cachedAI ? true : false
        });
        
        return {
          success: true,
          task,
          aiAnalysis: {
            category: taskCategory,
            type: taskType,
            skill: matchingSkill?.name || null,
            difficulty,
            duration: estimatedDuration,
            expReward
          },
          performance: {
            totalTime: endTime - startTime,
            cached: cachedAI ? true : false
          }
        };
        
      } finally {
        // 清理 pending 请求
        pendingRequests.delete(requestKey);
      }
    })();
    
    // 存储 pending 请求
    pendingRequests.set(requestKey, requestPromise);
    
    const result = await requestPromise;
    res.json(result);
    
  } catch (error: any) {
    logger.error("AI task creation error", error);
    res.status(500).json({ 
      error: "Failed to create task",
      details: error.message 
    });
  }
}

// 清理缓存的定时任务（可选）
export function startCacheCleanup() {
  setInterval(() => {
    const now = Date.now();
    
    // 清理过期的技能缓存
    for (const [key, value] of skillsCache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        skillsCache.delete(key);
      }
    }
    
    // 清理过期的 AI 缓存
    for (const [key, value] of aiResponseCache.entries()) {
      if (now - value.timestamp > AI_CACHE_TTL) {
        aiResponseCache.delete(key);
      }
    }
    
    logger.debug("Cache cleanup completed", {
      skillsCacheSize: skillsCache.size,
      aiCacheSize: aiResponseCache.size
    });
  }, 10 * 60 * 1000); // 每10分钟清理一次
}