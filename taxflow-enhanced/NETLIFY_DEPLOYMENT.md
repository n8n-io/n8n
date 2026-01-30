# TaxFlow Enhanced - Netlify Deployment Guide

**Version:** 1.0.0
**Date:** 2025-11-23
**Platform:** Netlify

---

## 🎯 Overview

This guide provides step-by-step instructions for deploying TaxFlow Enhanced to Netlify. Netlify offers automatic deployments, preview builds for pull requests, and seamless Git integration.

**Estimated Time:** 15-20 minutes
**Prerequisites:**
- Netlify account (free tier available)
- Git repository on GitHub/GitLab/Bitbucket

---

## ✅ Pre-Deployment Checklist

Verify these items before deploying:

- ✅ **All tests passing** (119/119)
- ✅ **Production build successful** (238 KB bundle)
- ✅ **No TypeScript errors**
- ✅ **netlify.toml configured**
- ✅ **Environment variables documented**
- ✅ **Git repository up to date**

### Quick Verification

```bash
cd /home/user/test-n8n/taxflow-enhanced

# Run all checks
npm run test:run && \
npm run build && \
npm run lint && \
echo "✅ All checks passed - ready for Netlify deployment"
```

---

## 🚀 Deployment Methods

You have **3 deployment options**:

### Option 1: Netlify CLI (Recommended for First Deployment)
- Manual control over deployment
- Quick testing and iteration
- Best for initial setup

### Option 2: Git Integration (Recommended for Production)
- Automatic deployments on push
- Preview deployments for PRs
- Best for ongoing development

### Option 3: Deploy Script (Automated)
- Runs all pre-deployment checks
- Automated CLI deployment
- Best for CI/CD pipelines

---

## 📦 Option 1: Netlify CLI Deployment

### Step 1.1: Install Netlify CLI

```bash
# Install globally
npm install -g netlify-cli

# Verify installation
netlify --version
```

### Step 1.2: Login to Netlify

```bash
# Login (opens browser for authentication)
netlify login
```

Choose your authentication method:
- GitHub (recommended)
- GitLab
- Bitbucket
- Email

### Step 1.3: Initialize Your Site

```bash
# Navigate to project
cd /home/user/test-n8n/taxflow-enhanced

# Initialize Netlify site
netlify init
```

**Follow the prompts:**

1. **Create & configure a new site**
   - Choose: `Create & configure a new site`

2. **Team**
   - Select your Netlify team (or personal account)

3. **Site name**
   - Enter: `taxflow-enhanced` (or your preferred name)
   - This will create: `https://taxflow-enhanced.netlify.app`

4. **Build command**
   - Netlify should auto-detect: `npm run build`
   - Confirm or press Enter

5. **Directory to deploy**
   - Netlify should auto-detect: `dist`
   - Confirm or press Enter

6. **Netlify functions folder**
   - Press Enter (we don't use functions)

### Step 1.4: Deploy to Preview

Test your deployment first:

```bash
# Deploy to preview URL
netlify deploy

# View the preview URL provided
# Example: https://5f8a7b2c3d4e5f6g7h8i9j0k.netlify.app
```

**Test the preview deployment:**
1. Visit the preview URL
2. Test core functionality
3. Check console for errors
4. Verify all features work

### Step 1.5: Deploy to Production

Once preview is verified:

```bash
# Deploy to production
netlify deploy --prod

# Or use the npm script
npm run deploy:netlify
```

**Your site is now live!**
- Production URL: `https://taxflow-enhanced.netlify.app`
- Or your custom domain if configured

### Step 1.6: Save Site Information

```bash
# View site details
netlify status

# Open site in browser
netlify open:site

# View admin dashboard
netlify open:admin
```

---

## 🔗 Option 2: Git Integration (Automatic Deployments)

### Step 2.1: Push Code to Git Repository

Ensure your code is pushed to GitHub/GitLab/Bitbucket:

```bash
cd /home/user/test-n8n/taxflow-enhanced

# Check current branch
git branch

# Add and commit any changes
git add .
git commit -m "feat: Add Netlify deployment configuration"

# Push to remote
git push -u origin claude/analyze-n8n-tax-platform-0128jmFR4K4w6BjwaoknfPHT

# Or merge to main and push
git checkout main
git merge claude/analyze-n8n-tax-platform-0128jmFR4K4w6BjwaoknfPHT
git push origin main
```

### Step 2.2: Import Project in Netlify

1. **Go to Netlify Dashboard**
   - Visit: https://app.netlify.com
   - Login with your account

2. **Add New Site**
   - Click **"Add new site"** → **"Import an existing project"**

3. **Connect to Git Provider**
   - Choose your Git provider (GitHub/GitLab/Bitbucket)
   - Authorize Netlify to access your repositories

4. **Select Repository**
   - Search for: `test-n8n`
   - Select the repository

5. **Configure Build Settings**

   Netlify should auto-detect these from `netlify.toml`:

   ```
   Base directory: taxflow-enhanced
   Build command: npm run build
   Publish directory: taxflow-enhanced/dist
   ```

   **If not auto-detected, set manually:**
   - **Base directory:** `taxflow-enhanced`
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Functions directory:** (leave empty)

6. **Advanced Build Settings**
   - Click **"Show advanced"**
   - Set **Node version:**
     - Key: `NODE_VERSION`
     - Value: `18`

7. **Deploy Site**
   - Click **"Deploy site"**
   - Initial deployment takes 2-3 minutes

### Step 2.3: Monitor Deployment

Watch the deployment logs:
- Click **"Deploying your site"** to view live logs
- Wait for **"Site is live"** message
- Check for any build errors

**Successful deployment shows:**
```
✔ Site is live
Production: https://taxflow-enhanced.netlify.app
```

---

## ⚙️ Step 3: Configure Environment Variables

### 3.1: Access Site Settings

In Netlify dashboard:
1. Go to your site
2. Click **"Site settings"**
3. Click **"Environment variables"** (under Build & deploy)

### 3.2: Add Environment Variables

Click **"Add a variable"** and add these one by one:

#### Required Production Variables:

| Key | Value | Scope |
|-----|-------|-------|
| `VITE_LOG_LEVEL` | `error` | Production |
| `VITE_USE_MOCK_DATA` | `false` | Production |
| `VITE_ENABLE_PDF_EXPORT` | `true` | Production |
| `VITE_ENABLE_EXCEL_EXPORT` | `true` | Production |
| `VITE_ENABLE_STATE_TAX` | `false` | Production |

#### Optional - For Analytics:

| Key | Value | Scope |
|-----|-------|-------|
| `VITE_ENABLE_ANALYTICS` | `true` | Production |
| `VITE_GA_MEASUREMENT_ID` | `G-XXXXXXXXXX` | Production |

#### Optional - For Monitoring:

| Key | Value | Scope |
|-----|-------|-------|
| `VITE_SENTRY_DSN` | `https://...` | Production |

### 3.3: Deploy Preview Variables (Optional)

Add these for deploy previews (Pull Requests):

| Key | Value | Scope |
|-----|-------|-------|
| `VITE_LOG_LEVEL` | `warn` | Deploy previews |
| `VITE_USE_MOCK_DATA` | `false` | Deploy previews |

### 3.4: Trigger Redeploy

**Important:** After adding environment variables, trigger a new deployment:

**Option A: Via Dashboard**
1. Go to **"Deploys"** tab
2. Click **"Trigger deploy"** → **"Deploy site"**

**Option B: Via CLI**
```bash
netlify deploy --prod
```

**Option C: Via Git Push**
```bash
git commit --allow-empty -m "chore: Trigger redeploy for env vars"
git push origin main
```

---

## 🌐 Step 4: Configure Custom Domain (Optional)

### 4.1: Add Custom Domain

1. **In Netlify Dashboard:**
   - Go to **"Domain management"**
   - Click **"Add custom domain"**

2. **Enter Your Domain:**
   - Example: `taxflow.yourdomain.com`
   - Click **"Verify"**

3. **Domain Ownership:**
   - If you own the domain, click **"Yes, add domain"**

### 4.2: Configure DNS

**Option A: Use Netlify DNS (Recommended)**

1. Click **"Set up Netlify DNS"**
2. Add DNS records if needed
3. Update nameservers at your domain registrar:
   ```
   dns1.p01.nsone.net
   dns2.p01.nsone.net
   dns3.p01.nsone.net
   dns4.p01.nsone.net
   ```

**Option B: Use External DNS**

Add these records at your DNS provider:

**For subdomain (e.g., taxflow.yourdomain.com):**
```
Type: CNAME
Name: taxflow
Value: taxflow-enhanced.netlify.app
```

**For apex domain (e.g., yourdomain.com):**
```
Type: A
Name: @
Value: 75.2.60.5
```

### 4.3: Enable HTTPS

Netlify automatically provisions SSL certificates:
1. Wait 24 hours for DNS propagation
2. Netlify will auto-provision Let's Encrypt certificate
3. HTTPS will be enabled automatically

**Force HTTPS:**
- Go to **"Domain management"** → **"HTTPS"**
- Enable **"Force HTTPS"**

---

## 🔒 Step 5: Configure Security & Performance

### 5.1: Security Headers

Your `netlify.toml` already includes:
- ✅ X-Frame-Options
- ✅ X-Content-Type-Options
- ✅ X-XSS-Protection
- ✅ Content-Security-Policy
- ✅ Permissions-Policy

**Verify in browser:**
1. Open production site
2. Open DevTools (F12) → Network tab
3. Click any request
4. Check **"Response Headers"**

### 5.2: Performance Optimizations

**Asset Optimization (already configured):**
- ✅ Static assets cached for 1 year
- ✅ HTML not cached (fresh on every load)
- ✅ Gzip compression (automatic)

**Additional Optimizations:**

1. **Enable Brotli Compression:**
   - Automatic in Netlify (better than Gzip)

2. **Image Optimization:**
   - Use Netlify Image CDN (upgrade to Pro plan)

3. **Prerendering:**
   - Not needed for this SPA

### 5.3: Forms (if you add them later)

If you add forms to your app:
1. Add `netlify` attribute to `<form>` tag
2. Netlify will handle spam filtering
3. View submissions in dashboard

---

## ✅ Step 6: Post-Deployment Verification

### 6.1: Quick Smoke Test (5 minutes)

Visit your production URL and verify:

**✅ Basic Functionality:**
- [ ] Application loads without errors
- [ ] No console errors (F12 → Console)
- [ ] All assets load (Network tab shows 200 status)
- [ ] Favicon displays correctly

**✅ Core Features:**
- [ ] Can create a new workflow
- [ ] Can add nodes to canvas
- [ ] Can connect nodes
- [ ] Can execute workflow
- [ ] Tax calculations are accurate

**✅ Export Features:**
- [ ] PDF export works
- [ ] Excel export works
- [ ] Downloaded files are valid

**✅ Routing:**
- [ ] All routes work
- [ ] Refresh on `/dashboard` doesn't 404
- [ ] Browser back/forward works

### 6.2: Browser Compatibility Test (10 minutes)

Test on multiple browsers:

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | Latest | ✅ |
| Firefox | Latest | ✅ |
| Safari | Latest | ✅ |
| Edge | Latest | ✅ |

**Test on each:**
- [ ] Page loads
- [ ] No console errors
- [ ] All features work
- [ ] Responsive design works

### 6.3: Mobile Responsiveness (5 minutes)

Test on mobile devices or DevTools device emulation:

**Mobile Devices:**
- [ ] iPhone (iOS Safari)
- [ ] Android (Chrome)
- [ ] iPad (tablet)

**Responsive Breakpoints:**
- [ ] Mobile (< 768px)
- [ ] Tablet (768px - 1024px)
- [ ] Desktop (> 1024px)

### 6.4: Performance Audit (5 minutes)

**Run Lighthouse Audit:**

1. **Via Chrome DevTools:**
   - Open production site
   - Press F12
   - Click **"Lighthouse"** tab
   - Select all categories
   - Click **"Analyze page load"**

2. **Via CLI:**
   ```bash
   npm install -g lighthouse

   lighthouse https://taxflow-enhanced.netlify.app \
     --view \
     --preset=desktop \
     --output=html \
     --output-path=./lighthouse-netlify-report.html
   ```

**Target Scores:**
- ✅ Performance: >90
- ✅ Accessibility: 100
- ✅ Best Practices: >90
- ✅ SEO: >90

### 6.5: Security Audit

**Check Security Headers:**

```bash
curl -I https://taxflow-enhanced.netlify.app | grep -E '(X-Frame|X-Content|X-XSS|Content-Security)'
```

**Expected output:**
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'...
```

### 6.6: Comprehensive Testing

See **DEPLOYMENT_VERIFICATION.md** for complete checklist:
- Tax calculation accuracy (5 test cases)
- All node types functionality
- Workflow execution
- Data persistence
- Accessibility compliance

---

## 🔧 Troubleshooting

### Issue 1: Build Fails

**Symptoms:** Deployment fails during build

**Common Causes & Solutions:**

1. **Missing Dependencies**
   ```bash
   # Check package.json includes all dependencies
   npm install
   npm run build
   ```

2. **TypeScript Errors**
   ```bash
   # Run locally to see errors
   npm run build
   ```

3. **Node Version Mismatch**
   - Check `netlify.toml` has `NODE_VERSION = "18"`
   - Or set in Netlify dashboard: Site settings → Environment variables

4. **Build Command Wrong**
   - Verify in `netlify.toml`: `command = "npm run build"`

**Debug Steps:**
1. Check Netlify build logs for specific error
2. Run `npm run build` locally to reproduce
3. Fix errors and push to Git
4. Netlify will auto-rebuild

### Issue 2: Blank Page After Deployment

**Symptoms:** Site loads but shows blank white page

**Solutions:**

1. **Check Browser Console:**
   ```
   F12 → Console tab
   Look for JavaScript errors
   ```

2. **Check Asset Paths:**
   - Verify `dist` directory has files
   - Check `index.html` loads
   - Check JavaScript files load (Network tab)

3. **Check Base URL:**
   - Should be `/` in `vite.config.ts`
   - Not `/taxflow-enhanced/` (that's for GitHub Pages)

4. **Check Environment Variables:**
   - Verify they start with `VITE_`
   - Check they're set in Netlify dashboard
   - Trigger redeploy after adding them

### Issue 3: 404 on Page Refresh

**Symptoms:** Refreshing `/dashboard` returns 404

**Cause:** SPA routing not configured

**Solutions:**

1. **Check netlify.toml:**
   ```toml
   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

2. **Check _redirects file:**
   ```
   /*    /index.html   200
   ```

3. **Redeploy:**
   ```bash
   netlify deploy --prod
   ```

### Issue 4: Environment Variables Not Working

**Symptoms:** Features not working, console shows undefined env vars

**Solutions:**

1. **Verify Variable Names:**
   - Must start with `VITE_`
   - Example: `VITE_LOG_LEVEL`, not `LOG_LEVEL`

2. **Check Netlify Dashboard:**
   - Site settings → Environment variables
   - Verify variables are set
   - Check they're in "Production" scope

3. **Trigger Redeploy:**
   ```bash
   netlify deploy --prod
   ```

4. **Check Code:**
   ```typescript
   // Correct way to access
   const logLevel = import.meta.env.VITE_LOG_LEVEL;

   // Not process.env.VITE_LOG_LEVEL (that's Node.js)
   ```

### Issue 5: Slow Build Times

**Symptoms:** Builds take >5 minutes

**Solutions:**

1. **Clear Cache:**
   - Netlify dashboard → Deploys → Deploy settings
   - Click **"Clear cache and retry deploy"**

2. **Optimize Dependencies:**
   ```bash
   # Remove unnecessary dev dependencies
   npm prune --production
   ```

3. **Check Build Command:**
   ```bash
   # Should be optimized
   npm run build
   # Not npm install && npm run build (Netlify does install automatically)
   ```

### Issue 6: Custom Domain Not Working

**Symptoms:** Custom domain shows error or doesn't load

**Solutions:**

1. **Check DNS Propagation:**
   ```bash
   # Check DNS records
   dig taxflow.yourdomain.com

   # Or use online tool
   # https://www.whatsmydns.net
   ```

2. **Wait for Propagation:**
   - Can take 24-48 hours
   - Be patient

3. **Verify CNAME Record:**
   ```
   Type: CNAME
   Name: taxflow
   Value: taxflow-enhanced.netlify.app
   TTL: 3600 (or Auto)
   ```

4. **Check SSL Certificate:**
   - Netlify dashboard → Domain management → HTTPS
   - Should show "Certificate active"
   - If "Certificate provisioning", wait up to 24 hours

---

## 🔄 Continuous Deployment

### Automatic Deployments

With Git integration enabled:

**Production Deployments:**
- Push to `main` branch → Automatic production deployment
- Usually completes in 2-3 minutes

**Deploy Preview:**
- Open Pull Request → Automatic preview deployment
- Gets unique URL: `https://deploy-preview-123--taxflow-enhanced.netlify.app`

**Branch Deployments:**
- Push to any branch → Branch deployment (if enabled)
- URL: `https://branch-name--taxflow-enhanced.netlify.app`

### Deployment Notifications

**Enable Notifications:**
1. Netlify dashboard → Site settings → Build & deploy
2. Scroll to **"Deploy notifications"**
3. Add notifications:
   - Email
   - Slack
   - GitHub commit status
   - Webhooks

**Recommended:**
- ✅ Email on failed deploys
- ✅ Slack on production deploys
- ✅ GitHub status checks on PRs

### Deploy Contexts

Your `netlify.toml` configures different settings for:

- **Production** (main branch): Error logging, no mock data
- **Deploy Preview** (PRs): Warning logging, no mock data
- **Branch Deploys**: Production-like settings

---

## 🔙 Rollback Procedures

### Rollback via Dashboard

1. **Go to Deploys Tab**
2. **Find Previous Working Deployment**
   - Look for green checkmark
   - Note the deploy time
3. **Publish Previous Deploy**
   - Click **"..."** on that deployment
   - Click **"Publish deploy"**
   - Confirm

**Rollback completes in ~30 seconds.**

### Rollback via CLI

```bash
# List recent deploys
netlify deploy:list

# Restore specific deploy
netlify deploy:restore <deploy-id>
```

### Rollback via Git

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Netlify will auto-deploy the reverted version
```

---

## 📊 Monitoring & Analytics

### Built-in Netlify Analytics

**Enable Netlify Analytics:**
1. Site settings → Analytics
2. Click **"Enable analytics"**
3. Cost: $9/month per site

**Provides:**
- Page views
- Unique visitors
- Top pages
- Traffic sources
- Bandwidth usage

### External Monitoring

**See MONITORING.md for:**
- Sentry error tracking
- UptimeRobot uptime monitoring

**See ANALYTICS.md for:**
- Plausible Analytics (privacy-first)
- Google Analytics 4

---

## 📞 Support & Resources

### Netlify Documentation
- **Main Docs:** https://docs.netlify.com
- **Deployment:** https://docs.netlify.com/configure-builds/overview/
- **Environment Vars:** https://docs.netlify.com/environment-variables/overview/
- **Redirects:** https://docs.netlify.com/routing/redirects/

### Netlify Support
- **Support Forum:** https://answers.netlify.com
- **Status Page:** https://www.netlifystatus.com
- **Twitter:** @Netlify

### Community Resources
- **GitHub Issues:** https://github.com/kcribb14/taxflow-enhanced/issues
- **Discussions:** https://github.com/kcribb14/taxflow-enhanced/discussions

---

## 📋 Deployment Checklist

Use this checklist for your deployment:

### Pre-Deployment
- [ ] All tests passing (119/119)
- [ ] Production build successful
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] netlify.toml configured
- [ ] Git repository up to date

### Deployment
- [ ] Netlify CLI installed
- [ ] Logged into Netlify
- [ ] Site initialized
- [ ] Preview deployment tested
- [ ] Production deployment successful
- [ ] Deployment URL saved

### Configuration
- [ ] Environment variables set
- [ ] Redeploy triggered after env vars
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active
- [ ] Security headers verified

### Verification
- [ ] Site loads without errors
- [ ] All features work
- [ ] Browser compatibility confirmed
- [ ] Mobile responsiveness verified
- [ ] Lighthouse audit passed (>90 scores)
- [ ] Security headers present

### Post-Deployment
- [ ] Monitoring configured (Sentry)
- [ ] Uptime monitoring setup (UptimeRobot)
- [ ] Analytics configured (Plausible/GA4)
- [ ] Deploy notifications enabled
- [ ] Documentation updated

### Launch
- [ ] README updated with live URL
- [ ] GitHub Release v1.0.0 created
- [ ] Launch announcement prepared
- [ ] Team notified

---

## 🎉 Success!

Once all checklist items are complete:

**Your TaxFlow Enhanced app is:**
- ✅ Live on Netlify
- ✅ Automatic deployments enabled
- ✅ HTTPS secured
- ✅ Performance optimized
- ✅ Monitored and tracked

**Production URL:** `https://taxflow-enhanced.netlify.app`

**Next Steps:**
1. Share your deployment URL
2. Gather user feedback
3. Monitor performance and errors
4. Plan Phase 5 features (State tax support)

---

**Deployed on:** 2025-11-23
**Version:** 1.0.0
**Platform:** Netlify
**Status:** Production Ready ✅
