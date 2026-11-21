# 🚀 Vercel Deployment Setup Guide

## Current Issue
Your web app is deployed on Vercel, but the API is not deployed. This causes login failures because the web app tries to connect to `localhost:3001` which doesn't exist in production.

## ✅ Solution: Deploy Both Web App and API

### Step 1: Deploy the API to Vercel

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Create New Project**
3. **Import your GitHub repository** (`Aquahulk/HealTara`)
4. **Configure the API project:**
   - **Project Name**: `healtara-api` (or similar)
   - **Framework Preset**: Other
   - **Root Directory**: `apps/api`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

5. **Add Environment Variables** (in Vercel project settings):
   ```
   DATABASE_URL=postgresql://neondb_owner:npg_ugLM1TWFvzI9@ep-broad-sunset-adnahhvd-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&connection_limit=5&pool_timeout=30&connect_timeout=30
   
   JWT_SECRET=your-secure-production-secret-key-change-this-123456789
   
   NODE_ENV=production
   
   PORT=3001
   
   CORS_ORIGINS=https://heal-tara-9qjqk6us2-zeds-projects-58878cb7.vercel.app,https://your-custom-domain.com
   ```

6. **Deploy!**

### Step 2: Update Web App Environment Variables

Once your API is deployed, you'll get a URL like:
`https://healtara-api.vercel.app`

1. **Go to your Web App project** in Vercel (the one at `heal-tara-9qjqk6us2...`)
2. **Go to Settings → Environment Variables**
3. **Add/Update these variables:**
   ```
   NEXT_PUBLIC_API_URL=https://healtara-api.vercel.app
   
   NEXT_PUBLIC_ENV=production
   
   DATABASE_URL=postgresql://neondb_owner:npg_ugLM1TWFvzI9@ep-broad-sunset-adnahhvd-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&connection_limit=5&pool_timeout=30&connect_timeout=30
   
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAwdCBkLZSw1vokjVlSTcXM6KhzkJtZ_Nk
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=healtara-70c2a.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=healtara-70c2a
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=healtara-70c2a.firebasestorage.app
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=145640308593
   NEXT_PUBLIC_FIREBASE_APP_ID=1:145640308593:web:4d065a9c36f05ac04840d0
   ```

4. **Redeploy** the web app (Deployments → ... → Redeploy)

### Step 3: Update CORS Settings

After deploying, update the API's CORS_ORIGINS environment variable to include your web app's URL:

```
CORS_ORIGINS=https://heal-tara-9qjqk6us2-zeds-projects-58878cb7.vercel.app,https://healtara-api.vercel.app,https://your-custom-domain.com
```

---

## 🎯 Alternative: Quick Fix (Use Existing API)

If you have an API already deployed somewhere, just update the web app's environment variable:

1. Go to Vercel → Your Web Project → Settings → Environment Variables
2. Add: `NEXT_PUBLIC_API_URL=https://your-existing-api-url.com`
3. Redeploy

---

## 📋 Current URLs

- **Web App**: `https://heal-tara-9qjqk6us2-zeds-projects-58878cb7.vercel.app`
- **API**: Not deployed yet (currently trying to use `localhost:3001`)
- **GitHub**: `https://github.com/Aquahulk/HealTara`

---

## 🔧 Troubleshooting

### Login still fails after deployment?

1. **Check API is running**: Visit `https://your-api-url.vercel.app/api/homepage`
2. **Check CORS**: Make sure API's CORS_ORIGINS includes your web app URL
3. **Check browser console**: Look for network errors
4. **Check Vercel logs**: Functions → View logs for both projects

### Database connection issues?

- Neon has connection limits. Make sure you're using connection pooling
- Check if DATABASE_URL is correctly set in both API and Web projects
- Verify `sslmode=require` is in the connection string

---

## 📝 Security Notes

1. **Change JWT_SECRET** in production to a strong random value
2. **Never commit** `.env` files to git (already in `.gitignore`)
3. **Use environment variables** for all secrets in Vercel
4. **HTTPS only** in production (Vercel handles this automatically)

---

## ✅ Verification Checklist

- [ ] API deployed to Vercel
- [ ] API environment variables configured
- [ ] Web app NEXT_PUBLIC_API_URL updated to API's Vercel URL
- [ ] Web app redeployed
- [ ] CORS configured to include web app URL
- [ ] Login tested and working
- [ ] Database connection tested
- [ ] All features working

---

## 🆘 Need Help?

If you encounter issues:
1. Check Vercel deployment logs
2. Check browser console for errors
3. Test API endpoints directly (use Postman or browser)
4. Verify environment variables are set correctly
