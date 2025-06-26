import type { Express } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users, skills, tasks, goals, userStats, userProfiles } from "@shared/schema";
import * as auth from "./auth-jwt";

// 注册移动端 API 路由
export function registerMobileRoutes(app: Express) {
  // ========== 认证路由 ==========
  
  // 注册
  app.post("/api/mobile/auth/register", auth.register);
  
  // 登录
  app.post("/api/mobile/auth/login", auth.login);
  
  // 刷新 Token
  app.post("/api/mobile/auth/refresh", auth.refreshToken);
  
  // 获取当前用户
  app.get("/api/mobile/auth/me", auth.authenticateToken, auth.getCurrentUser);
  
  // ========== 受保护的路由 ==========
  
  // 获取用户技能
  app.get("/api/mobile/skills", auth.authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const userSkills = await db.select()
        .from(skills)
        .where(eq(skills.userId, userId));
        
      res.json({ success: true, data: userSkills });
    } catch (error) {
      console.error("Error fetching skills:", error);
      res.status(500).json({ success: false, error: "Failed to fetch skills" });
    }
  });
  
  // 获取用户任务
  app.get("/api/mobile/tasks", auth.authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const userTasks = await db.select()
        .from(tasks)
        .where(eq(tasks.userId, userId))
        .orderBy(tasks.createdAt);
        
      res.json({ success: true, data: userTasks });
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ success: false, error: "Failed to fetch tasks" });
    }
  });
  
  // 创建任务
  app.post("/api/mobile/tasks", auth.authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const taskData = {
        ...req.body,
        userId,
        createdAt: new Date()
      };
      
      const [newTask] = await db.insert(tasks)
        .values(taskData)
        .returning();
        
      res.json({ success: true, data: newTask });
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ success: false, error: "Failed to create task" });
    }
  });
  
  // 完成任务
  app.post("/api/mobile/tasks/:id/complete", auth.authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const taskId = parseInt(req.params.id);
      
      // 获取任务信息
      const [task] = await db.select()
        .from(tasks)
        .where(eq(tasks.id, taskId))
        .limit(1);
        
      if (!task || task.userId !== userId) {
        return res.status(404).json({ success: false, error: "Task not found" });
      }
      
      // 更新任务状态
      await db.update(tasks)
        .set({ 
          completed: true, 
          completedAt: new Date() 
        })
        .where(eq(tasks.id, taskId));
        
      // 更新技能经验值
      if (task.skillId) {
        const [skill] = await db.select()
          .from(skills)
          .where(eq(skills.id, task.skillId))
          .limit(1);
          
        if (skill) {
          const newExp = skill.exp + (task.expReward || 10);
          const newLevel = Math.floor(newExp / 100) + 1;
          
          await db.update(skills)
            .set({ 
              exp: newExp,
              level: newLevel 
            })
            .where(eq(skills.id, task.skillId));
        }
      }
      
      res.json({ success: true, message: "Task completed successfully" });
    } catch (error) {
      console.error("Error completing task:", error);
      res.status(500).json({ success: false, error: "Failed to complete task" });
    }
  });
  
  // 获取用户目标
  app.get("/api/mobile/goals", auth.authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const userGoals = await db.select()
        .from(goals)
        .where(eq(goals.userId, userId));
        
      res.json({ success: true, data: userGoals });
    } catch (error) {
      console.error("Error fetching goals:", error);
      res.status(500).json({ success: false, error: "Failed to fetch goals" });
    }
  });
  
  // 获取用户统计
  app.get("/api/mobile/stats", auth.authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const [stats] = await db.select()
        .from(userStats)
        .where(eq(userStats.userId, userId))
        .limit(1);
        
      if (!stats) {
        // 创建默认统计
        const [newStats] = await db.insert(userStats)
          .values({ userId })
          .returning();
          
        return res.json({ success: true, data: newStats });
      }
      
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ success: false, error: "Failed to fetch stats" });
    }
  });
  
  // 获取用户资料
  app.get("/api/mobile/profile", auth.authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const [profile] = await db.select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1);
        
      res.json({ success: true, data: profile || null });
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ success: false, error: "Failed to fetch profile" });
    }
  });
  
  // 更新用户资料
  app.put("/api/mobile/profile", auth.authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const profileData = req.body;
      
      // 检查是否已有资料
      const [existingProfile] = await db.select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1);
        
      if (existingProfile) {
        // 更新
        await db.update(userProfiles)
          .set({ ...profileData, updatedAt: new Date() })
          .where(eq(userProfiles.userId, userId));
      } else {
        // 创建
        await db.insert(userProfiles)
          .values({ 
            ...profileData, 
            userId,
            createdAt: new Date(),
            updatedAt: new Date()
          });
      }
      
      res.json({ success: true, message: "Profile updated successfully" });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ success: false, error: "Failed to update profile" });
    }
  });
}