import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import type { Skill } from '@shared/schema';

interface SkillsBarChartProps {
  skills: Skill[];
  className?: string;
}

export default function SkillsBarChart({ skills, className = "" }: SkillsBarChartProps) {
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

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: skills.map(skill => skill.name),
        datasets: [{
          label: '经验值',
          data: skills.map(skill => skill.exp),
          backgroundColor: skills.map(skill => skill.color + '80'),
          borderColor: skills.map(skill => skill.color),
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: '#F3F4F6'
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: '#9CA3AF'
            },
            grid: {
              color: '#374151'
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: '#9CA3AF'
            },
            grid: {
              color: '#374151'
            }
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

  return (
    <div className={`h-80 ${className}`}>
      <canvas ref={canvasRef}></canvas>
    </div>
  );
}
