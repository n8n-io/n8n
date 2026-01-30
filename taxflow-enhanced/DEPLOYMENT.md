# TaxFlow Enhanced - Deployment Guide

This guide provides step-by-step instructions for deploying TaxFlow Enhanced to various hosting platforms.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Options](#deployment-options)
3. [Vercel Deployment (Recommended)](#vercel-deployment)
4. [Netlify Deployment](#netlify-deployment)
5. [GitHub Pages Deployment](#github-pages-deployment)
6. [Self-Hosted (Nginx) Deployment](#self-hosted-nginx-deployment)
7. [Docker Deployment](#docker-deployment)
8. [Environment Configuration](#environment-configuration)
9. [Post-Deployment Verification](#post-deployment-verification)
10. [Troubleshooting](#troubleshooting)
11. [Rollback Procedures](#rollback-procedures)

---

## Pre-Deployment Checklist

Before deploying, ensure all the following are complete:

- [ ] All tests passing (`npm run test:run`)
- [ ] Production build successful (`npm run build`)
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] No linting errors (`npm run lint`)
- [ ] Environment variables configured
- [ ] Documentation reviewed and updated
- [ ] Git repository is up to date

### Quick Verification

```bash
# Run all pre-deployment checks
npm run test:run && \
npm run typecheck && \
npm run lint && \
npm run build && \
echo "✅ All checks passed - ready for deployment"
```

---

## Deployment Options

| Platform | Difficulty | Cost | Best For |
|----------|-----------|------|----------|
| **Vercel** | ⭐ Easy | Free tier available | Quick deployment, demos |
| **Netlify** | ⭐ Easy | Free tier available | Alternative to Vercel |
| **GitHub Pages** | ⭐⭐ Medium | Free | Open source projects |
| **Self-Hosted (Nginx)** | ⭐⭐⭐ Advanced | Server costs | Full control |
| **Docker** | ⭐⭐⭐ Advanced | Server costs | Scalability, portability |

---

## Vercel Deployment

**Recommended for:** Quick deployment, staging environments, production

### Prerequisites
- GitHub/GitLab/Bitbucket account
- Vercel account (free tier available)

### Method 1: Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from project directory
cd taxflow-enhanced
vercel

# Follow prompts:
# - Set up and deploy: Yes
# - Link to existing project: No
# - Project name: taxflow-enhanced
# - Directory: ./
# - Want to override settings: No

# Production deployment
vercel --prod
```

### Method 2: Vercel Git Integration

1. **Push code to Git:**
   ```bash
   git push origin main
   ```

2. **Import project in Vercel:**
   - Go to https://vercel.com/new
   - Click "Import Project"
   - Select your Git repository
   - Framework Preset: Vite
   - Root Directory: `taxflow-enhanced/`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Click "Deploy"

3. **Configure Environment Variables:**
   - Go to Project Settings → Environment Variables
   - Add production variables:
     ```
     VITE_LOG_LEVEL=error
     VITE_USE_MOCK_DATA=false
     VITE_ENABLE_ANALYTICS=true
     ```

4. **Custom Domain (Optional):**
   - Go to Project Settings → Domains
   - Add your custom domain
   - Configure DNS as instructed

### Vercel Configuration File

Create `vercel.json` in project root (optional):

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

**Deployment URL:** `https://taxflow-enhanced.vercel.app`

---

## Netlify Deployment

**Recommended for:** Teams already using Netlify, alternative to Vercel

### Method 1: Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Initialize site
netlify init

# Deploy
netlify deploy

# Production deployment
netlify deploy --prod
```

### Method 2: Netlify Git Integration

1. **Push code to Git:**
   ```bash
   git push origin main
   ```

2. **Create new site in Netlify:**
   - Go to https://app.netlify.com
   - Click "Add new site" → "Import an existing project"
   - Connect to Git provider
   - Select repository
   - Configure build settings:
     - Base directory: `taxflow-enhanced`
     - Build command: `npm run build`
     - Publish directory: `taxflow-enhanced/dist`

3. **Environment Variables:**
   - Go to Site Settings → Environment Variables
   - Add production variables

### Netlify Configuration File

Create `netlify.toml` in project root:

```toml
[build]
  base = "taxflow-enhanced/"
  publish = "dist"
  command = "npm run build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

**Deployment URL:** `https://taxflow-enhanced.netlify.app`

---

## GitHub Pages Deployment

**Recommended for:** Open source projects, documentation sites

### Prerequisites
- GitHub repository
- GitHub Pages enabled

### Deployment Steps

1. **Install gh-pages package:**
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Update `package.json`:**
   ```json
   {
     "homepage": "https://yourusername.github.io/taxflow-enhanced",
     "scripts": {
       "predeploy": "npm run build",
       "deploy": "gh-pages -d dist"
     }
   }
   ```

3. **Configure Vite for GitHub Pages:**

   Update `vite.config.ts`:
   ```typescript
   export default defineConfig(({ mode }) => {
     return {
       base: mode === 'production' ? '/taxflow-enhanced/' : '/',
       // ... rest of config
     };
   });
   ```

4. **Deploy:**
   ```bash
   npm run deploy
   ```

5. **Enable GitHub Pages:**
   - Go to repository Settings → Pages
   - Source: Deploy from a branch
   - Branch: `gh-pages` → `/ (root)`
   - Save

**Deployment URL:** `https://yourusername.github.io/taxflow-enhanced`

### Limitations
- Must be served from a subdirectory (unless using custom domain)
- No server-side logic
- Manual deployment process

---

## Self-Hosted (Nginx) Deployment

**Recommended for:** Production deployments requiring full control

### Prerequisites
- Linux server (Ubuntu 20.04+ recommended)
- Nginx installed
- Domain name (optional but recommended)
- SSL certificate (Let's Encrypt recommended)

### Step 1: Build Application

```bash
# On your local machine
npm run build

# Create tarball
cd dist
tar -czf taxflow-enhanced.tar.gz *
```

### Step 2: Upload to Server

```bash
# Upload build files
scp taxflow-enhanced.tar.gz user@your-server.com:/var/www/

# SSH into server
ssh user@your-server.com
```

### Step 3: Extract Files

```bash
# Create directory
sudo mkdir -p /var/www/taxflow-enhanced

# Extract files
cd /var/www/taxflow-enhanced
sudo tar -xzf ../taxflow-enhanced.tar.gz

# Set permissions
sudo chown -R www-data:www-data /var/www/taxflow-enhanced
```

### Step 4: Configure Nginx

Create `/etc/nginx/sites-available/taxflow-enhanced`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name taxflow.example.com;

    # Redirect to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name taxflow.example.com;

    # SSL Configuration (use certbot for Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/taxflow.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/taxflow.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Root directory
    root /var/www/taxflow-enhanced;
    index index.html;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
    gzip_min_length 1000;

    # Asset caching
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security - hide version
    server_tokens off;
}
```

### Step 5: Enable Site

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/taxflow-enhanced /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Step 6: SSL Certificate (Let's Encrypt)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d taxflow.example.com

# Auto-renewal (certbot sets this up automatically)
sudo certbot renew --dry-run
```

**Deployment URL:** `https://taxflow.example.com`

---

## Docker Deployment

**Recommended for:** Scalable deployments, containerized infrastructure

### Dockerfile

Create `Dockerfile` in `taxflow-enhanced/`:

```dockerfile
# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

### Nginx Configuration for Docker

Create `nginx.conf`:

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Asset caching
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  taxflow:
    build:
      context: ./taxflow-enhanced
      dockerfile: Dockerfile
    ports:
      - "8080:80"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/"]
      interval: 30s
      timeout: 3s
      retries: 3
```

### Build and Run

```bash
# Build image
docker build -t taxflow-enhanced:latest ./taxflow-enhanced

# Run container
docker run -d -p 8080:80 --name taxflow taxflow-enhanced:latest

# Or use docker-compose
docker-compose up -d

# View logs
docker logs taxflow

# Stop container
docker stop taxflow
```

### Docker Hub Deployment

```bash
# Tag image
docker tag taxflow-enhanced:latest yourusername/taxflow-enhanced:latest

# Push to Docker Hub
docker push yourusername/taxflow-enhanced:latest

# Pull and run on server
docker pull yourusername/taxflow-enhanced:latest
docker run -d -p 80:80 yourusername/taxflow-enhanced:latest
```

**Deployment URL:** `http://your-server:8080`

---

## Environment Configuration

### Production Environment Variables

Set these in your deployment platform:

```env
# Production settings
VITE_LOG_LEVEL=error
VITE_USE_MOCK_DATA=false

# Enable features
VITE_ENABLE_PDF_EXPORT=true
VITE_ENABLE_EXCEL_EXPORT=true

# Analytics (if using)
VITE_ENABLE_ANALYTICS=true
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# API (if using backend)
VITE_API_URL=https://api.taxflow.example.com
```

### Platform-Specific Configuration

**Vercel:**
- Settings → Environment Variables → Add each variable

**Netlify:**
- Site Settings → Environment Variables → Add each variable

**Docker:**
- Use `--env-file` flag or docker-compose environment section

**Nginx:**
- Not applicable (environment variables are baked into build)

---

## Post-Deployment Verification

### Checklist

After deployment, verify the following:

- [ ] **Application loads:** Site is accessible at deployment URL
- [ ] **No console errors:** Open DevTools and check console
- [ ] **Assets loading:** All CSS, JS, and images load correctly
- [ ] **Workflow creation:** Can create and save workflows
- [ ] **Node functionality:** All node types work correctly
- [ ] **Calculation accuracy:** Tax calculations are correct
- [ ] **Export features:** PDF and Excel exports work
- [ ] **Mobile responsive:** Test on mobile devices
- [ ] **Browser compatibility:** Test on Chrome, Firefox, Safari, Edge

### Lighthouse Audit

Run Lighthouse audit (Chrome DevTools):

```bash
# Or use CLI
npm install -g lighthouse

lighthouse https://your-deployment-url.com \
  --view \
  --preset=desktop
```

**Target Scores:**
- Performance: >90
- Accessibility: 100
- Best Practices: >90
- SEO: >90

### Health Check Script

```bash
#!/bin/bash
# health-check.sh

URL="https://your-deployment-url.com"

# Check if site is up
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $URL)

if [ $HTTP_CODE -eq 200 ]; then
  echo "✅ Site is up (HTTP $HTTP_CODE)"
else
  echo "❌ Site is down (HTTP $HTTP_CODE)"
  exit 1
fi

# Check for critical resources
curl -s $URL/assets/*.js > /dev/null
echo "✅ JavaScript assets loading"

curl -s $URL/assets/*.css > /dev/null
echo "✅ CSS assets loading"

echo "✅ All health checks passed"
```

---

## Troubleshooting

### Issue: Blank Page After Deployment

**Symptoms:** Site loads but shows blank page

**Solutions:**
1. Check browser console for errors
2. Verify base URL in `vite.config.ts` matches deployment path
3. Check that all assets are being served correctly
4. Verify environment variables are set

### Issue: 404 on Page Refresh

**Symptoms:** Refreshing any non-root route returns 404

**Solutions:**
- **Vercel/Netlify:** Add rewrite rules (see config files above)
- **Nginx:** Ensure `try_files` directive is configured
- **GitHub Pages:** May not support SPA routing (use hash routing)

### Issue: Environment Variables Not Working

**Symptoms:** Features not working as expected, mock data in production

**Solutions:**
1. Verify variables are prefixed with `VITE_`
2. Check deployment platform has variables set
3. Rebuild application after setting variables
4. Check `src/config/environment.ts` for validation errors

### Issue: Slow Load Times

**Symptoms:** Initial page load is slow

**Solutions:**
1. Verify code splitting is working (`dist/assets/js/` has multiple chunks)
2. Check Gzip/Brotli compression is enabled
3. Use CDN for asset delivery
4. Optimize images and assets
5. Review bundle analysis: `npm run build` and check `dist/stats.html`

### Issue: Build Fails in CI/CD

**Symptoms:** Build works locally but fails in deployment

**Solutions:**
1. Check Node version matches local (18+)
2. Verify all dependencies are in `package.json`
3. Check for environment-specific code
4. Review build logs for specific errors
5. Clear dependency cache and rebuild

---

## Rollback Procedures

### Vercel

```bash
# List deployments
vercel ls

# Rollback to previous deployment
vercel rollback <deployment-url>
```

Or use Vercel dashboard:
1. Go to Deployments
2. Find previous working deployment
3. Click "..." → "Promote to Production"

### Netlify

1. Go to Deploys tab
2. Find previous working deployment
3. Click "Publish deploy"

### Docker

```bash
# Pull previous version
docker pull yourusername/taxflow-enhanced:v1.0.0

# Stop current container
docker stop taxflow
docker rm taxflow

# Run previous version
docker run -d -p 80:80 --name taxflow \
  yourusername/taxflow-enhanced:v1.0.0
```

### Self-Hosted

```bash
# Restore from backup
sudo rm -rf /var/www/taxflow-enhanced/*
sudo tar -xzf /backups/taxflow-enhanced-backup.tar.gz \
  -C /var/www/taxflow-enhanced/

# Reload Nginx
sudo systemctl reload nginx
```

---

## Monitoring and Maintenance

### Recommended Monitoring

- **Uptime Monitoring:** UptimeRobot, Pingdom
- **Error Tracking:** Sentry, LogRocket
- **Analytics:** Google Analytics, Plausible
- **Performance:** Lighthouse CI, SpeedCurve

### Regular Maintenance

- **Weekly:** Check deployment health, review error logs
- **Monthly:** Update dependencies, security patches
- **Quarterly:** Review performance metrics, optimize as needed
- **Annually:** Renew SSL certificates (if manual), review architecture

---

## Support

### Getting Help

- **Documentation:** See DEVELOPER_GUIDE.md and USER_GUIDE.md
- **GitHub Issues:** Report bugs or request features
- **Community:** Join discussions

### Deployment Support Contacts

- **Vercel:** https://vercel.com/support
- **Netlify:** https://answers.netlify.com
- **GitHub:** https://github.com/contact

---

## Appendix

### Useful Commands Reference

```bash
# Build Commands
npm run build          # Production build
npm run preview        # Preview production build locally

# Testing
npm run test:run       # Run all tests
npm run typecheck      # Type check

# Deployment
vercel --prod          # Deploy to Vercel production
netlify deploy --prod  # Deploy to Netlify production
npm run deploy         # Deploy to GitHub Pages

# Docker
docker build -t taxflow .        # Build Docker image
docker run -p 80:80 taxflow      # Run Docker container
docker-compose up -d             # Start with docker-compose
```

### Additional Resources

- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [React Deployment Guide](https://react.dev/learn/start-a-new-react-project#deploying-to-production)
- [Vercel Documentation](https://vercel.com/docs)
- [Netlify Documentation](https://docs.netlify.com)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Docker Documentation](https://docs.docker.com)

---

**Last Updated:** 2025-11-23
**Version:** 1.0.0
**Maintained By:** TaxFlow Enhanced Team
