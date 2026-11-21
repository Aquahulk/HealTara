# 🔧 Fix Vercel Login Issue - Connect to Render API

## Problem
Your web app on Vercel is trying to connect to `localhost:3001` (which doesn't exist in production).
Your API is already deployed on Render, but Vercel doesn't know the URL.

## ✅ Solution: Update Vercel Environment Variables

### Step 1: Find Your Render API URL

1. Go to **https://dashboard.render.com**
2. Find your **docproc-api** service
3. Copy the URL (it should look like: `https://docproc-api-XXXX.onrender.com`)

### Step 2: Update Vercel Environment Variables

1. Go to **https://vercel.com/dashboard**
2. Find your **HealTara** web project (currently at `heal-tara-9qjqk6us2-zeds-projects-58878cb7.vercel.app`)
3. Click on **Settings**
4. Click on **Environment Variables**
5. Add or update these variables:

```
NEXT_PUBLIC_API_URL=https://your-render-api-url.onrender.com
NEXT_PUBLIC_ENV=production
DATABASE_URL=postgresql://neondb_owner:npg_ugLM1TWFvzI9@ep-broad-sunset-adnahhvd-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require

NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAwdCBkLZSw1vokjVlSTcXM6KhzkJtZ_Nk
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=healtara-70c2a.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=healtara-70c2a
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=healtara-70c2a.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=145640308593
NEXT_PUBLIC_FIREBASE_APP_ID=1:145640308593:web:4d065a9c36f05ac04840d0
```

**Important:** Replace `https://your-render-api-url.onrender.com` with your actual Render API URL!

6. **Save** the variables

### Step 3: Redeploy Vercel

1. Go to **Deployments** tab
2. Click the **three dots (...)** on the latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete (2-3 minutes)

### Step 4: Update Render CORS (Important!)

Your Render API needs to allow requests from your Vercel URL:

1. Go to **Render Dashboard** → **docproc-api**
2. Go to **Environment** tab
3. Update `CORS_ORIGINS` to include your Vercel URL:
   ```
   https://heal-tara-9qjqk6us2-zeds-projects-58878cb7.vercel.app,https://your-render-api-url.onrender.com
   ```
4. **Save changes** (Render will auto-redeploy)

---

## 🧪 Test It

1. Wait for both deployments to finish
2. Visit your Vercel URL: `https://heal-tara-9qjqk6us2-zeds-projects-58878cb7.vercel.app/login`
3. Try to login
4. Check browser console (F12) for any errors

---

## 🔍 Quick Diagnostic

If login still fails:

### Check 1: Is the API URL correct?
Open browser console and check what URL it's calling:
- Should be: `https://your-render-api.onrender.com/api/login`
- Not: `http://localhost:3001/api/login`

### Check 2: Is the API responding?
Visit directly: `https://your-render-api-url.onrender.com/api/homepage`
- Should return JSON with hospitals data

### Check 3: CORS Error?
Check browser console for "CORS" or "blocked by CORS policy" errors
- If yes: Update CORS_ORIGINS in Render

### Check 4: API Cold Start
Render free tier sleeps after inactivity
- First request may take 30-60 seconds
- Just wait and try again

---

## 📝 Quick Reference

**Current Setup:**
- Web App: Vercel (`heal-tara-9qjqk6us2...vercel.app`)
- API: Render (`docproc-api` service)
- Database: Neon PostgreSQL

**What Needs to Match:**
- Vercel `NEXT_PUBLIC_API_URL` → Your Render API URL
- Render `CORS_ORIGINS` → Include your Vercel URL

---

## 🚨 Common Issues

### "Internal Server Error" on login
- API URL is wrong or API is down
- Check Render API is deployed and running

### CORS Error
- Update CORS_ORIGINS in Render to include Vercel URL
- Make sure to include `https://` prefix

### Slow Login (30+ seconds)
- Render free tier cold start
- Wait for first request to wake up the service
- Consider upgrading Render plan or using a keep-alive ping

---

## ✅ Success Checklist

- [ ] Found Render API URL
- [ ] Added NEXT_PUBLIC_API_URL to Vercel
- [ ] Redeployed Vercel
- [ ] Updated CORS_ORIGINS in Render
- [ ] Tested login - works!

