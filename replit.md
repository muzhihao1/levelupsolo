# LevelUp Solo - Replit Development Guide

## Overview
LevelUp Solo is a gamified personal growth platform that transforms task management and skill development into an immersive RPG experience. The application combines intelligent AI assistance with game mechanics to motivate continuous learning and self-improvement.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type-safe component development
- **Build Tool**: Vite for fast development and optimized production builds
- **Styling**: Tailwind CSS with custom design system and dark theme support
- **State Management**: TanStack React Query for server state management and caching
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Routing**: Wouter for lightweight client-side routing

### Backend Architecture
- **Runtime**: Node.js with Express.js REST API server
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Replit OpenID Connect integration for secure user authentication
- **AI Integration**: OpenAI GPT-4o for intelligent task creation and goal planning
- **Session Management**: PostgreSQL-backed session storage with connect-pg-simple

### Database Design
- **Core Tables**: users, userStats, skills, tasks, goals, milestones
- **Supporting Tables**: achievements, activityLogs, sessions, userProfiles
- **Key Features**: Foreign key constraints, indexing, and proper normalization

## Key Components

### Gamification System
- **Energy Ball System**: 15-minute focus units replacing traditional HP concept
- **Six Core Skills**: Body Control, Emotional Stability, Mental Growth, Relationship Management, Wealth Control, Will Execution
- **Experience & Leveling**: Task completion grants XP and skill progression
- **Achievement System**: Milestone tracking with rare badges and rewards

### Task Management
- **Three Task Types**:
  - Main Quests: Long-term core objectives
  - Side Quests: One-time completion tasks
  - Habits: Daily repeatable habit formation
- **Hierarchical Structure**: Main goals → Stage tasks → Daily tasks
- **Pomodoro Integration**: 25-minute focus sessions with battle-like experience

### Intelligent Features
- **AI Task Creation**: GPT-4o automatically categorizes tasks and assigns relevant skills
- **Smart Goal Planning**: AI generates actionable milestones and execution steps
- **Natural Language Processing**: Users can input tasks in natural language for AI parsing
- **Proactive Suggestions**: AI provides contextual recommendations based on user progress

## Data Flow

### Authentication Flow
```
Landing Page → Replit Auth → User Session → Dashboard
```

### Task Completion Flow
```
Task Creation (AI/Manual) → Task Storage → Skill XP Update → User Stats Update → Achievement Check
```

### Goal Management Flow
```
AI Goal Creation → Milestone Generation → Progress Tracking → Reward Distribution
```

### Skill Progression Flow
```
Task Completion → XP Gain → Skill Level Up → Achievement Unlock → Stat Update
```

## External Dependencies

### Core Dependencies
- **Authentication**: Replit OpenID Connect
- **AI Services**: OpenAI GPT-4o API
- **Database**: PostgreSQL (via Replit hosting)
- **Frontend**: React ecosystem (React Query, Radix UI, Tailwind)
- **Backend**: Express.js with TypeScript support

### Development Tools
- **Build**: Vite with ESBuild for production bundling
- **Database**: Drizzle Kit for migrations and schema management
- **TypeScript**: Strict type checking across frontend and backend
- **Styling**: PostCSS with Tailwind CSS processing

## Deployment Strategy

### Production Environment
- **Platform**: Replit Autoscale deployment
- **Build Process**: `npm run build` - Vite frontend build + ESBuild backend bundle
- **Runtime**: `npm run start` - Production Node.js server
- **Port Configuration**: Internal port 5000 mapped to external port 80
- **Environment**: Production mode with secure session cookies and HTTPS

### Development Environment
- **Command**: `npm run dev` - Development server with hot reload
- **Features**: Vite HMR, TypeScript watch mode, development error overlay
- **Database**: Shared PostgreSQL instance with development data

### Security Configuration
- **HTTPS**: Enforced with HSTS headers and SSL certificate
- **CSP**: Comprehensive Content Security Policy
- **Session Security**: Secure cookies, CSRF protection, proper session management
- **CORS**: Configured for production domain allowlist

## Changelog
- June 24, 2025. Initial setup
- June 24, 2025. Warm-up task functionality implemented
  - Added warmupTasks table to database schema with taskId reference
  - Created API endpoints for warm-up task CRUD operations
  - Integrated warm-up tasks into task page with "start challenge" functionality
  - Moved warm-up tasks from goals to main tasks based on user feedback
  - Added AI-powered warm-up task generation based on main task content
  - Implemented task completion tracking with experience rewards
  - Goals page now focuses only on milestone progress tracking
- June 25, 2025. Migrated to micro tasks system
  - Renamed warmupTasks to microTasks table in database
  - Updated all API endpoints from warmup-tasks to micro-tasks
  - Modified UI to show "微任务" button only for main tasks (goal-related)
  - Removed micro task functionality from habits and side quests to keep them clean
  - Changed button styling from orange to blue for micro tasks
  - Fixed all compilation errors and component references
  - Fixed habit completion bugs preventing multiple daily completions
  - Enhanced task deletion to properly cascade related records
  - Improved date handling for habit streak tracking

## User Preferences
Preferred communication style: Simple, everyday language.