# TaxFlow Enhanced - Production Deployment Guide

**Version:** 1.0.0
**Date:** 2025-11-23
**Platform:** Vercel (Recommended)

---

## 🎯 Deployment Overview

This guide will walk you through deploying TaxFlow Enhanced to production using Vercel.

**Estimated Time:** 15-20 minutes
**Prerequisites:** GitHub account, Vercel account (free)

---

## ✅ Pre-Deployment Checklist

All requirements verified:

- ✅ **Tests:** 119/119 passing
- ✅ **Build:** Production build successful (238 KB bundle)
- ✅ **TypeScript:** Compiles without errors
- ✅ **Bundle Size:** Optimized (78 KB gzipped)
- ✅ **Documentation:** Complete (31,000+ words)
- ✅ **CI/CD:** GitHub Actions workflows configured
- ✅ **Version:** v1.0.0 tagged locally

**Status:** Ready for deployment! 🚀

---

## 📦 Step 1: Prepare Repository

### 1.1 Push Latest Changes

First, ensure your v1.0.0 tag and all changes are on GitHub:

```bash
# Navigate to project
cd /home/user/test-n8n/taxflow-enhanced

# Check current status
git status

# Push to your branch
git push -u origin claude/analyze-n8n-tax-platform-0128jmFR4K4w6BjwaoknfPHT

# Push the v1.0.0 tag
git push origin v1.0.0
```

### 1.2 Merge to Main (if needed)

If you want to deploy from the main branch:

```bash
# Switch to main
git checkout main

# Merge your feature branch
git merge claude/analyze-n8n-tax-platform-0128jmFR4K4w6BjwaoknfPHT

# Push to main
git push origin main
```

---

## 🚀 Step 2: Deploy to Vercel

You have two options: **CLI** (recommended for first deployment) or **Git Integration** (recommended for ongoing deployments).

### Option A: Vercel CLI (Recommended for First Deployment)

#### 2.1 Install Vercel CLI

```bash
npm install -g vercel
```

#### 2.2 Login to Vercel

```bash
vercel login
```

This will open your browser to authenticate. Choose your preferred login method:
- GitHub
- GitLab
- Bitbucket
- Email

#### 2.3 Deploy to Production

```bash
# Navigate to project
cd /home/user/test-n8n/taxflow-enhanced

# Initial deployment
vercel

# Follow the prompts:
# ? Set up and deploy "~/test-n8n/taxflow-enhanced"? [Y/n] Y
# ? Which scope? [Your Vercel account]
# ? Link to existing project? [N]
# ? What's your project's name? taxflow-enhanced
# ? In which directory is your code located? ./
# ? Want to override the settings? [n]

# Production deployment
vercel --prod
```

**Your app will be live at:** `https://taxflow-enhanced.vercel.app`

#### 2.4 Save Deployment URL

Once deployed, Vercel will provide a URL. Save this for later:

```bash
# Example output:
✔  Production: https://taxflow-enhanced.vercel.app [copied to clipboard] [1m 23s]
```

---

### Option B: Vercel Git Integration (Recommended for Ongoing Deployments)

This enables automatic deployments on every push to main.

#### 2.1 Create Vercel Account

1. Go to https://vercel.com/signup
2. Sign up with GitHub (recommended)
3. Authorize Vercel to access your repositories

#### 2.2 Import Project

1. Go to https://vercel.com/new
2. Click **"Import Project"**
3. Select **"Import Git Repository"**
4. Choose your repository: `kcribb14/test-n8n`
5. Configure project:
   - **Framework Preset:** Vite
   - **Root Directory:** `taxflow-enhanced`
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `dist` (auto-detected)
   - **Install Command:** `npm install` (auto-detected)

#### 2.3 Configure Build Settings

Vercel should auto-detect the following (verify these are correct):

```
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
Development Command: npm run dev
Node.js Version: 18.x
```

#### 2.4 Deploy

Click **"Deploy"** button.

Vercel will:
1. Clone your repository
2. Install dependencies
3. Run build command
4. Deploy to production
5. Provide a live URL

**First deployment takes ~2-3 minutes.**

---

## ⚙️ Step 3: Configure Environment Variables

### 3.1 Access Environment Variables

In Vercel dashboard:
1. Go to your project
2. Click **"Settings"**
3. Click **"Environment Variables"**

### 3.2 Add Production Variables

Add these environment variables for **Production** environment:

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_LOG_LEVEL` | `error` | Only log errors in production |
| `VITE_USE_MOCK_DATA` | `false` | Disable mock data |
| `VITE_ENABLE_PDF_EXPORT` | `true` | Enable PDF export feature |
| `VITE_ENABLE_EXCEL_EXPORT` | `true` | Enable Excel export feature |
| `VITE_ENABLE_STATE_TAX` | `false` | State tax (Phase 5 feature) |

**Optional - For Analytics (Setup in Step 6):**

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_ENABLE_ANALYTICS` | `true` | Enable analytics tracking |
| `VITE_GA_MEASUREMENT_ID` | `G-XXXXXXXXXX` | Google Analytics ID (if using GA4) |

### 3.3 Redeploy After Adding Variables

**Important:** After adding environment variables, trigger a new deployment:

**Via CLI:**
```bash
vercel --prod
```

**Via Dashboard:**
1. Go to "Deployments" tab
2. Click "..." on latest deployment
3. Click "Redeploy"

---

## 🔒 Step 4: Configure Custom Domain (Optional)

### 4.1 Add Domain in Vercel

1. Go to project **"Settings"** → **"Domains"**
2. Click **"Add"**
3. Enter your domain: `taxflow.yourdomain.com`
4. Click **"Add"**

### 4.2 Configure DNS

Vercel will provide DNS configuration instructions. Add one of:

**Option A: CNAME Record (Recommended)**
```
Type: CNAME
Name: taxflow
Value: cname.vercel-dns.com
```

**Option B: A Record**
```
Type: A
Name: taxflow
Value: 76.76.21.21
```

### 4.3 Verify Domain

After DNS propagation (usually 1-24 hours):
- Vercel will automatically provision SSL certificate
- Your app will be accessible at `https://taxflow.yourdomain.com`

---

## 🔐 Step 5: Configure Security Headers

Vercel automatically adds security headers, but you can customize them.

Create `vercel.json` in project root:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

Commit and push this file to trigger a new deployment.

---

## ✅ Step 6: Post-Deployment Verification

### 6.1 Quick Smoke Test

Visit your deployment URL and verify:

1. **✅ Application loads** - No blank page
2. **✅ No console errors** - Open DevTools (F12) → Console tab
3. **✅ Assets load** - Check Network tab for 200 status codes
4. **✅ Create workflow** - Add a few nodes
5. **✅ Execute workflow** - Run a calculation
6. **✅ Export works** - Test PDF and Excel export

### 6.2 Comprehensive Verification

See **DEPLOYMENT_VERIFICATION.md** for complete checklist covering:
- Core functionality (10 sections)
- Tax calculation accuracy (5 test cases)
- Export features
- Browser compatibility
- Mobile responsiveness
- Accessibility (WCAG 2.1 AA)
- Security
- Performance (Lighthouse audit)

---

## 📊 Step 7: Run Lighthouse Audit

### Option A: Chrome DevTools

1. Open your production URL in Chrome
2. Press F12 to open DevTools
3. Click **"Lighthouse"** tab
4. Select categories:
   - ✅ Performance
   - ✅ Accessibility
   - ✅ Best Practices
   - ✅ SEO
5. Click **"Analyze page load"**

**Target Scores:**
- Performance: >90
- Accessibility: 100
- Best Practices: >90
- SEO: >90

### Option B: CLI

```bash
npm install -g lighthouse

lighthouse https://taxflow-enhanced.vercel.app \
  --view \
  --preset=desktop \
  --output=html \
  --output-path=./lighthouse-report.html
```

---

## 🎉 Step 8: Verify Deployment Success

Your deployment is successful when:

- ✅ App is accessible at production URL
- ✅ All features work correctly
- ✅ No console errors
- ✅ Lighthouse scores meet targets
- ✅ Mobile responsiveness verified
- ✅ Browser compatibility confirmed

**Congratulations! TaxFlow Enhanced is now live in production!** 🚀

---

## 📈 Next Steps

After successful deployment:

1. **Set up monitoring** → See MONITORING.md
   - Sentry error tracking
   - UptimeRobot uptime monitoring

2. **Set up analytics** → See ANALYTICS.md
   - Plausible Analytics (recommended)
   - Google Analytics 4 (alternative)

3. **Update documentation** → Update README.md
   - Add live demo URL
   - Add deployment status badge

4. **Create GitHub Release** → Tag v1.0.0
   - Create release notes from CHANGELOG.md
   - Attach build artifacts

5. **Announce launch** 🎊
   - Share on social media
   - Post in relevant communities
   - Update project homepage

---

## 🔄 Continuous Deployment

With Git integration, future deployments are automatic:

1. **Push to main** → Automatic production deployment
2. **Open PR** → Automatic preview deployment
3. **Merge PR** → Automatic production deployment

**View deployments:**
- Vercel Dashboard → Deployments tab
- Or run: `vercel ls`

---

## 🆘 Troubleshooting

### Issue: Blank Page After Deployment

**Check:**
1. Browser console for errors
2. Network tab for failed asset requests
3. Environment variables are set correctly

**Fix:**
```bash
# Verify build locally
npm run build
npm run preview

# If works locally, check Vercel build logs
vercel logs
```

### Issue: 404 on Page Refresh

**Cause:** SPA routing not configured

**Fix:** Add `vercel.json` with rewrite rules (see Step 5 above)

### Issue: Environment Variables Not Working

**Check:**
1. Variables are prefixed with `VITE_`
2. Variables are set in Vercel dashboard
3. Deployment was triggered **after** adding variables

**Fix:**
```bash
# Trigger new deployment
vercel --prod
```

### Issue: Build Fails

**Check Vercel build logs:**
1. Go to Deployments tab
2. Click failed deployment
3. View build logs

**Common causes:**
- Missing dependencies
- TypeScript errors
- Node version mismatch

**Fix:**
```bash
# Test build locally
npm run build

# If local build works, check Vercel Node.js version
# Settings → General → Node.js Version → 18.x
```

---

## 🔙 Rollback Procedures

### If Deployment Has Issues

#### Via Vercel Dashboard:

1. Go to **"Deployments"** tab
2. Find previous working deployment
3. Click **"..."** → **"Promote to Production"**

#### Via CLI:

```bash
# List deployments
vercel ls

# Promote specific deployment
vercel promote <deployment-url>

# Or rollback to previous
vercel rollback
```

**Rollback takes ~30 seconds.**

---

## 📞 Support

### Deployment Issues

- **Vercel Support:** https://vercel.com/support
- **Vercel Docs:** https://vercel.com/docs
- **Vite Deployment:** https://vitejs.dev/guide/static-deploy.html

### Application Issues

- **GitHub Issues:** https://github.com/kcribb14/taxflow-enhanced/issues
- **Documentation:** See DEVELOPER_GUIDE.md and USER_GUIDE.md
- **Discussions:** https://github.com/kcribb14/taxflow-enhanced/discussions

---

## 📋 Deployment Summary

Once completed, you should have:

- ✅ Production deployment at `https://taxflow-enhanced.vercel.app`
- ✅ Automatic HTTPS with SSL certificate
- ✅ Automatic deployments on Git push
- ✅ Preview deployments for pull requests
- ✅ Environment variables configured
- ✅ Security headers configured
- ✅ Custom domain (optional)
- ✅ Verified functionality
- ✅ Lighthouse audit passed

---

**Ready to deploy?** Start with Step 1 above! 🚀

**Questions?** See troubleshooting section or open a GitHub issue.

---

**Last Updated:** 2025-11-23
**Version:** 1.0.0
**Platform:** Vercel
**Deployment Status:** Ready for Production ✅
