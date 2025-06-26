
export interface MicroTaskTemplate {
  title: string;
  description: string;
  duration: number;
  expReward: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export class MicroTaskGenerator {
  // 基于里程碑生成微任务
  static generateMicroTasks(milestone: string, category: string): MicroTaskTemplate[] {
    const templates = this.getTemplatesByCategory(category);
    
    // 使用简单的关键词匹配来生成相关微任务
    const relevantTemplates = templates.filter(template => 
      this.isRelevantToMilestone(template, milestone)
    );
    
    // 确保至少有3-5个微任务
    while (relevantTemplates.length < 3) {
      relevantTemplates.push(...this.getDefaultTemplates());
    }
    
    return relevantTemplates.slice(0, 5);
  }
  
  // 生成热身任务
  static generateWarmupTasks(goalTitle: string, category: string): MicroTaskTemplate[] {
    const warmupTemplates = [
      {
        title: `了解 ${goalTitle} 的基本概念`,
        description: `花2分钟快速浏览相关资料`,
        duration: 2,
        expReward: 5,
        difficulty: 'easy' as const
      },
      {
        title: `准备学习环境`,
        description: `整理桌面，准备必要的工具和资料`,
        duration: 5,
        expReward: 5,
        difficulty: 'easy' as const
      },
      {
        title: `制定今日小目标`,
        description: `明确今天要完成的具体任务`,
        duration: 3,
        expReward: 5,
        difficulty: 'easy' as const
      }
    ];
    
    return warmupTemplates;
  }
  
  private static getTemplatesByCategory(category: string): MicroTaskTemplate[] {
    const categoryTemplates: Record<string, MicroTaskTemplate[]> = {
      '心智成长力': [
        {
          title: '阅读基础概念',
          description: '花5分钟阅读相关的基础概念',
          duration: 5,
          expReward: 8,
          difficulty: 'easy'
        },
        {
          title: '做简单练习',
          description: '完成一个简单的练习题',
          duration: 10,
          expReward: 12,
          difficulty: 'medium'
        },
        {
          title: '总结学习要点',
          description: '用自己的话总结今天学到的内容',
          duration: 8,
          expReward: 10,
          difficulty: 'medium'
        }
      ],
      '意志执行力': [
        {
          title: '制定执行计划',
          description: '分解任务并制定具体的执行步骤',
          duration: 8,
          expReward: 10,
          difficulty: 'medium'
        },
        {
          title: '完成第一步行动',
          description: '立即执行计划中的第一个具体行动',
          duration: 15,
          expReward: 15,
          difficulty: 'medium'
        }
      ],
      'default': [
        {
          title: '快速回顾',
          description: '回顾之前的进展',
          duration: 5,
          expReward: 5,
          difficulty: 'easy'
        },
        {
          title: '实践操作',
          description: '进行实际的操作练习',
          duration: 10,
          expReward: 10,
          difficulty: 'medium'
        }
      ]
    };
    
    return categoryTemplates[category] || categoryTemplates.default;
  }
  
  private static isRelevantToMilestone(template: MicroTaskTemplate, milestone: string): boolean {
    // 简单的关键词匹配逻辑
    const milestoneWords = milestone.toLowerCase().split(' ');
    const templateWords = template.title.toLowerCase().split(' ');
    
    return milestoneWords.some(word => templateWords.includes(word));
  }
  
  private static getDefaultTemplates(): MicroTaskTemplate[] {
    return [
      {
        title: '快速复习',
        description: '回顾相关内容',
        duration: 5,
        expReward: 5,
        difficulty: 'easy'
      }
    ];
  }
}
