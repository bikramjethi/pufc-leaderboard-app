# Deployment Guide for Admin Panel

## 🚀 Deploying to Vercel

### Step 1: Create a New Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your repository
4. **Important:** Set the **Root Directory** to `admin`

### Step 2: Configure Build Settings

Vercel should auto-detect Vite, but verify:
- **Framework Preset:** Vite
- **Root Directory:** `admin`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

### Step 3: Protect the Admin App

Use Vercel's built-in password protection (recommended):
1. Go to **Project Settings → Deployment Protection**
2. Enable **Password Protection**
3. Set a strong password (share only with admins)

### Step 4: Enable Additional Security (Recommended)

#### Option A: Vercel Password Protection

1. Go to **Project Settings** → **Deployment Protection**
2. Enable **Password Protection** (as above)
3. This adds a gate before users even see the admin UI

#### Option B: IP Allowlist (If Available)

1. Go to **Project Settings** → **Deployment Protection**
2. Enable **IP Allowlist**
3. Add trusted IP addresses

### Step 5: Deploy

1. Push your code to the repository
2. Vercel will automatically deploy
3. Or manually trigger deployment from the dashboard

## 🔐 Security Checklist

Before deploying, ensure:

- [ ] `VITE_ADMIN_PASSWORD` is set in Vercel environment variables
- [ ] `.env.local` is in `.gitignore` (should be already)
- [ ] Strong password is used (12+ characters, mixed case, numbers, symbols)
- [ ] Password protection is enabled (optional but recommended)
- [ ] HTTPS is enabled (automatic with Vercel)
- [ ] Access is limited to trusted team members

## 🌐 Accessing the Deployed Admin Panel

1. Visit your Vercel deployment URL
2. You'll see the login screen
3. Enter the password set in `VITE_ADMIN_PASSWORD`
4. Session lasts 8 hours (configurable)

## 🔄 Updating Password

To change the admin password:

1. Go to Vercel project settings
2. Update `VITE_ADMIN_PASSWORD` environment variable
3. Redeploy the application
4. All existing sessions will be invalidated

## 📝 Notes

- The admin panel runs on a separate Vercel project from the main leaderboard
- Sessions are stored in `sessionStorage` (cleared when browser closes)
- No persistent authentication tokens are stored
- Password is checked client-side (for production, consider backend authentication)

## 🆘 Troubleshooting

**Login not working:**
- Verify `VITE_ADMIN_PASSWORD` is set correctly in Vercel
- Check browser console for errors
- Ensure environment variable is set for the correct environment (Production/Preview)

**Session expires too quickly:**
- Adjust `VITE_SESSION_TIMEOUT_HOURS` environment variable
- Default is 8 hours

**Can't access admin panel:**
- Check if Vercel password protection is blocking access
- Verify the deployment URL is correct
- Check Vercel deployment logs for errors

