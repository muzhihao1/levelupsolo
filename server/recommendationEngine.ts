import { UserState, MicroTask, TaskRecommendation } from '../shared/schema';

export class RecommendationEngine {
  static recommendTasks(
    userState: UserState,
    availableMicroTasks: MicroTask[],
    userHistory: any[]
  ): TaskRecommendation[] {
    const recommendations: TaskRecommendation[] = [];

    // 基于用户状态过滤任务
    const suitableTasks = availableMicroTasks.filter(task => {
      // 根据精力水平过滤
      if (userState.energyLevel === 'low' && task.difficulty === 'hard') {
        return false;
      }

      // 根据可用时间过滤
      if (task.duration > userState.availableTime) {
        return false;
      }

      return true;
    });

    // 为每个合适的任务计算推荐分数
    const scoredTasks = suitableTasks.map(task => {
      const score = this.calculateTaskScore(task, userState, userHistory);
      const reason = this.generateRecommendationReason(task, userState);

      return {
        taskId: task.id,
        reason,
        confidence: score,
        type: 'micro' as const,
        task
      };
    });

    // 按分数排序并返回前3个
    return scoredTasks
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3)
      .map(({ task, ...rec }) => rec);
  }

  private static calculateTaskScore(
    task: MicroTask,
    userState: UserState,
    userHistory: any[]
  ): number {
    let score = 0.5; // 基础分数

    // 根据精力水平调整分数
    if (userState.energyLevel === 'high' && task.difficulty === 'hard') {
      score += 0.3;
    } else if (userState.energyLevel === 'medium' && task.difficulty === 'medium') {
      score += 0.2;
    } else if (userState.energyLevel === 'low' && task.difficulty === 'easy') {
      score += 0.3;
    }

    // 根据时间匹配度调整分数
    const timeMatch = Math.min(userState.availableTime / task.duration, 1);
    score += timeMatch * 0.2;

    // 根据心情调整分数
    if (userState.mood === 'good') {
      score += 0.1;
    } else if (userState.mood === 'tired' && task.difficulty === 'easy') {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  private static generateRecommendationReason(
    task: MicroTask,
    userState: UserState
  ): string {
    const reasons = [];

    if (userState.energyLevel === 'high' && task.difficulty === 'hard') {
      reasons.push('您精力充沛，适合挑战性任务');
    } else if (userState.energyLevel === 'low' && task.difficulty === 'easy') {
      reasons.push('轻松任务，适合当前状态');
    }

    if (task.duration <= userState.availableTime / 2) {
      reasons.push('时间充裕，可以从容完成');
    }

    if (userState.mood === 'good') {
      reasons.push('心情不错，是学习的好时机');
    }

    if (reasons.length === 0) {
      reasons.push('基于您的当前状态推荐');
    }

    return reasons.join('，');
  }

  // 生成热身任务推荐
  static recommendWarmupTasks(userState: UserState): TaskRecommendation[] {
    const warmupReasons = [
      '先从简单的开始，帮助您进入状态',
      '这个任务可以快速获得成就感',
      '适合作为今天的开始'
    ];

    return [
      {
        taskId: 'warmup_1',
        reason: warmupReasons[0],
        confidence: 0.9,
        type: 'warmup'
      },
      {
        taskId: 'warmup_2', 
        reason: warmupReasons[1],
        confidence: 0.8,
        type: 'warmup'
      }
    ];
  }
}

export async function getRecommendations(userId: string, userState: any): Promise<TaskRecommendation[]> {
  console.log('Generating recommendations for state:', userState);

  const recommendations: TaskRecommendation[] = [];

  // 确保至少有一个推荐
  const baseRecommendations = [
    {
      taskId: `rec-${Date.now()}-1`,
      reason: '基于您当前的状态，这是一个合适的学习任务',
      confidence: 0.8,
      type: 'micro' as const
    },
    {
      taskId: `rec-${Date.now()}-2`,
      reason: '适合当前时间安排的任务',
      confidence: 0.75,
      type: 'warmup' as const
    },
    {
      taskId: `rec-${Date.now()}-3`,
      reason: '推荐的进阶任务',
      confidence: 0.7,
      type: 'milestone' as const
    }
  ];

  // 基于能量等级调整推荐
  if (userState.energyLevel === 'high') {
    baseRecommendations[0].reason = '您当前精力充沛，适合处理具有挑战性的任务';
    baseRecommendations[0].confidence = 0.9;
    baseRecommendations[0].type = 'milestone';
  } else if (userState.energyLevel === 'low') {
    baseRecommendations[0].reason = '当前精力较低，建议从简单的任务开始';
    baseRecommendations[0].confidence = 0.8;
    baseRecommendations[0].type = 'warmup';
  }

  // 基于可用时间调整
  if (userState.availableTime <= 15) {
    baseRecommendations[1].reason = '时间有限，推荐快速完成的任务';
    baseRecommendations[1].confidence = 0.85;
    baseRecommendations[1].type = 'micro';
  } else if (userState.availableTime >= 60) {
    baseRecommendations[1].reason = '您有充足的时间，可以进行深度工作';
    baseRecommendations[1].confidence = 0.9;
    baseRecommendations[1].type = 'milestone';
  }

  // 基于心情调整
  if (userState.mood === 'tired') {
    baseRecommendations[2].reason = '心情疲惫时，建议选择轻松的任务';
    baseRecommendations[2].confidence = 0.7;
    baseRecommendations[2].type = 'warmup';
  } else if (userState.mood === 'good') {
    baseRecommendations[2].reason = '心情不错，可以挑战一些有趣的任务';
    baseRecommendations[2].confidence = 0.85;
    baseRecommendations[2].type = 'milestone';
  }

  recommendations.push(...baseRecommendations);

  console.log('Generated recommendations:', recommendations);
  return recommendations;
}