# 🔧 Render API Deployment Troubleshooting

## Current Issue
Your Render API shows "× Failed" status. The deployment is not running.

## 🔍 Step 1: Check the Deployment Logs

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Click on "HealTara" service** (the one showing "× Failed")
3. **Click on the failed deployment** (1714e6f or similar)
4. **Read the logs** - they'll show exactly what failed

### Look for These Common Errors:

#### A. Build Failed
```
npm ERR! code 1
npm ERR! path ...
```
**Solution**: TypeScript compilation error. Check the error message.

#### B. Prisma Migration Failed
```
Error: P3009: migrate found failed migration
```
**Solution**: Database migration issue. Skip the postDeployCommand temporarily.

#### C. Missing Environment Variables
```
Error: Environment variable not found: DATABASE_URL
```
**Solution**: Add the missing variable in Render Environment settings.

#### D. Port Binding Failed
```
Error: listen EADDRINUSE: address already in use
```
**Solution**: Render assigns PORT automatically. Make sure your code uses `process.env.PORT`.

---

## ✅ Step 2: Verify Environment Variables

In Render dashboard, check these variables are set:

### Required Variables:
- ✅ `DATABASE_URL` - Your Neon PostgreSQL connection string
- ✅ `JWT_SECRET` - Any secure random string
- ✅ `NODE_ENV` - Set to `production`
- ✅ `CORS_ORIGINS` - Your Vercel URL(s)

### Example Values:
```bash
DATABASE_URL=postgresql://neondb_owner:npg_ugLM1TWFvzI9@ep-broad-sunset-adnahhvd-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&connection_limit=5&pool_timeout=30&connect_timeout=30

JWT_SECRET=super-secret-production-key-change-this-12345

NODE_ENV=production

CORS_ORIGINS=https://heal-tara-9qjqk6us2-zeds-projects-58878cb7.vercel.app,https://healtara.onrender.com,https://www.healtara.com
```

---

## 🔨 Step 3: Quick Fixes

### Fix 1: Simplify Build Command (Recommended)

Your render.yaml has been updated. Commit and push:

```bash
git add render.yaml
git commit -m "Fix Render API deployment configuration"
git push origin main
```

This will:
- Add explicit Prisma generate step
- Remove problematic postDeployCommand
- Add missing environment variables

### Fix 2: Manual Redeploy

In Render dashboard:
1. Go to your API service
2. Click **"Manual Deploy"** → **"Deploy latest commit"**
3. Wait 2-3 minutes
4. Check logs for errors

### Fix 3: Check TypeScript Compilation Locally

Run this locally to catch TypeScript errors:

```bash
cd apps/api
npm run build
```

If this fails locally, fix the TypeScript errors first.

---

## 🧪 Step 4: Test When Fixed

Once deployment succeeds:

### Test 1: Check API is responding
```bash
curl https://healtara.onrender.com/api/homepage
```
Should return JSON with hospitals data.

### Test 2: Check health
Visit in browser: https://healtara.onrender.com/api/homepage

### Test 3: Test login from Vercel
Go to your Vercel site and try logging in.

---

## 🚨 Common Deployment Failures

### Issue: "Cannot find module 'dist/index.js'"
**Cause**: TypeScript didn't compile
**Fix**: 
- Check `tsconfig.json` has `"outDir": "dist"`
- Run `npm run build` locally to test
- Check build logs in Render

### Issue: "Prisma Client not initialized"
**Cause**: Missing `prisma generate` in build
**Fix**: Already fixed in updated render.yaml

### Issue: "Database connection timeout"
**Cause**: Neon database sleeping or connection limit reached
**Fix**: 
- Add `&connect_timeout=30` to DATABASE_URL
- Use connection pooling URL (the one with `-pooler` in it)

### Issue: "Port already in use"
**Cause**: Hardcoded port instead of using process.env.PORT
**Fix**: Code already uses `process.env.PORT || 3001` ✅

---

## 📋 Checklist

- [ ] Checked Render deployment logs
- [ ] Verified all environment variables are set
- [ ] TypeScript builds successfully locally
- [ ] Committed and pushed updated render.yaml
- [ ] Manually redeployed in Render
- [ ] API responds to /api/homepage
- [ ] Login works from Vercel

---

## 🆘 Still Not Working?

Share the **specific error from Render logs** and I can help debug further.

Most common fix: Just redeploy after setting environment variables correctly.

