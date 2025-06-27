# Vercel Environment Variables

The following environment variables need to be configured in your Vercel project settings:

## Required Variables

1. **DATABASE_URL**
   - Description: PostgreSQL database connection string
   - Format: `postgresql://[user]:[password]@[host]:[port]/[database]?sslmode=require`
   - Example: `postgresql://user:password@host.com:5432/dbname?sslmode=require`

2. **JWT_SECRET**
   - Description: Secret key for JWT token signing
   - Format: Random string (at least 32 characters)
   - Example: Generate with `openssl rand -base64 32`

## Optional Variables

3. **OPENAI_API_KEY**
   - Description: OpenAI API key for AI features
   - Format: `sk-...`
   - Note: Application works without this, but AI features will be disabled

## How to Configure in Vercel

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable with its value
4. Make sure to select the appropriate environments (Production, Preview, Development)

## Troubleshooting

If you're getting 500 errors after deployment:

1. Check Vercel Function Logs for specific error messages
2. Verify all required environment variables are set
3. Ensure DATABASE_URL includes `?sslmode=require` for PostgreSQL
4. Test database connection with a simple health check endpoint

## Current Configuration

Based on the user's provided credentials:
- DATABASE_URL should include the password: zbrGHpuON0CNfZBt
- JWT_SECRET can be any secure random string