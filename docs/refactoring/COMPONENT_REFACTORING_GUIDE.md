# Component Refactoring Guide

## Refactoring `unified-rpg-task-manager.tsx`

The main task manager component is currently 1973 lines. This guide outlines how to break it down into manageable pieces.

### Current Structure Analysis

The component currently handles:
1. Task display and filtering
2. Task creation (manual and AI)
3. Task completion logic
4. Habit management
5. Energy ball system
6. Pomodoro timer
7. Skill progression
8. Stats display
9. Data fetching

### Proposed Component Structure

```
components/
└── task-manager/
    ├── index.tsx                    # Main container (300 lines max)
    ├── TaskManagerProvider.tsx      # Context for shared state
    ├── hooks/
    │   ├── useTaskData.ts          # Data fetching logic
    │   ├── useTaskMutations.ts     # Create/update/delete operations
    │   ├── useEnergySystem.ts      # Energy ball logic
    │   └── usePomodoroTimer.ts     # Timer functionality
    ├── components/
    │   ├── TaskList/
    │   │   ├── index.tsx           # Task list container
    │   │   ├── TaskCard.tsx        # Individual task display
    │   │   ├── TaskFilters.tsx     # Filtering UI
    │   │   └── TaskTabs.tsx        # Tab navigation
    │   ├── TaskCreation/
    │   │   ├── index.tsx           # Creation form container
    │   │   ├── ManualTaskForm.tsx  # Manual task input
    │   │   ├── AITaskCreator.tsx   # AI-powered creation
    │   │   └── TaskCategorySelect.tsx
    │   ├── EnergySystem/
    │   │   ├── EnergyDisplay.tsx   # Energy balls visualization
    │   │   ├── EnergyStatus.tsx    # Status messages
    │   │   └── EnergyRestore.tsx   # Restore functionality
    │   ├── PomodoroTimer/
    │   │   ├── index.tsx           # Timer container
    │   │   ├── TimerDisplay.tsx    # Time display
    │   │   ├── TimerControls.tsx   # Play/pause/reset
    │   │   └── TimerSettings.tsx   # Duration settings
    │   └── shared/
    │       ├── LoadingState.tsx     # Loading spinner
    │       ├── ErrorBoundary.tsx    # Error handling
    │       └── EmptyState.tsx       # No tasks message
    └── constants/
        ├── taskCategories.ts        # TASK_CATEGORIES
        ├── difficultyLevels.ts      # DIFFICULTY_LEVELS
        └── gameConfig.ts            # Energy, XP, etc.
```

### Step-by-Step Refactoring Plan

#### Phase 1: Extract Constants and Types (Day 1)

1. **Create constants files:**
```typescript
// constants/taskCategories.ts
export const TASK_CATEGORIES = {
  goal: { name: "目标", icon: "🎯", color: "blue", description: "长期主线目标任务" },
  todo: { name: "待办", icon: "✅", color: "purple", description: "一次性任务，完成后消除" },
  habit: { name: "习惯", icon: "🔄", color: "green", description: "可重复完成，建立长期习惯" }
} as const;

// constants/gameConfig.ts
export const GAME_CONFIG = {
  ENERGY: {
    MAX_DAILY: 18,
    PER_MINUTE: 15,
    DURATION_PER_BALL: 15
  },
  POMODORO: {
    DEFAULT_WORK: 25 * 60,
    DEFAULT_BREAK: 5 * 60
  },
  XP: {
    DEFAULT_REWARD: 20,
    LEVEL_MULTIPLIER: 100
  }
} as const;
```

2. **Extract interfaces:**
```typescript
// types/task.types.ts
export interface TaskCardProps {
  task: Task;
  onComplete: (taskId: number) => void;
  onDelete: (taskId: number) => void;
  onStartPomodoro?: (taskId: number) => void;
  // ... other props
}
```

#### Phase 2: Extract Custom Hooks (Day 2)

1. **Data fetching hook:**
```typescript
// hooks/useTaskData.ts
export function useTaskData() {
  const tasksQuery = useQuery<Task[]>({
    queryKey: ["/api/data?type=tasks"],
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });
  
  const skillsQuery = useQuery<Skill[]>({
    queryKey: ["/api/data?type=skills"],
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
  
  // ... other queries
  
  return {
    tasks: tasksQuery.data || [],
    skills: skillsQuery.data || [],
    isLoading: tasksQuery.isLoading || skillsQuery.isLoading,
    error: tasksQuery.error || skillsQuery.error
  };
}
```

2. **Task mutations hook:**
```typescript
// hooks/useTaskMutations.ts
export function useTaskMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const createTask = useMutation({
    mutationFn: async (taskData: CreateTaskInput) => {
      return apiRequest("POST", "/api/tasks", taskData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["/api/data?type=tasks"]);
      toast({ title: "任务创建成功" });
    }
  });
  
  // ... other mutations
  
  return { createTask, updateTask, deleteTask };
}
```

#### Phase 3: Extract Components (Days 3-4)

1. **TaskCard component:**
```typescript
// components/TaskCard.tsx
export const TaskCard = memo(function TaskCard({ 
  task, 
  onComplete, 
  onDelete 
}: TaskCardProps) {
  const category = TASK_CATEGORIES[task.taskCategory];
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <span>{category.icon}</span>
          <h3>{task.title}</h3>
        </div>
      </CardHeader>
      <CardContent>
        {/* Task content */}
      </CardContent>
    </Card>
  );
});
```

2. **EnergyDisplay component:**
```typescript
// components/EnergySystem/EnergyDisplay.tsx
export function EnergyDisplay({ current, max }: EnergyProps) {
  const energyBalls = Array.from({ length: max }, (_, i) => ({
    id: i,
    filled: i < current
  }));
  
  return (
    <div className="flex gap-1">
      {energyBalls.map(ball => (
        <Battery
          key={ball.id}
          className={ball.filled ? "text-blue-500" : "text-gray-300"}
        />
      ))}
    </div>
  );
}
```

#### Phase 4: Create Context Provider (Day 5)

```typescript
// TaskManagerProvider.tsx
interface TaskManagerContextType {
  tasks: Task[];
  skills: Skill[];
  userStats: UserStats | null;
  isLoading: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TaskManagerContext = createContext<TaskManagerContextType | null>(null);

export function TaskManagerProvider({ children }: { children: ReactNode }) {
  const { tasks, skills, userStats, isLoading } = useTaskData();
  const [activeTab, setActiveTab] = useState('all');
  
  return (
    <TaskManagerContext.Provider value={{
      tasks,
      skills,
      userStats,
      isLoading,
      activeTab,
      setActiveTab
    }}>
      {children}
    </TaskManagerContext.Provider>
  );
}
```

#### Phase 5: Assemble Main Component (Day 5)

```typescript
// task-manager/index.tsx
export function UnifiedRPGTaskManager() {
  return (
    <TaskManagerProvider>
      <div className="container mx-auto p-4">
        <EnergySystem />
        <TaskTabs />
        <TaskCreation />
        <TaskList />
        <PomodoroTimer />
      </div>
    </TaskManagerProvider>
  );
}
```

### Benefits of This Refactoring

1. **Maintainability**: Each component has a single responsibility
2. **Testability**: Smaller units are easier to test
3. **Reusability**: Components can be used elsewhere
4. **Performance**: Better code splitting and lazy loading
5. **Developer Experience**: Easier to understand and modify

### Migration Strategy

1. **Don't break existing functionality** - Keep old component until new one is ready
2. **Test incrementally** - Test each extracted component
3. **Use feature flags** - Toggle between old and new implementation
4. **Monitor performance** - Ensure no regressions

### Code Quality Checklist

- [ ] Each component < 300 lines
- [ ] Single responsibility principle
- [ ] Props are properly typed
- [ ] No direct DOM manipulation
- [ ] Proper error boundaries
- [ ] Memoization where needed
- [ ] Accessibility attributes
- [ ] Unit tests for logic
- [ ] Component tests for UI
- [ ] Documentation comments

### Common Pitfalls to Avoid

1. **Over-abstraction**: Don't create too many tiny components
2. **Prop drilling**: Use context for deeply nested data
3. **Performance**: Don't break memoization chains
4. **State management**: Keep state close to where it's used
5. **Side effects**: Use proper cleanup in useEffect

This refactoring will transform the monolithic component into a maintainable, testable, and scalable architecture.