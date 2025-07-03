# 🚀 Deploy Level Up Solo to Railway - Quick Start

## Your code is ready! Follow these steps:

### 1️⃣ Create Railway Account (2 minutes)
👉 Go to https://railway.app and sign up with GitHub

### 2️⃣ Deploy Your App (3 minutes)

**Option A: Via Dashboard (Easiest)**
1. Click "New Project" → "Deploy from GitHub repo"
2. Select `muzhihao1/levelupsolo`
3. Railway auto-detects Node.js app ✓

**Option B: Via CLI**
```bash
brew install railway
railway login
railway link
railway up
```

### 3️⃣ Add Environment Variables (5 minutes)

In Railway Dashboard → Your Project → Variables → Add these one by one:

```
DATABASE_URL
postgresql://postgres:zbrGHpuON0CNfZBt@db.ooepnnsbmtyrcqlqykkr.supabase.co:5432/postgres

JWT_SECRET
qW3eR5tY7uI9oP0aS2dF4gH6jK8lZ1xC

SESSION_SECRET
xK8mP9nQ3vB5wY2tL6hF4jR7sE1cA0dG

OPENAI_API_KEY
[Your OpenAI key from Vercel settings]
```

### 4️⃣ Get Your App URL (1 minute)
- Railway → Settings → Domains → "Generate Domain"
- You'll get: `your-app-name.up.railway.app`

### 5️⃣ Test Your Deployment
Visit these URLs:
- `https://your-app.up.railway.app` - Should show your app
- `https://your-app.up.railway.app/api/health` - Should return `{"status":"ok"}`

### 6️⃣ Update iOS App (When ready)
```swift
let baseURL = "https://your-app.up.railway.app/api"
```

---

## ⚡ That's it! Your app will be live in ~10 minutes

### Need help?
- Check build logs in Railway dashboard
- Full guide: `RAILWAY_DEPLOYMENT.md`
- Railway Discord: https://discord.gg/railway