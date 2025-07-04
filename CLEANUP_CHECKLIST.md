# Level Up Solo - Cleanup Checklist

> Created: 2025-07-04
> Estimated Time: 1-2 weeks
> Priority: High

## Phase 1: Critical Security & Cleanup (Day 1-2) 🔴

### Security Issues
- [ ] Remove test user creation endpoint (`/api/test/create-user`)
- [ ] Add rate limiting to login endpoint
- [ ] Remove hardcoded passwords/secrets
- [ ] Add CSRF protection
- [ ] Secure all test endpoints with environment checks

### File Cleanup
- [ ] Delete all `.txt` files with database URLs
- [ ] Remove all `.log` and `.pid` files
- [ ] Run `bash scripts/cleanup/01-organize-files.sh`
- [ ] Move SQL files to `scripts/database/`
- [ ] Archive old debug logs (30+ days)

### Console Logging
- [ ] Remove all `console.log` from production code
- [ ] Replace with proper logging library
- [ ] Add environment-based logging levels

## Phase 2: Code Organization (Day 3-4) 🟡

### Component Consolidation
- [ ] Delete `hierarchical-task-manager.tsx`
- [ ] Delete `enhanced-hierarchical-task-manager.tsx`
- [ ] Delete `unified-task-manager.tsx`
- [ ] Delete `habitica-task-manager.tsx`
- [ ] Delete `enhanced-task-card.tsx`
- [ ] Delete `optimized-task-card.tsx`

### Page Cleanup
- [ ] Delete old `goals.tsx` (keep `goals-simple.tsx`)
- [ ] Delete `goals-new.tsx`
- [ ] Rename `goals-simple.tsx` to `goals.tsx`

### Backend Cleanup
- [ ] Delete `auth-jwt.ts` (duplicate)
- [ ] Delete `auth-simple.ts` (duplicate)
- [ ] Delete `routes-backup.ts`
- [ ] Delete `railway-server.js.backup`

### Documentation
- [ ] Move iOS docs to `docs/archive/`
- [ ] Consolidate database documentation
- [ ] Update README with current structure

## Phase 3: Code Quality (Day 5-7) 🟢

### TypeScript Improvements
- [ ] Replace all `as any` with proper types
- [ ] Define interfaces for all API responses
- [ ] Add proper types for authenticated requests
- [ ] Remove unnecessary type assertions

### Component Refactoring
- [ ] Break down `unified-rpg-task-manager.tsx` (<300 lines per component)
- [ ] Extract constants to separate files
- [ ] Extract custom hooks
- [ ] Create proper component hierarchy

### Error Handling
- [ ] Standardize error response format
- [ ] Add proper error boundaries
- [ ] Implement consistent error logging
- [ ] Add user-friendly error messages

## Phase 4: Performance & Testing (Day 8-10) 🔵

### Performance
- [ ] Implement batch API endpoint properly
- [ ] Add response compression
- [ ] Optimize bundle size
- [ ] Add lazy loading for routes
- [ ] Implement proper caching strategy

### Testing
- [ ] Add tests for authentication
- [ ] Add tests for critical API endpoints
- [ ] Add component tests for main features
- [ ] Set up CI/CD test pipeline
- [ ] Achieve 50%+ test coverage

### Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Add performance monitoring
- [ ] Implement health check endpoints
- [ ] Add logging aggregation

## Phase 5: Documentation & Deployment (Day 11-12) 📚

### Documentation
- [ ] Create API documentation
- [ ] Update deployment guide
- [ ] Document environment variables
- [ ] Create development setup guide
- [ ] Add architecture diagrams

### Deployment Preparation
- [ ] Review all environment variables
- [ ] Set up proper secrets management
- [ ] Configure production logging
- [ ] Set up backup procedures
- [ ] Create rollback plan

## Quick Wins Checklist (Do First!) ⚡

```bash
# 1. Clean sensitive files
rm -f *DATABASE_URL*.txt *.log *.pid

# 2. Remove deprecated components
rm client/src/components/*hierarchical*.tsx
rm client/src/components/habitica-task-manager.tsx
rm client/src/components/*enhanced*.tsx
rm client/src/components/optimized-task-card.tsx

# 3. Clean old pages
rm client/src/pages/goals.tsx
rm client/src/pages/goals-new.tsx
mv client/src/pages/goals-simple.tsx client/src/pages/goals.tsx

# 4. Run security cleanup
node scripts/cleanup/02-security-cleanup.js

# 5. Organize files
bash scripts/cleanup/01-organize-files.sh
```

## Validation Checklist ✅

After cleanup, verify:
- [ ] Application still builds successfully
- [ ] All tests pass
- [ ] No console errors in browser
- [ ] Authentication works correctly
- [ ] All CRUD operations function
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Production deployment successful

## Metrics to Track 📊

Before and after cleanup:
- [ ] Bundle size (target: <250KB)
- [ ] Component sizes (target: <300 lines)
- [ ] TypeScript coverage (target: 95%+)
- [ ] Test coverage (target: 50%+)
- [ ] Build time
- [ ] Number of dependencies
- [ ] Code duplication percentage

## Git Workflow 🌿

1. Create cleanup branch: `git checkout -b cleanup/project-organization`
2. Make incremental commits with clear messages
3. Test thoroughly after each phase
4. Create PR with cleanup summary
5. Deploy to staging first
6. Monitor for issues
7. Deploy to production

## Success Criteria 🎯

The cleanup is complete when Completed all phases without breaking functionality
- [ ] No security vulnerabilities in production
- [ ] Clear, organized file structure
- [ ] All components under 300 lines
- [ ] 0 TypeScript `any` types
- [ ] 50%+ test coverage
- [ ] Clean git history
- [ ] Updated documentation
- [ ] Team can easily navigate codebase

## Notes & Warnings ⚠️

1. **Always test after deletions** - Some deprecated files might still be imported
2. **Check for dynamic imports** - Search for string-based imports
3. **Backup database** before any schema changes
4. **Keep fix documentation** - It's valuable for future debugging
5. **Don't rush security fixes** - Better to be thorough than fast

---

Remember: This is a living document. Update checkboxes as you complete tasks and add new items as discovered.