import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import type { Skill } from '@shared/schema';

interface SkillsRadarChartProps {
  skills: Skill[];
  className?: string;
}

export default function SkillsRadarChart({ skills, className = "" }: SkillsRadarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !skills.length) return;

    // Destroy existing chart
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Enhanced skill colors with gradients
    const skillColorMap = {
      "身体掌控力": "#ef4444",
      "情绪稳定力": "#8b5cf6", 
      "心智成长力": "#06b6d4",
      "关系经营力": "#10b981",
      "财富掌控力": "#f59e0b",
      "意志执行力": "#a855f7"
    };

    // Create radial gradient for the chart area
    const gradient = ctx.createRadialGradient(200, 200, 0, 200, 200, 150);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.15)');
    gradient.addColorStop(0.7, 'rgba(99, 102, 241, 0.05)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0.02)');

    chartRef.current = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: skills.map(skill => skill.name),
        datasets: [
          {
            label: '技能等级',
            data: skills.map(skill => skill.level),
            backgroundColor: gradient,
            borderColor: '#6366f1',
            borderWidth: 3,
            pointBackgroundColor: skills.map(skill => 
              skillColorMap[skill.name as keyof typeof skillColorMap] || skill.color || '#6366f1'
            ),
            pointBorderColor: '#ffffff',
            pointBorderWidth: 3,
            pointRadius: 8,
            pointHoverRadius: 12,
            pointHoverBackgroundColor: skills.map(skill => 
              skillColorMap[skill.name as keyof typeof skillColorMap] || skill.color || '#6366f1'
            ),
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 4,
            fill: true,
            tension: 0.2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'point'
        },
        scales: {
          r: {
            beginAtZero: true,
            max: 10,
            min: 0,
            ticks: {
              color: 'rgba(148, 163, 184, 0.7)',
              stepSize: 2,
              backdropColor: 'transparent',
              font: {
                size: 12,
                weight: 500
              },
              display: true,
              showLabelBackdrop: false,
              z: 1
            },
            grid: {
              color: 'rgba(148, 163, 184, 0.25)',
              lineWidth: 1.5,
              circular: true
            },
            angleLines: {
              color: 'rgba(148, 163, 184, 0.3)',
              lineWidth: 1.5
            },
            pointLabels: {
              color: '#e2e8f0',
              font: {
                size: 14,
                weight: 600
              },
              padding: 25
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#f1f5f9',
            bodyColor: '#cbd5e1',
            borderColor: '#334155',
            borderWidth: 1,
            cornerRadius: 12,
            padding: 16,
            displayColors: false,
            titleFont: {
              size: 16,
              weight: 'bold'
            },
            bodyFont: {
              size: 14
            },
            callbacks: {
              title: function(context) {
                return context[0].label;
              },
              label: function(context) {
                const skill = skills[context.dataIndex];
                const progress = skill.maxExp > 0 ? Math.round((skill.exp / skill.maxExp) * 100) : 0;
                return [
                  `等级: Lv.${skill.level}`,
                  `经验: ${skill.exp}/${skill.maxExp}`,
                  `进度: ${progress}%`
                ];
              }
            }
          }
        },
        elements: {
          line: {
            borderJoinStyle: 'round',
            borderCapStyle: 'round'
          },
          point: {
            hoverBorderWidth: 4
          }
        }
      }
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [skills]);

  if (!skills.length) {
    return (
      <div className={`flex items-center justify-center h-96 text-gray-400 ${className}`}>
        <div className="text-center">
          <div className="text-5xl mb-4">🎯</div>
          <div className="text-lg">暂无技能数据</div>
          <div className="text-sm text-gray-500 mt-2">完成任务后将显示技能成长图表</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Enhanced Chart Container - Matching right side card height */}
      <div className="relative bg-gradient-to-br from-slate-800/30 to-slate-900/50 rounded-2xl p-6 border border-slate-700/50 h-full">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 to-purple-900/10 rounded-2xl" />
        <div className="relative h-full">
          <canvas ref={canvasRef}></canvas>
        </div>
      </div>
    </div>
  );
}
