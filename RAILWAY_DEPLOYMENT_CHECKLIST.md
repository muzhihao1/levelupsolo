# Railway Deployment Checklist for Level Up Solo

## 🚨 Current Issues (2025-07-01)

### Authentication Login Failure
**Problem**: Users cannot log in on the Railway deployment
**Root Causes**:
1. Missing `JWT_REFRESH_SECRET` environment variable
2. Possible database connection issues
3. Authentication system falls back to demo mode when DB fails

## 🔧 Immediate Fixes Required

### 1. Environment Variables on Railway
Set these environment variables in Railway dashboard:

```bash
# Required
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
JWT_SECRET=your-secure-jwt-secret-here
JWT_REFRESH_SECRET=your-secure-refresh-secret-here
OPENAI_API_KEY=your-openai-api-key

# Optional but recommended
NODE_ENV=production
SESSION_SECRET=your-session-secret-here
```

⚠️ **Important**: Make sure `DATABASE_URL` includes `?sslmode=require` for Railway PostgreSQL

### 2. Database Connection Verification

Test the database connection using the new diagnostics endpoint:
```bash
# Check overall database health
curl https://levelupsolo-production.up.railway.app/api/diagnostics/database

# Test specific connection string
curl -X POST https://levelupsolo-production.up.railway.app/api/diagnostics/test-connection \
  -H "Content-Type: application/json" \
  -d '{"connectionString": "your-database-url-here"}'
```

### 3. Authentication Testing

After setting environment variables:
```bash
# Test login
curl -X POST https://levelupsolo-production.up.railway.app/api/auth/simple-login \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com", "password": "your-password"}'

# Check auth status
curl https://levelupsolo-production.up.railway.app/api/auth/status
```

## 📋 Complete Deployment Checklist

### Pre-Deployment
- [ ] Ensure all environment variables are set in Railway
- [ ] Verify `DATABASE_URL` includes SSL parameters
- [ ] Check that `JWT_SECRET` and `JWT_REFRESH_SECRET` are different values
- [ ] Run `npm run build` locally to catch any build errors

### Database Setup
- [ ] Ensure PostgreSQL database is provisioned on Railway
- [ ] Run database migrations: `npm run db:push`
- [ ] Verify tables exist using diagnostics endpoint
- [ ] Test database connection with SSL enabled

### Environment Variables
- [ ] `DATABASE_URL` - PostgreSQL connection string with `?sslmode=require`
- [ ] `JWT_SECRET` - Secure random string (32+ characters)
- [ ] `JWT_REFRESH_SECRET` - Different secure random string
- [ ] `OPENAI_API_KEY` - Valid OpenAI API key
- [ ] `NODE_ENV=production`
- [ ] `PORT` - Usually auto-set by Railway

### Deployment Steps
1. [ ] Push code to GitHub
2. [ ] Railway auto-deploys from main branch
3. [ ] Monitor build logs for errors
4. [ ] Check deployment logs for startup issues
5. [ ] Test health endpoint: `/api/health`
6. [ ] Test diagnostics: `/api/diagnostics/database`
7. [ ] Test authentication flow
8. [ ] Verify all API endpoints work

### Post-Deployment Verification
- [ ] Can create new user accounts
- [ ] Can log in with existing accounts
- [ ] Tasks CRUD operations work
- [ ] AI features (categorization) work
- [ ] No console errors in browser
- [ ] No 500 errors in server logs

## 🔍 Troubleshooting Commands

### Check deployment status
```bash
# Health check
curl https://levelupsolo-production.up.railway.app/api/health

# Database diagnostics
curl https://levelupsolo-production.up.railway.app/api/diagnostics/database

# Simple test
curl https://levelupsolo-production.up.railway.app/api/test/simple
```

### Common Issues and Solutions

#### 1. "JWT_REFRESH_SECRET not set" warning
**Solution**: Add `JWT_REFRESH_SECRET` to Railway environment variables

#### 2. Database connection timeout
**Solution**: Ensure `?sslmode=require` is in DATABASE_URL

#### 3. "relation does not exist" errors
**Solution**: Run `npm run db:push` with correct DATABASE_URL

#### 4. Login returns 401 Unauthorized
**Possible causes**:
- Database not connected (check diagnostics)
- Password field issues (check hashedPassword column)
- User doesn't exist in database

#### 5. "IPv6 address" warning
**Solution**: Use IPv4 address or hostname instead of IPv6

## 🚀 Quick Fix Script

```bash
#!/bin/bash
# Quick diagnostics script

echo "Checking deployment health..."
curl -s https://levelupsolo-production.up.railway.app/api/health | jq .

echo "\nChecking database diagnostics..."
curl -s https://levelupsolo-production.up.railway.app/api/diagnostics/database | jq .

echo "\nTesting authentication..."
curl -s -X POST https://levelupsolo-production.up.railway.app/api/auth/simple-login \
  -H "Content-Type: application/json" \
  -d '{"email": "demo@levelupsolo.net", "password": "demo1234"}' | jq .
```

## 📞 Support Resources

- Railway Dashboard: https://railway.app/dashboard
- Railway Logs: Check deployment logs for real-time issues
- Database Admin: Use `npm run db:studio` locally with production DATABASE_URL
- GitHub Issues: Report persistent problems

## ✅ Success Criteria

Your deployment is successful when:
1. `/api/health` returns `status: "ok"`
2. Database diagnostics show all checks passed
3. Users can register and log in
4. Tasks can be created, updated, deleted
5. AI categorization works
6. No errors in Railway logs