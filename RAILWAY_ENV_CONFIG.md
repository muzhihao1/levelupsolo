# Railway Environment Variables Configuration

## 🔐 Required Environment Variables

Copy and paste these into your Railway project's Variables section:

### 1. Database Configuration
```
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST].railway.app:5432/railway?sslmode=require
```
> ⚠️ **Important**: Must include `?sslmode=require` for Railway PostgreSQL

### 2. Authentication Secrets
```
JWT_SECRET=generate-a-secure-random-string-at-least-32-chars
JWT_REFRESH_SECRET=generate-another-different-secure-random-string
```

To generate secure secrets, use:
```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. OpenAI Configuration
```
OPENAI_API_KEY=sk-...your-openai-api-key
```

### 4. Production Settings
```
NODE_ENV=production
```

## 📝 Complete Variable List

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string | `postgresql://...?sslmode=require` |
| `JWT_SECRET` | ✅ | JWT signing secret | 64-character hex string |
| `JWT_REFRESH_SECRET` | ✅ | Refresh token secret | Different 64-character hex string |
| `OPENAI_API_KEY` | ✅ | OpenAI API key for AI features | `sk-...` |
| `NODE_ENV` | ✅ | Environment setting | `production` |
| `SESSION_SECRET` | ❌ | Session encryption (optional) | Random string |
| `PORT` | ❌ | Server port (Railway sets this) | Auto-set by Railway |

## 🚀 Quick Setup Steps

1. **Go to Railway Dashboard**
   - Navigate to your project
   - Click on your service (levelupsolo)
   - Go to "Variables" tab

2. **Add PostgreSQL Database**
   - Click "+ New" → "Database" → "Add PostgreSQL"
   - Railway will automatically add `DATABASE_URL`
   - Make sure to append `?sslmode=require` to the URL

3. **Add Required Variables**
   - Click "Raw Editor" for easier bulk adding
   - Paste all variables at once
   - Click "Save" 

4. **Verify Deployment**
   - Railway will automatically redeploy
   - Check logs for any errors
   - Test the endpoints

## ⚡ Quick Copy-Paste Template

```env
JWT_SECRET=your-generated-jwt-secret-here
JWT_REFRESH_SECRET=your-generated-refresh-secret-here
OPENAI_API_KEY=your-openai-api-key-here
NODE_ENV=production
```

## 🔍 Verification Steps

After setting variables, verify with:

```bash
# 1. Check health
curl https://levelupsolo-production.up.railway.app/api/health

# 2. Check auth status
curl https://levelupsolo-production.up.railway.app/api/auth/status

# 3. Check database diagnostics
curl https://levelupsolo-production.up.railway.app/api/diagnostics/database
```

## ⚠️ Common Mistakes to Avoid

1. **Missing SSL Mode**
   - ❌ `postgresql://...railway.app:5432/railway`
   - ✅ `postgresql://...railway.app:5432/railway?sslmode=require`

2. **Using Same Secret**
   - ❌ JWT_SECRET and JWT_REFRESH_SECRET have same value
   - ✅ Use different values for each

3. **Spaces in Values**
   - ❌ `JWT_SECRET = abc123...`
   - ✅ `JWT_SECRET=abc123...`

4. **Quotes in Railway**
   - ❌ `JWT_SECRET="abc123..."`
   - ✅ `JWT_SECRET=abc123...`

## 🆘 If Login Still Fails

1. Check diagnostics endpoint for specific errors
2. Ensure database tables exist (`npm run db:push`)
3. Verify user exists in database
4. Check Railway logs for detailed errors
5. Test with demo credentials first