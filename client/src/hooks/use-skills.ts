import { useQuery } from "@tanstack/react-query";
import type { Skill } from "@shared/schema";

export function useSkills() {
  return useQuery<Skill[]>({
    queryKey: ['/api/data?type=skills'],
  });
}

export function useSkillHelpers(skills: Skill[] = []) {
  const getSkillName = (skillId?: number | null) => {
    if (!skillId) return "";
    const skill = skills.find(s => s.id === skillId);
    return skill?.name || "";
  };

  const getSkillColor = (skillId?: number | null) => {
    if (!skillId) return "#6B7280";
    const skill = skills.find(s => s.id === skillId);
    return skill?.color || "#6B7280";
  };

  const getSkillIcon = (skillId?: number | null) => {
    if (!skillId) return "fas fa-star";
    const skill = skills.find(s => s.id === skillId);
    return skill?.icon || "fas fa-star";
  };

  return {
    getSkillName,
    getSkillColor,
    getSkillIcon
  };
}