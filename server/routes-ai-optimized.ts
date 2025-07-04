import { Router } from "express";
import OpenAI from "openai";
import { isAuthenticated } from "./simpleAuth";
import { storage } from "./storage";
import { invalidateCacheMiddleware } from "./cache-middleware";

// Initialize OpenAI with optimized settings
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 2,
  timeout: 10000 // 10 second timeout
});

// Skills cache to avoid repeated initialization
const userSkillsCache = new Map<string, { skills: any[], timestamp: number }>();
const SKILLS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// AI response cache for identical inputs
const aiResponseCache = new Map<string, { response: any, timestamp: number }>();
const AI_CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Deduplication for in-flight requests
const pendingRequests = new Map<string, Promise<any>>();

/**
 * Get cached skills or initialize if needed
 */
async function getCachedSkills(userId: string): Promise<any[]> {
  const cached = userSkillsCache.get(userId);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < SKILLS_CACHE_TTL) {
    console.log(`[Skills Cache] Hit for user ${userId}`);
    return cached.skills;
  }
  
  console.log(`[Skills Cache] Miss for user ${userId}, initializing...`);
  const skills = await (storage as any).initializeCoreSkills(userId);
  userSkillsCache.set(userId, { skills, timestamp: now });
  
  return skills;
}

/**
 * Analyze task with AI, using cache when possible
 */
async function analyzeTaskWithAI(description: string): Promise<any> {
  const cacheKey = description.toLowerCase().trim();
  const cached = aiResponseCache.get(cacheKey);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < AI_CACHE_TTL) {
    console.log(`[AI Cache] Hit for: "${description}"`);
    return cached.response;
  }
  
  console.log(`[AI Cache] Miss for: "${description}", calling AI...`);
  
  const prompt = `分析以下任务并返回结构化信息。

任务描述："${description}"

请以JSON格式返回：
{
  "category": "habit|todo|goal",
  "title": "${description}",
  "difficulty": "easy|medium|hard",
  "skillNames": ["相关技能"],
  "estimatedDuration": 30,
  "energyBalls": 1-4,
  "reasoning": "简短分析"
}

分类规则：
- habit: 每天重复的行为（锻炼、冥想、阅读）
- todo: 一次性任务（完成项目、修理东西）
- goal: 长期目标（学会技能、达成成就）`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Faster and cheaper than GPT-4
      messages: [
        {
          role: "system",
          content: "你是一个任务分类助手，返回简洁的JSON格式响应。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 150, // Reduced from 300
      temperature: 0.3,
      presence_penalty: 0,
      frequency_penalty: 0
    });

    const analysis = JSON.parse(response.choices[0].message.content || "{}");
    
    // Cache the response
    aiResponseCache.set(cacheKey, { response: analysis, timestamp: now });
    
    return analysis;
  } catch (error) {
    console.error("AI analysis error:", error);
    throw error;
  }
}

/**
 * Create task with pre-analyzed data
 */
async function createTaskWithAnalysis(
  userId: string, 
  analysis: any, 
  userSkills: any[]
): Promise<any> {
  // Map skill names to IDs
  const skillIds: number[] = [];
  if (analysis.skillNames && Array.isArray(analysis.skillNames)) {
    for (const skillName of analysis.skillNames) {
      const skill = userSkills.find(s => 
        s.name.toLowerCase() === skillName.toLowerCase()
      );
      if (skill) {
        skillIds.push(skill.id);
      }
    }
  }
  
  // Use default skill if none matched
  const defaultSkill = userSkills.find(s => s.name === "意志执行力");
  const primarySkillId = skillIds[0] || defaultSkill?.id || null;
  
  const taskData = {
    userId,
    title: analysis.title || analysis.description,
    description: analysis.reasoning || null,
    taskCategory: analysis.category || "todo",
    taskType: "simple",
    difficulty: analysis.difficulty || "medium",
    expReward: analysis.difficulty === "hard" ? 35 : 
               analysis.difficulty === "medium" ? 20 : 10,
    estimatedDuration: analysis.estimatedDuration || 30,
    requiredEnergyBalls: analysis.energyBalls || 2,
    tags: analysis.skillNames || ["意志执行力"],
    skillId: primarySkillId,
    completed: false,
    // iOS compatibility fields
    order: 0,
    skills: analysis.skillNames || ["意志执行力"],
    isDailyTask: analysis.category === "habit",
    dailyStreak: null,
    isRecurring: analysis.category === "habit",
    recurringPattern: analysis.category === "habit" ? "daily" : null,
    habitDirection: analysis.category === "habit" ? "positive" : null,
    habitStreak: null,
    habitValue: null,
    lastCompletedDate: null,
    lastCompletedAt: null,
    completionCount: 0
  };
  
  const newTask = await storage.createTask(taskData);
  
  return {
    ...newTask,
    skills: taskData.skills,
    isDailyTask: taskData.isDailyTask,
    dailyStreak: taskData.dailyStreak,
    isRecurring: taskData.isRecurring,
    recurringPattern: taskData.recurringPattern,
    habitDirection: taskData.habitDirection,
    habitStreak: taskData.habitStreak,
    habitValue: taskData.habitValue,
    lastCompletedDate: taskData.lastCompletedDate,
    order: taskData.order,
    tags: taskData.tags,
    dueDate: null,
    priority: 1
  };
}

/**
 * Optimized AI-powered task creation endpoint
 */
export async function intelligentCreateOptimized(app: any) {
  app.post("/api/tasks/intelligent-create-optimized", 
    isAuthenticated, 
    invalidateCacheMiddleware(['tasks', 'stats', 'data']), 
    async (req: any, res: any) => {
      const startTime = Date.now();
      console.log("=== Optimized AI Task Creation Started ===");
      
      try {
        const { description } = req.body;
        const userId = (req.user as any)?.claims?.sub;
        
        if (!description) {
          return res.status(400).json({ message: "Task description is required" });
        }
        
        if (!userId) {
          return res.status(401).json({ message: "User not authenticated" });
        }
        
        // Check for pending identical request
        const dedupKey = `${userId}:${description}`;
        if (pendingRequests.has(dedupKey)) {
          console.log("[Dedup] Waiting for existing request...");
          const existingPromise = pendingRequests.get(dedupKey);
          const result = await existingPromise;
          return res.json(result);
        }
        
        // Create promise for this request
        const requestPromise = (async () => {
          // Check if AI is available
          if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim() === '') {
            console.warn("OpenAI API key not configured, using rule-based creation");
            
            // Fallback to simple creation
            const userSkills = await getCachedSkills(userId);
            const defaultSkill = userSkills.find(s => s.name === "意志执行力");
            
            const analysis = {
              category: description.includes("每天") || description.includes("坚持") ? "habit" : "todo",
              title: description.trim(),
              difficulty: description.length > 50 ? "hard" : description.length > 20 ? "medium" : "easy",
              skillNames: ["意志执行力"],
              energyBalls: description.length > 50 ? 4 : description.length > 20 ? 2 : 1,
              reasoning: "基于规则的分析"
            };
            
            const task = await createTaskWithAnalysis(userId, analysis, userSkills);
            return { task, analysis };
          }
          
          // Parallel execution of skills loading and AI analysis
          console.time('parallel-operations');
          const [userSkills, analysis] = await Promise.all([
            getCachedSkills(userId),
            analyzeTaskWithAI(description)
          ]);
          console.timeEnd('parallel-operations');
          
          // Create task with results
          console.time('task-creation');
          const task = await createTaskWithAnalysis(userId, analysis, userSkills);
          console.timeEnd('task-creation');
          
          const totalTime = Date.now() - startTime;
          console.log(`[Performance] Total time: ${totalTime}ms`);
          
          return { 
            task, 
            analysis,
            performance: {
              totalTime,
              cached: {
                skills: userSkillsCache.has(userId),
                ai: aiResponseCache.has(description.toLowerCase().trim())
              }
            }
          };
        })();
        
        // Store promise for deduplication
        pendingRequests.set(dedupKey, requestPromise);
        
        try {
          const result = await requestPromise;
          res.json(result);
        } finally {
          // Clean up deduplication entry
          pendingRequests.delete(dedupKey);
        }
        
      } catch (error: any) {
        console.error("Optimized task creation error:", error);
        
        // Provide meaningful error messages
        if (error.status === 429) {
          return res.status(503).json({ 
            message: "AI服务繁忙，请稍后再试",
            error: "Rate limit exceeded"
          });
        } else if (error.code === 'ENOTFOUND') {
          return res.status(503).json({ 
            message: "无法连接AI服务",
            error: "Network error"
          });
        }
        
        res.status(500).json({ 
          message: "任务创建失败",
          error: error.message 
        });
      }
    }
  );
}

// Export cache clear functions for maintenance
export function clearSkillsCache(userId?: string) {
  if (userId) {
    userSkillsCache.delete(userId);
  } else {
    userSkillsCache.clear();
  }
}

export function clearAICache() {
  aiResponseCache.clear();
}

// Periodic cache cleanup
setInterval(() => {
  const now = Date.now();
  
  // Clean expired skills cache entries
  for (const [userId, cache] of userSkillsCache.entries()) {
    if (now - cache.timestamp > SKILLS_CACHE_TTL) {
      userSkillsCache.delete(userId);
    }
  }
  
  // Clean expired AI cache entries
  for (const [key, cache] of aiResponseCache.entries()) {
    if (now - cache.timestamp > AI_CACHE_TTL) {
      aiResponseCache.delete(key);
    }
  }
  
  console.log(`[Cache Cleanup] Skills: ${userSkillsCache.size} entries, AI: ${aiResponseCache.size} entries`);
}, 5 * 60 * 1000); // Run every 5 minutes