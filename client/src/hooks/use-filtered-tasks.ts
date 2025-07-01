import { useMemo } from 'react';
import type { Task } from '@shared/schema';

interface UseFilteredTasksParams {
  tasks: Task[] | undefined;
  activeTab: string;
  searchQuery?: string;
}

export function useFilteredTasks({ tasks, activeTab, searchQuery }: UseFilteredTasksParams) {
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];

    let filtered = [...tasks];

    // 根据标签页过滤
    switch (activeTab) {
      case 'all':
        // 显示所有任务
        break;
      case 'main':
        filtered = filtered.filter(task => task.isMainQuest);
        break;
      case 'side':
        filtered = filtered.filter(task => task.isSideQuest);
        break;
      case 'habit':
        filtered = filtered.filter(task => task.isHabit);
        break;
      case 'boss':
        filtered = filtered.filter(task => task.isBoss);
        break;
      case 'completed':
        filtered = filtered.filter(task => task.isCompleted);
        break;
      case 'incomplete':
        filtered = filtered.filter(task => !task.isCompleted);
        break;
      default:
        break;
    }

    // 搜索过滤
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.assignedSkill?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [tasks, activeTab, searchQuery]);

  // 计算任务统计信息
  const taskStats = useMemo(() => {
    if (!tasks) return {
      total: 0,
      main: 0,
      side: 0,
      habit: 0,
      boss: 0,
      completed: 0,
      incomplete: 0
    };

    return {
      total: tasks.length,
      main: tasks.filter(t => t.isMainQuest).length,
      side: tasks.filter(t => t.isSideQuest).length,
      habit: tasks.filter(t => t.isHabit).length,
      boss: tasks.filter(t => t.isBoss).length,
      completed: tasks.filter(t => t.isCompleted).length,
      incomplete: tasks.filter(t => !t.isCompleted).length
    };
  }, [tasks]);

  // 对任务进行排序
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      // 未完成的任务优先
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }
      
      // 按优先级排序（假设有priority字段）
      if (a.priority && b.priority && a.priority !== b.priority) {
        const priorityOrder = { high: 1, medium: 2, low: 3 };
        return (priorityOrder[a.priority] || 999) - (priorityOrder[b.priority] || 999);
      }
      
      // 按创建时间倒序（新任务在前）
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [filteredTasks]);

  return {
    filteredTasks: sortedTasks,
    taskStats,
    totalCount: filteredTasks.length
  };
}