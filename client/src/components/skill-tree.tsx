import { useMemo, memo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SkillNode {
  id: number;
  name: string;
  level: number;
  exp: number;
  maxExp: number;
  color: string;
  icon: string;
  x: number;
  y: number;
  unlocked: boolean;
  prerequisites?: number[];
}

interface SkillTreeProps {
  skills: Array<{
    id: number;
    name: string;
    level: number;
    exp: number;
    maxExp: number;
    color: string;
    icon: string;
  }>;
}

// 单个技能节点组件
const SkillNode = memo(({ node }: { node: SkillNode }) => (
  <Card
    className={`absolute bg-slate-800 border-slate-700 p-2 min-w-32 ${
      node.unlocked ? 'hover:bg-slate-700' : 'opacity-50'
    } transition-all duration-200`}
    style={{ left: node.x - 64, top: node.y + 20 }}
  >
    <CardContent className="p-2">
      <div className="flex items-center space-x-2">
        <i className={`${node.icon} text-sm`} style={{ color: node.color }}></i>
        <div>
          <h4 className="text-xs font-medium text-white">{node.name}</h4>
          <div className="flex items-center space-x-1">
            <Badge variant="secondary" className="text-xs px-1 py-0">
              Lv.{node.level}
            </Badge>
            <span className="text-xs text-gray-400">
              {node.exp}/{node.maxExp}
            </span>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
));

// 连接线组件
const ConnectionLines = memo(({ skillNodes }: { skillNodes: SkillNode[] }) => (
  <>
    {skillNodes.map(node => 
      node.prerequisites?.map((prereqId, connIndex) => {
        const prereqNode = skillNodes.find(n => n.id === prereqId);
        if (!prereqNode) return null;

        return (
          <g key={`connection-${node.id}-${prereqId}-${connIndex}`}>
            <defs>
              <linearGradient 
                id={`gradient-${node.id}-${prereqId}`} 
                x1="0%" y1="0%" x2="0%" y2="100%"
              >
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.8"/>
                <stop offset="100%" stopColor="#059669" stopOpacity="0.6"/>
              </linearGradient>
            </defs>
            <line
              x1={prereqNode.x}
              y1={prereqNode.y}
              x2={node.x}
              y2={node.y}
              stroke={`url(#gradient-${node.id}-${prereqId})`}
              strokeWidth="2"
              strokeDasharray={node.unlocked ? "0" : "5,5"}
              opacity={node.unlocked ? 0.8 : 0.4}
            />
          </g>
        );
      }) || []
    )}
  </>
));

function SkillTree({ skills }: SkillTreeProps) {
  const skillNodes = useMemo((): SkillNode[] => {
    // 创建更有层次感的技能树布局
    const skillCategories = {
      '基础技能': ['学习能力', '研究能力', '写作能力'],
      '进阶技能': ['编程开发', '设计能力', '项目管理'],
      '专精技能': ['数据分析', '沟通表达', '创新思维']
    };

    const nodes: SkillNode[] = [];
    let nodeId = 1;

    Object.entries(skillCategories).forEach(([category, skillNames], categoryIndex) => {
      skillNames.forEach((skillName, skillIndex) => {
        const existingSkill = skills.find(s => s.name === skillName);
        const uniqueId = existingSkill?.id || (1000 + categoryIndex * 10 + skillIndex);
        const skill = existingSkill || {
          id: uniqueId,
          name: skillName,
          level: 1,
          exp: 0,
          maxExp: 100,
          color: ['#06B6D4', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'][skillIndex % 6],
          icon: 'fas fa-star'
        };

        // 垂直布局：基础技能在底部，向上生长
        const yPosition = 320 - categoryIndex * 100; // 从底部向上
        const xPosition = 80 + skillIndex * 200; // 水平分布
        
        nodes.push({
          ...skill,
          id: uniqueId,
          x: xPosition,
          y: yPosition,
          unlocked: skill.level > 1 || skill.exp > 0,
          prerequisites: categoryIndex > 0 ? [nodes[nodes.length - skillNames.length]?.id] : undefined
        });
      });
    });

    return nodes;
  }, [skills]);

  return (
    <div className="relative w-full h-96 bg-slate-900 rounded-lg overflow-auto">
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 700 400"
        className="absolute inset-0"
      >
        {/* 层次标签 */}
        <text x="10" y="140" fill="#8B5CF6" fontSize="12" fontWeight="bold">专精技能</text>
        <text x="10" y="240" fill="#06B6D4" fontSize="12" fontWeight="bold">进阶技能</text>
        <text x="10" y="340" fill="#10B981" fontSize="12" fontWeight="bold">基础技能</text>
        
        {/* 绘制主干和分支连接线 - 树状生长效果 */}
        {skillNodes.map(node => 
          node.prerequisites?.map((prereqId, connIndex) => {
            const prereqNode = skillNodes.find(n => n.id === prereqId);
            if (!prereqNode) return null;

            return (
              <g key={`connection-${prereqId}-to-${node.id}-${connIndex}`}>
                {/* 垂直主干 */}
                <line
                  x1={prereqNode.x}
                  y1={prereqNode.y - 20}
                  x2={prereqNode.x}
                  y2={node.y + 20}
                  stroke={node.unlocked ? "#10b981" : "#374151"}
                  strokeWidth="3"
                  opacity={node.unlocked ? 0.8 : 0.3}
                />
                {/* 分支连接 */}
                <line
                  x1={prereqNode.x}
                  y1={node.y + 20}
                  x2={node.x}
                  y2={node.y + 20}
                  stroke={node.unlocked ? "#10b981" : "#374151"}
                  strokeWidth="2"
                  opacity={node.unlocked ? 0.8 : 0.3}
                />
                <line
                  x1={node.x}
                  y1={node.y + 20}
                  x2={node.x}
                  y2={node.y}
                  stroke={node.unlocked ? "#10b981" : "#374151"}
                  strokeWidth="2"
                  opacity={node.unlocked ? 0.8 : 0.3}
                />
              </g>
            );
          })
        )}

        {/* Draw skill nodes */}
        {skillNodes.map(node => (
          <g key={node.id}>
            <circle
              cx={node.x}
              cy={node.y}
              r="25"
              fill={node.unlocked ? node.color : "#374151"}
              stroke={node.unlocked ? "#ffffff" : "#6b7280"}
              strokeWidth="2"
              opacity={node.unlocked ? 1 : 0.5}
            />
            <text
              x={node.x}
              y={node.y + 5}
              textAnchor="middle"
              fill="white"
              fontSize="12"
              fontWeight="bold"
            >
              {node.level}
            </text>
          </g>
        ))}
      </svg>

      {/* Skill info cards */}
      {skillNodes.map(node => (
        <Card
          key={`card-${node.id}`}
          className={`absolute bg-slate-800 border-slate-700 p-2 min-w-32 ${
            node.unlocked ? '' : 'opacity-50'
          }`}
          style={{
            left: node.x + 35,
            top: node.y - 15,
            transform: 'translateY(-50%)'
          }}
        >
          <CardContent className="p-2">
            <div className="flex items-center space-x-2">
              <i className={`${node.icon} text-sm`} style={{ color: node.color }}></i>
              <div>
                <h4 className="text-xs font-medium text-white">{node.name}</h4>
                <div className="flex items-center space-x-1">
                  <Badge variant="secondary" className="text-xs px-1 py-0">
                    Lv.{node.level}
                  </Badge>
                  <span className="text-xs text-gray-400">
                    {node.exp}/{node.maxExp}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default memo(SkillTree);