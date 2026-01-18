# TaxFlow Enhanced - Monitoring & Error Tracking

**Version:** 1.0.0
**Last Updated:** 2025-11-23

---

## Overview

This guide covers setting up error monitoring and application health tracking for TaxFlow Enhanced in production.

---

## Error Tracking with Sentry

### Why Sentry?

- **Real-time error tracking** - Get notified immediately when errors occur
- **Stack traces** - See exactly where errors happen with source maps
- **User context** - Understand what users were doing when errors occurred
- **Performance monitoring** - Track slow operations and bottlenecks
- **Free tier available** - Up to 5,000 errors/month

### Setup Instructions

#### 1. Create Sentry Account

1. Go to [sentry.io](https://sentry.io)
2. Sign up for free account
3. Create new project:
   - Platform: **React**
   - Project name: **taxflow-enhanced**

#### 2. Install Sentry SDK

```bash
npm install @sentry/react @sentry/vite-plugin
```

#### 3. Configure Vite

Update `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';

export default defineConfig({
  plugins: [
    react(),
    sentryVitePlugin({
      org: "your-org-name",
      project: "taxflow-enhanced",
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
  build: {
    sourcemap: true, // Required for Sentry source maps
  },
});
```

#### 4. Initialize Sentry

Create `src/monitoring/sentry.ts`:

```typescript
import * as Sentry from '@sentry/react';
import { isProduction } from '@/config/environment';

export function initializeSentry() {
  if (!isProduction) {
    console.log('Sentry disabled in development');
    return;
  }

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,

    // Set sample rate based on traffic
    tracesSampleRate: 0.1, // 10% of transactions

    // Environment
    environment: import.meta.env.MODE,

    // Release tracking
    release: import.meta.env.VITE_APP_VERSION || '1.0.0',

    // Integrations
    integrations: [
      new Sentry.BrowserTracing(),
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Performance monitoring
    tracesSampler: (samplingContext) => {
      // Always sample errors
      if (samplingContext.transactionContext.name?.includes('error')) {
        return 1.0;
      }

      // Sample normal transactions at 10%
      return 0.1;
    },

    // Privacy - scrub sensitive data
    beforeSend(event, hint) {
      // Remove PII from error reports
      if (event.request) {
        delete event.request.cookies;
      }

      // Remove tax data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
          if (breadcrumb.data) {
            // Remove potentially sensitive fields
            delete breadcrumb.data.income;
            delete breadcrumb.data.deductions;
            delete breadcrumb.data.taxReturn;
          }
          return breadcrumb;
        });
      }

      return event;
    },
  });
}
```

#### 5. Wrap App with Error Boundary

Update `src/main.tsx`:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';
import { initializeSentry } from './monitoring/sentry';
import './index.css';

// Initialize Sentry
initializeSentry();

const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(
  <React.StrictMode>
    <Sentry.ErrorBoundary
      fallback={<ErrorFallback />}
      showDialog
    >
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
```

#### 6. Add Environment Variables

Add to `.env.production`:

```env
# Sentry Configuration
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
VITE_APP_VERSION=1.0.0
```

Add to Vercel environment variables:
- `SENTRY_AUTH_TOKEN` - For uploading source maps
- `VITE_SENTRY_DSN` - For runtime error reporting

#### 7. Manual Error Capture

Capture specific errors manually:

```typescript
import * as Sentry from '@sentry/react';

// Capture exception
try {
  riskyOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      section: 'workflow-execution',
      nodeType: 'AGI Calculator',
    },
    extra: {
      workflowId: workflow.id,
      nodeCount: workflow.nodes.length,
    },
  });
}

// Capture message
Sentry.captureMessage('Unexpected workflow state', {
  level: 'warning',
  tags: { component: 'Canvas' },
});
```

---

## Uptime Monitoring

### UptimeRobot (Recommended)

**Features:**
- Free tier: 50 monitors
- 5-minute check intervals
- Email/SMS/Slack alerts
- Status page
- Response time tracking

#### Setup Instructions

1. **Create Account**
   - Go to [uptimerobot.com](https://uptimerobot.com)
   - Sign up for free account

2. **Add Monitor**
   - Click "Add New Monitor"
   - Monitor Type: **HTTP(S)**
   - Friendly Name: **TaxFlow Enhanced Production**
   - URL: `https://your-production-url.vercel.app`
   - Monitoring Interval: **5 minutes**
   - Alert Contacts: Add your email

3. **Configure Alerts**
   - Set up email alerts
   - Optional: Add Slack webhook
   - Optional: Create public status page

4. **Health Check Endpoint** (Optional)

Create a simple health check:

```typescript
// src/api/health.ts
export function healthCheck() {
  return {
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  };
}
```

---

## Performance Monitoring

### Lighthouse CI

Continuous Lighthouse audits in CI/CD:

```yaml
# Already configured in .github/workflows/ci.yml
- name: Run Lighthouse
  uses: treosh/lighthouse-ci-action@v10
  with:
    urls: http://localhost:8080
    uploadArtifacts: true
```

### Web Vitals Tracking

Track Core Web Vitals:

```typescript
// src/monitoring/webVitals.ts
import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals';
import * as Sentry from '@sentry/react';

export function reportWebVitals() {
  onCLS((metric) => {
    Sentry.setMeasurement('CLS', metric.value, 'none');
  });

  onFID((metric) => {
    Sentry.setMeasurement('FID', metric.value, 'millisecond');
  });

  onFCP((metric) => {
    Sentry.setMeasurement('FCP', metric.value, 'millisecond');
  });

  onLCP((metric) => {
    Sentry.setMeasurement('LCP', metric.value, 'millisecond');
  });

  onTTFB((metric) => {
    Sentry.setMeasurement('TTFB', metric.value, 'millisecond');
  });
}
```

---

## Logging Strategy

### Console Logging Levels

Based on `VITE_LOG_LEVEL` environment variable:

```typescript
// src/utils/logger.ts
import { env } from '@/config/environment';

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = LOG_LEVELS[env.VITE_LOG_LEVEL];

export const logger = {
  debug: (...args: any[]) => {
    if (currentLevel <= LOG_LEVELS.debug) {
      console.debug('[DEBUG]', ...args);
    }
  },

  info: (...args: any[]) => {
    if (currentLevel <= LOG_LEVELS.info) {
      console.info('[INFO]', ...args);
    }
  },

  warn: (...args: any[]) => {
    if (currentLevel <= LOG_LEVELS.warn) {
      console.warn('[WARN]', ...args);
    }
  },

  error: (...args: any[]) => {
    if (currentLevel <= LOG_LEVELS.error) {
      console.error('[ERROR]', ...args);
    }
  },
};
```

### Log in Production

```typescript
// Production: Only errors
VITE_LOG_LEVEL=error

// Development: All logs
VITE_LOG_LEVEL=debug
```

---

## Alerts & Notifications

### Sentry Alerts

Configure in Sentry dashboard:

1. **Error Rate Alerts**
   - Trigger: >10 errors in 1 hour
   - Action: Email team

2. **New Issues**
   - Trigger: First occurrence of new error
   - Action: Slack notification

3. **Performance Degradation**
   - Trigger: P95 response time >1s
   - Action: Email notification

### UptimeRobot Alerts

1. **Downtime**
   - Trigger: Site down for >5 minutes
   - Action: Email + SMS

2. **Slow Response**
   - Trigger: Response time >5s
   - Action: Email notification

---

## Dashboard & Reporting

### Sentry Dashboard

Key metrics to monitor:

- **Error Rate:** Errors per hour/day
- **Affected Users:** Number of users experiencing errors
- **Error Types:** Top error messages
- **Browser Distribution:** Which browsers have most errors
- **Release Comparison:** Error rate across versions

### Weekly Reports

Set up automated weekly reports:

1. Go to Sentry Settings → Integrations
2. Configure email digest
3. Schedule: Monday 9 AM
4. Include:
   - New issues
   - Error trends
   - Performance metrics

---

## Privacy & Compliance

### PII Protection

**DO NOT** send to Sentry:
- Tax data (income, deductions, etc.)
- Personal information (names, SSNs)
- Financial details

**Scrubbing Configuration:**

```typescript
beforeSend(event) {
  // Remove sensitive fields from context
  if (event.contexts?.taxData) {
    delete event.contexts.taxData;
  }

  // Sanitize breadcrumbs
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map(crumb => {
      if (crumb.category === 'tax-calculation') {
        return { ...crumb, data: { redacted: true } };
      }
      return crumb;
    });
  }

  return event;
}
```

### GDPR Compliance

If serving EU users:

1. Add cookie consent banner
2. Document data collection in privacy policy
3. Provide opt-out mechanism
4. Configure Sentry data retention (30 days recommended)

---

## Cost Management

### Sentry Pricing Tiers

| Tier | Errors/Month | Cost |
|------|--------------|------|
| Developer | 5,000 | Free |
| Team | 50,000 | $26/month |
| Business | 100,000 | $80/month |

### Optimization Tips

1. **Sample strategically:**
   ```typescript
   tracesSampleRate: 0.1, // 10% sampling
   ```

2. **Filter noisy errors:**
   ```typescript
   ignoreErrors: [
     'ResizeObserver loop limit exceeded',
     'Non-Error promise rejection',
   ],
   ```

3. **Set quotas in Sentry dashboard**

---

## Troubleshooting

### Source Maps Not Uploading

**Issue:** Stack traces show minified code

**Solutions:**
1. Verify `SENTRY_AUTH_TOKEN` is set
2. Check `sourcemap: true` in vite.config.ts
3. Verify Sentry CLI is installed
4. Check build logs for upload errors

### Too Many Errors

**Issue:** Hitting Sentry quota

**Solutions:**
1. Increase sample rate filtering
2. Add more ignoreErrors patterns
3. Fix high-frequency bugs first
4. Consider upgrading tier

### No Data in Sentry

**Issue:** Errors not appearing

**Solutions:**
1. Verify DSN is correct
2. Check environment is 'production'
3. Test with manual `Sentry.captureException()`
4. Check browser console for Sentry warnings

---

## Best Practices

1. **Tag Errors Meaningfully:**
   ```typescript
   Sentry.setTag('workflow_type', 'complex');
   Sentry.setTag('node_count', workflow.nodes.length);
   ```

2. **Add Context:**
   ```typescript
   Sentry.setContext('workflow', {
     id: workflow.id,
     nodeCount: workflow.nodes.length,
     connectionCount: workflow.connections.length,
   });
   ```

3. **Track Releases:**
   ```bash
   sentry-cli releases new v1.0.1
   sentry-cli releases finalize v1.0.1
   ```

4. **Monitor Performance:**
   - Track slow node executions
   - Monitor bundle load times
   - Track API response times (if added)

---

## Support

- **Sentry Docs:** https://docs.sentry.io/platforms/javascript/guides/react/
- **UptimeRobot Docs:** https://uptimerobot.com/api/
- **Web Vitals:** https://web.dev/vitals/

---

**Status:** Template ready for production deployment 📊
**Next:** Configure Sentry account and deploy
