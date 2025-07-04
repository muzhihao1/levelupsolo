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
        filtered = filtered.filter(task => task.taskCategory === 'goal');
        break;
      case 'side':
        filtered = filtered.filter(task => task.taskCategory === 'todo');
        break;
      case 'habit':
        filtered = filtered.filter(task => task.taskCategory === 'habit');
        break;
      case 'boss':
        // Filter for main quests with high difficulty
        filtered = filtered.filter(task => 
          task.taskCategory === 'goal' && task.difficulty === 'hard'
        );
        break;
      case 'completed':
        filtered = filtered.filter(task => task.completed);
        break;
      case 'incomplete':
        filtered = filtered.filter(task => !task.completed);
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
        task.tags?.some(tag => tag.toLowerCase().includes(query))
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
      main: tasks.filter(t => t.taskCategory === 'goal').length,
      side: tasks.filter(t => t.taskCategory === 'todo').length,
      habit: tasks.filter(t => t.taskCategory === 'habit').length,
      boss: tasks.filter(t => t.taskCategory === 'goal' && t.difficulty === 'hard').length,
      completed: tasks.filter(t => t.completed).length,
      incomplete: tasks.filter(t => !t.completed).length
    };
  }, [tasks]);

  // 对任务进行排序
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      // 未完成的任务优先
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      
      // 按难度排序 (difficulty field exists)
      if (a.difficulty && b.difficulty && a.difficulty !== b.difficulty) {
        const difficultyOrder: Record<string, number> = { hard: 1, medium: 2, easy: 3 };
        return (difficultyOrder[a.difficulty] || 999) - (difficultyOrder[b.difficulty] || 999);
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