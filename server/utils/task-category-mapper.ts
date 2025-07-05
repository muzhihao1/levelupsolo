// Utility to map various task category values to standard ones

export function normalizeTaskCategory(category: string | null | undefined): string {
  if (!category) return 'todo'; // Default to todo if no category
  
  const lowercaseCategory = category.toLowerCase().trim();
  
  // Map various values to standard categories
  const categoryMappings: Record<string, string> = {
    // Todo/Side quest variations
    'todo': 'todo',
    'side': 'todo',
    'sidequest': 'todo',
    'side quest': 'todo',
    'side_quest': 'todo',
    'task': 'todo',
    'once': 'todo',
    'single': 'todo',
    
    // Habit variations
    'habit': 'habit',
    'daily': 'habit',
    'routine': 'habit',
    'recurring': 'habit',
    'repeat': 'habit',
    
    // Goal/Main quest variations
    'goal': 'goal',
    'main': 'goal',
    'mainquest': 'goal',
    'main quest': 'goal',
    'main_quest': 'goal',
    'objective': 'goal',
    'project': 'goal'
  };
  
  return categoryMappings[lowercaseCategory] || 'todo';
}

// Map task type if needed
export function normalizeTaskType(type: string | null | undefined, category: string): string {
  if (!type) {
    // Infer type from category
    return category === 'habit' ? 'daily' : 'once';
  }
  
  const lowercaseType = type.toLowerCase().trim();
  
  const typeMappings: Record<string, string> = {
    'once': 'once',
    'single': 'once',
    'one-time': 'once',
    'onetime': 'once',
    
    'daily': 'daily',
    'recurring': 'daily',
    'repeat': 'daily',
    'routine': 'daily'
  };
  
  return typeMappings[lowercaseType] || 'once';
}