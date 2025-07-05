# Active Files Guide - Level Up Solo

> Last Updated: 2025-07-04
> Purpose: Quick reference for which files are currently in use

## ✅ Active Components (Currently Used)

### Core UI Components
```
client/src/components/
├── unified-rpg-task-manager.tsx    ✅ ACTIVE - Main task management UI
├── rpg-character-dashboard.tsx     ✅ ACTIVE - Character stats display
├── nav-bar.tsx                     ✅ ACTIVE - Navigation
├── theme-provider.tsx               ✅ ACTIVE - Dark mode support
└── ui/                              ✅ ACTIVE - shadcn/ui components
```

### Page Components
```
client/src/pages/
├── dashboard.tsx                    ✅ ACTIVE - Main dashboard
├── goals-simple.tsx                 ✅ ACTIVE - Goals page (current version)
├── growth-log.tsx                   ✅ ACTIVE - Activity log
├── profile.tsx                      ✅ ACTIVE - User profile
├── settings.tsx                     ✅ ACTIVE - Settings page
└── skills.tsx                       ✅ ACTIVE - Skills display
```

### Backend Routes
```
server/
├── routes.ts                        ✅ ACTIVE - All API routes
├── storage.ts                       ✅ ACTIVE - Database operations
├── simpleAuth.ts                    ✅ ACTIVE - Authentication
├── ai.ts                            ✅ ACTIVE - AI integration
├── recommendationEngine.ts          ✅ ACTIVE - Task recommendations
└── db.ts                            ✅ ACTIVE - Database connection
```

## ❌ Deprecated Components (To Be Removed)

### Old Task Managers
```
client/src/components/
├── hierarchical-task-manager.tsx    ❌ DEPRECATED - Old version
├── enhanced-hierarchical-task-manager.tsx ❌ DEPRECATED
├── unified-task-manager.tsx         ❌ DEPRECATED - Previous iteration
├── habitica-task-manager.tsx        ❌ DEPRECATED - Experiment
├── enhanced-task-card.tsx           ❌ DEPRECATED
└── optimized-task-card.tsx          ❌ DEPRECATED
```

### Old Pages
```
client/src/pages/
├── goals.tsx                        ❌ DEPRECATED - Use goals-simple.tsx
└── goals-new.tsx                    ❌ DEPRECATED - Incomplete version
```

### Unused Backend Files
```
server/
├── auth-jwt.ts                      ❌ DEPRECATED - Using simpleAuth.ts
├── auth-simple.ts                   ❌ DEPRECATED - Duplicate
├── routes-backup.ts                 ❌ DEPRECATED - Old backup
└── railway-server.js.backup         ❌ DEPRECATED - Old config
```

## ⚠️ Files to Clean Up

### Root Directory Clutter
```
/
├── *.sql                            ⚠️ MOVE to scripts/database/
├── *debug*.js                       ⚠️ MOVE to scripts/debug/
├── *test*.js                        ⚠️ MOVE to scripts/debug/
├── *.txt                            ⚠️ DELETE - Contains sensitive data
├── server.log                       ⚠️ DELETE - Runtime file
└── server.pid                       ⚠️ DELETE - Runtime file
```

### Documentation Cleanup
```
docs/
├── *iOS*.md                         ⚠️ MOVE to iOS project
├── fixes/*.md                       ⚠️ KEEP - Valuable history
├── deployment/*.md                  ⚠️ KEEP - Deployment guides
└── database/*.md                    ⚠️ KEEP - Schema docs
```

## 📋 Quick Decision Guide

### When Adding New Features
1. **Task-related**: Modify `unified-rpg-task-manager.tsx`
2. **New page**: Create in `client/src/pages/`
3. **API endpoint**: Add to `server/routes.ts`
4. **Database operation**: Add to `server/storage.ts`
5. **UI component**: Add to `client/src/components/ui/`

### When Fixing Bugs
1. Check `docs/fixes/` for similar issues
2. Use active components only
3. Don't modify deprecated files
4. Add fix documentation

### When Refactoring
1. Follow `docs/refactoring/COMPONENT_REFACTORING_GUIDE.md`
2. Don't create new versions alongside old ones
3. Replace, don't duplicate
4. Update this guide after changes

## 🚀 Recommended Actions

### Immediate (Do Now)
```bash
# 1. Remove deprecated components
rm client/src/components/hierarchical-task-manager.tsx
rm client/src/components/enhanced-hierarchical-task-manager.tsx
rm client/src/components/unified-task-manager.tsx
rm client/src/components/habitica-task-manager.tsx

# 2. Clean root directory
rm *.txt *.log *.pid

# 3. Organize SQL files
mkdir -p scripts/database
mv *.sql scripts/database/
```

### Next Sprint
1. Refactor `unified-rpg-task-manager.tsx` into smaller components
2. Consolidate authentication to single implementation
3. Remove all console.log statements
4. Add proper TypeScript types (remove `any`)

## 📁 Ideal Structure (Target)

```
levelupsolo/
├── client/
│   └── src/
│       ├── components/
│       │   ├── task-manager/    # Refactored components
│       │   ├── shared/          # Reusable components
│       │   └── ui/              # shadcn components
│       ├── hooks/               # Custom React hooks
│       ├── pages/               # Route pages
│       └── lib/                 # Utilities
├── server/
│   ├── routes/                  # Organized routes
│   ├── services/                # Business logic
│   └── middleware/              # Express middleware
└── shared/
    └── schema.ts                # Shared types
```

## ⚡ Component Status Reference

| Component | Status | Action | Priority |
|-----------|---------|---------|----------|
| unified-rpg-task-manager | ✅ Active | Refactor | High |
| hierarchical-task-manager | ❌ Deprecated | Delete | High |
| enhanced-hierarchical-task-manager | ❌ Deprecated | Delete | High |
| unified-task-manager | ❌ Deprecated | Delete | High |
| habitica-task-manager | ❌ Deprecated | Delete | High |
| goals-simple | ✅ Active | Keep | - |
| goals | ❌ Deprecated | Delete | Medium |
| goals-new | ❌ Deprecated | Delete | Medium |

## 🔍 How to Identify Active vs Deprecated

1. **Check imports**: Active files are imported in `App.tsx`
2. **Check routes**: Active pages are in router configuration
3. **Check last modified**: Files not touched in 30+ days likely deprecated
4. **Check git history**: Multiple "fix" commits indicate active use

Remember: When in doubt, check `client/src/App.tsx` for what's actually being used!