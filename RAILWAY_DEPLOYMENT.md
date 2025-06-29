# Railway Deployment Guide for Level Up Solo

## 📋 Pre-Deployment Checklist

- [x] Express server configured to use `process.env.PORT`
- [x] Build scripts updated for production
- [x] TypeScript server configuration created
- [x] Railway configuration file added
- [x] Environment variables documented

## 🚀 Step-by-Step Deployment

### 1. Install Railway CLI (Optional but Recommended)

```bash
# macOS with Homebrew
brew install railway

# Or use npm
npm install -g @railway/cli
```

### 2. Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub (recommended) or email
3. Verify your account

### 3. Deploy via GitHub (Recommended)

#### Option A: Railway Dashboard

1. Click "New Project" in Railway dashboard
2. Select "Deploy from GitHub repo"
3. Choose `muzhihao1/levelupsolo` repository
4. Railway will automatically detect the Node.js app

#### Option B: Railway CLI

```bash
# Login to Railway
railway login

# Link to your project
railway link

# Deploy
railway up
```

### 4. Configure Environment Variables

In Railway dashboard → Your Project → Variables:

```env
# Database (PostgreSQL)
DATABASE_URL=postgresql://postgres:zbrGHpuON0CNfZBt@db.ooepnnsbmtyrcqlqykkr.supabase.co:5432/postgres

# Authentication
JWT_SECRET=qW3eR5tY7uI9oP0aS2dF4gH6jK8lZ1xC
SESSION_SECRET=xK8mP9nQ3vB5wY2tL6hF4jR7sE1cA0dG

# OpenAI API (Use your actual key)
OPENAI_API_KEY=sk-proj-...
```

**Important**: Add each variable one by one, not as a block.

### 5. Configure Custom Domain (Optional)

1. In Railway → Settings → Domains
2. Click "Generate Domain" for a free *.up.railway.app domain
3. Or add custom domain:
   - Add `levelupsolo.net` or `www.levelupsolo.net`
   - Update DNS records as instructed

### 6. Monitor Deployment

1. Check build logs in Railway dashboard
2. Once deployed, visit the generated URL
3. Test key endpoints:
   - `/` - Should show the React app
   - `/api/health` - Should return health status
   - `/api/auth/user` - Should return 401 (not logged in)

## 🔧 Troubleshooting

### Build Fails

```bash
# Check logs
railway logs

# Common fixes:
# 1. Ensure all dependencies are in package.json
# 2. Check TypeScript compilation errors
# 3. Verify node version compatibility
```

### App Crashes After Deploy

1. Check environment variables are set correctly
2. Verify database connection string
3. Check logs for specific errors:
   ```bash
   railway logs --tail
   ```

### Database Connection Issues

- Ensure PostgreSQL accepts connections from Railway IPs
- Check if database URL includes `?sslmode=require`
- Verify database is accessible from internet

## 📱 Update iOS App Configuration

After successful deployment, update your iOS app:

```swift
// Update base URL in iOS app
let baseURL = "https://your-app.up.railway.app/api"
// or
let baseURL = "https://levelupsolo.net/api" // if using custom domain
```

## 🎯 Post-Deployment

1. **Test Core Features**:
   - User registration/login
   - Task creation with AI
   - Skill tracking
   - Real-time updates

2. **Monitor Performance**:
   - Railway provides metrics dashboard
   - Set up alerts for downtime
   - Monitor API response times

3. **Scaling** (if needed):
   - Railway auto-scales based on traffic
   - Can configure replicas in settings
   - Database may need separate scaling

## 🆘 Getting Help

- Railway Discord: https://discord.gg/railway
- Railway Docs: https://docs.railway.app
- Project Issues: Create issue in GitHub repo

## 🎉 Success Indicators

Your deployment is successful when:
- ✅ App loads at your Railway URL
- ✅ Can create account and login
- ✅ AI features work (task analysis)
- ✅ Data persists between sessions
- ✅ No errors in Railway logs