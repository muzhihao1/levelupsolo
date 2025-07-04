// Optimized task creation routes for better performance
// These routes can replace the existing slow endpoints

import { Request, Response } from "express";
import { z } from "zod";
import { db } from "./db";
import { tasks, skills } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import OpenAI from "openai";
import { initializeCoreSkillsOptimized } from "./storage-optimized";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Schema for quick task creation
const quickCreateTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  taskCategory: z.enum(["goal", "todo", "habit"]).default("todo"),
  estimatedDuration: z.number().optional().default(30),
  difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium"),
  expReward: z.number().optional()
});

/**
 * Quick task creation endpoint - returns immediately
 * AI processing happens in background
 */
export async function quickCreateTask(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Validate input
    const validatedData = quickCreateTaskSchema.parse(req.body);

    // Calculate default exp reward if not provided
    const expReward = validatedData.expReward || 
      (validatedData.difficulty === "easy" ? 10 : 
       validatedData.difficulty === "medium" ? 20 : 30);

    // Create task immediately with defaults
    const [newTask] = await db.insert(tasks).values({
      userId,
      title: validatedData.title,
      description: validatedData.description || "",
      taskCategory: validatedData.taskCategory,
      taskType: "simple", // Default, will be updated by AI
      estimatedDuration: validatedData.estimatedDuration,
      difficulty: validatedData.difficulty,
      expReward,
      requiredEnergyBalls: Math.ceil(validatedData.estimatedDuration / 15),
      completed: false,
      order: 0
    }).returning();

    // Process with AI in background (non-blocking)
    if (process.env.OPENAI_API_KEY) {
      processTaskWithAI(newTask.id, userId, validatedData.title, validatedData.description || "")
        .catch(err => console.error("AI processing failed:", err));
    }

    res.json({
      success: true,
      task: newTask,
      message: "Task created successfully"
    });

  } catch (error) {
    console.error("Quick task creation error:", error);
    res.status(500).json({ 
      error: "Failed to create task",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

/**
 * Background AI processing for task categorization
 * Updates task after creation
 */
async function processTaskWithAI(
  taskId: number, 
  userId: string, 
  title: string, 
  description: string
) {
  try {
    // Ensure user has skills initialized (cached operation)
    await initializeCoreSkillsOptimized(userId);

    // Get user skills (single optimized query)
    const userSkills = await db.select()
      .from(skills)
      .where(eq(skills.userId, userId));

    // Call OpenAI for categorization
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a task categorization assistant. Analyze the task and return a JSON object with:
          - taskType: "main" (important long-term) or "simple" (quick tasks)
          - suggestedSkillName: one of [${userSkills.map(s => s.name).join(", ")}]
          - suggestedDifficulty: "easy", "medium", or "hard"
          - suggestedExpReward: number between 10-100`
        },
        {
          role: "user",
          content: `Task: ${title}\nDescription: ${description}`
        }
      ],
      temperature: 0.3,
      max_tokens: 150
    });

    const aiResult = JSON.parse(completion.choices[0].message.content || "{}");
    
    // Find matching skill
    const matchingSkill = userSkills.find(s => 
      s.name.toLowerCase() === aiResult.suggestedSkillName?.toLowerCase()
    );

    // Update task with AI suggestions
    await db.update(tasks)
      .set({
        taskType: aiResult.taskType || "simple",
        skillId: matchingSkill?.id || null,
        difficulty: aiResult.suggestedDifficulty || "medium",
        expReward: aiResult.suggestedExpReward || 20
      })
      .where(eq(tasks.id, taskId));

  } catch (error) {
    // AI processing failed, but task is already created
    // Log error but don't affect user experience
    console.error("AI task processing error:", error);
  }
}

/**
 * Batch create multiple tasks efficiently
 */
export async function batchCreateTasks(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { tasks: taskList } = req.body;
    if (!Array.isArray(taskList) || taskList.length === 0) {
      return res.status(400).json({ error: "Invalid task list" });
    }

    // Validate all tasks
    const validatedTasks = taskList.map(task => ({
      ...quickCreateTaskSchema.parse(task),
      userId,
      completed: false,
      order: 0
    }));

    // Batch insert all tasks
    const newTasks = await db.insert(tasks).values(validatedTasks).returning();

    res.json({
      success: true,
      tasks: newTasks,
      count: newTasks.length
    });

  } catch (error) {
    console.error("Batch task creation error:", error);
    res.status(500).json({ error: "Failed to create tasks" });
  }
}