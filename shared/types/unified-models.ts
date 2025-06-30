/**
 * Unified Type Definitions
 * 统一的类型定义
 * 
 * 这个文件定义了Web和iOS端共享的类型和枚举
 * 确保两端数据模型的一致性
 */

// =====================================================
// Enums - 枚举类型
// =====================================================

/**
 * Task Category - 任务分类
 * 必须与iOS端的TaskCategory枚举保持一致
 */
export const TaskCategory = {
  HABIT: 'habit',         // 习惯
  DAILY: 'daily',         // 每日任务
  TODO: 'todo',           // 待办事项
  MAIN_QUEST: 'mainQuest', // 主线任务
  SIDE_QUEST: 'sideQuest'  // 支线任务
} as const;

export type TaskCategoryType = typeof TaskCategory[keyof typeof TaskCategory];

/**
 * Task Type - 任务类型
 */
export const TaskType = {
  MAIN: 'main',     // 主线任务
  STAGE: 'stage',   // 阶段任务
  DAILY: 'daily',   // 每日任务
  SIMPLE: 'simple'  // 简单任务
} as const;

export type TaskTypeType = typeof TaskType[keyof typeof TaskType];

/**
 * Difficulty - 难度等级
 */
export const Difficulty = {
  TRIVIAL: 'trivial',
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard'
} as const;

export type DifficultyType = typeof Difficulty[keyof typeof Difficulty];

/**
 * Habit Direction - 习惯方向
 */
export const HabitDirection = {
  POSITIVE: 'positive',
  NEGATIVE: 'negative',
  BOTH: 'both'
} as const;

export type HabitDirectionType = typeof HabitDirection[keyof typeof HabitDirection];

/**
 * Recurring Pattern - 重复模式
 */
export const RecurringPattern = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  WEEKDAYS: 'weekdays'
} as const;

export type RecurringPatternType = typeof RecurringPattern[keyof typeof RecurringPattern];

/**
 * Core Skills - 六大核心技能
 */
export const CoreSkills = {
  PHYSICAL: '身体掌控力',
  MENTAL: '心智成长力',
  WILLPOWER: '意志执行力',
  RELATIONSHIP: '关系经营力',
  FINANCIAL: '财富掌控力',
  EMOTIONAL: '情绪稳定力'
} as const;

export type CoreSkillType = typeof CoreSkills[keyof typeof CoreSkills];

/**
 * Activity Log Actions - 活动日志动作类型
 */
export const ActivityAction = {
  TASK_COMPLETED: 'task_completed',
  SKILL_LEVELUP: 'skill_levelup',
  GOAL_COMPLETED: 'goal_completed',
  HABIT_COMPLETE: 'habit_complete',
  MILESTONE_REACHED: 'milestone_reached'
} as const;

export type ActivityActionType = typeof ActivityAction[keyof typeof ActivityAction];

// =====================================================
// Interfaces - 接口定义
// =====================================================

/**
 * Task Priority Range
 * 任务优先级范围：0-5
 */
export interface TaskPriority {
  value: number;
  min: 0;
  max: 5;
  default: 1;
}

/**
 * Energy Ball Configuration
 * 能量球系统配置
 */
export interface EnergyBallConfig {
  daily: number;          // 每日能量球数量
  duration: number;       // 单个能量球时长（分钟）
  peakStart: number;      // 高峰期开始时间（小时）
  peakEnd: number;        // 高峰期结束时间（小时）
}

/**
 * Experience Calculation
 * 经验值计算配置
 */
export interface ExperienceConfig {
  difficultyMultipliers: {
    [key in DifficultyType]: number;
  };
  streakBonus: {
    threshold: number;    // 连续天数阈值
    multiplier: number;   // 奖励倍数
  };
  levelFormula: (level: number) => number;
}

// =====================================================
// Type Guards - 类型守卫
// =====================================================

/**
 * 检查是否为有效的任务分类
 */
export function isValidTaskCategory(value: string): value is TaskCategoryType {
  return Object.values(TaskCategory).includes(value as TaskCategoryType);
}

/**
 * 检查是否为有效的难度等级
 */
export function isValidDifficulty(value: string): value is DifficultyType {
  return Object.values(Difficulty).includes(value as DifficultyType);
}

/**
 * 检查优先级是否在有效范围内
 */
export function isValidPriority(value: number): boolean {
  return value >= 0 && value <= 5 && Number.isInteger(value);
}

// =====================================================
// Mapping Functions - 映射函数
// =====================================================

/**
 * 将iOS的技能类型映射到核心技能名称
 */
export function mapSkillTypeToCoreName(skillType: string): CoreSkillType | null {
  const mapping: Record<string, CoreSkillType> = {
    'physical': CoreSkills.PHYSICAL,
    'mental': CoreSkills.MENTAL,
    'willpower': CoreSkills.WILLPOWER,
    'relationship': CoreSkills.RELATIONSHIP,
    'financial': CoreSkills.FINANCIAL,
    'emotional': CoreSkills.EMOTIONAL,
    // 中文映射
    '体能': CoreSkills.PHYSICAL,
    '智力': CoreSkills.MENTAL,
    '精神': CoreSkills.MENTAL,
    '意志': CoreSkills.WILLPOWER,
    '意志力': CoreSkills.WILLPOWER,
    '人际': CoreSkills.RELATIONSHIP,
    '关系': CoreSkills.RELATIONSHIP,
    '财务': CoreSkills.FINANCIAL,
    '理财': CoreSkills.FINANCIAL,
    '情绪': CoreSkills.EMOTIONAL,
    '情感': CoreSkills.EMOTIONAL
  };
  
  return mapping[skillType.toLowerCase()] || null;
}

/**
 * 获取难度对应的经验值倍数
 */
export function getDifficultyMultiplier(difficulty: DifficultyType): number {
  const multipliers: Record<DifficultyType, number> = {
    [Difficulty.TRIVIAL]: 0.5,
    [Difficulty.EASY]: 0.75,
    [Difficulty.MEDIUM]: 1.0,
    [Difficulty.HARD]: 1.5
  };
  
  return multipliers[difficulty] || 1.0;
}

/**
 * 获取难度对应的颜色
 */
export function getDifficultyColor(difficulty: DifficultyType): string {
  const colors: Record<DifficultyType, string> = {
    [Difficulty.TRIVIAL]: '#94A3B8',
    [Difficulty.EASY]: '#10B981',
    [Difficulty.MEDIUM]: '#F59E0B',
    [Difficulty.HARD]: '#EF4444'
  };
  
  return colors[difficulty] || '#6B7280';
}

// =====================================================
// Constants - 常量定义
// =====================================================

/**
 * 默认游戏配置
 */
export const DEFAULT_GAME_CONFIG = {
  energyBalls: {
    daily: 18,
    duration: 15,
    peakStart: 9,
    peakEnd: 12
  } as EnergyBallConfig,
  
  experience: {
    difficultyMultipliers: {
      [Difficulty.TRIVIAL]: 0.5,
      [Difficulty.EASY]: 0.75,
      [Difficulty.MEDIUM]: 1.0,
      [Difficulty.HARD]: 1.5
    },
    streakBonus: {
      threshold: 7,
      multiplier: 1.5
    },
    levelFormula: (level: number) => level * 100
  } as ExperienceConfig,
  
  priority: {
    value: 1,
    min: 0,
    max: 5,
    default: 1
  } as TaskPriority
};

// =====================================================
// Validation Schemas - 验证模式
// =====================================================

/**
 * Task validation rules
 * 任务验证规则
 */
export const TaskValidationRules = {
  title: {
    minLength: 1,
    maxLength: 200
  },
  description: {
    maxLength: 1000
  },
  expReward: {
    min: 0,
    max: 1000
  },
  requiredEnergyBalls: {
    min: 1,
    max: 18
  },
  estimatedDuration: {
    min: 5,
    max: 480 // 8 hours
  }
};

/**
 * Goal validation rules
 * 目标验证规则
 */
export const GoalValidationRules = {
  title: {
    minLength: 1,
    maxLength: 200
  },
  description: {
    maxLength: 2000
  },
  expReward: {
    min: 50,
    max: 5000
  },
  pomodoroExpReward: {
    min: 5,
    max: 50
  }
};

// =====================================================
// Export unified types for schema updates
// =====================================================

export interface UnifiedTaskFields {
  dueDate?: Date | null;        // 新增字段
  priority: number;              // 新增字段，默认值1
}

export interface UnifiedSkillFields {
  skillType?: string;            // iOS端缺失
  category?: string;             // iOS端缺失
  talentPoints: number;          // iOS端缺失
  prestige: number;              // iOS端缺失
  prerequisites?: number[];      // iOS端缺失
}