# TaxFlow Enhanced - Analytics Integration

**Version:** 1.0.0
**Last Updated:** 2025-11-23

---

## Overview

This guide covers implementing privacy-friendly analytics for TaxFlow Enhanced to understand user behavior and improve the application.

**Important:** TaxFlow Enhanced is client-side only and handles sensitive tax data. Analytics must be implemented with privacy as the top priority.

---

## Privacy-First Principles

### What We Track ✅

- **Usage patterns:** Which features are used most
- **Workflow metrics:** Average nodes per workflow, execution frequency
- **Performance:** Load times, error rates
- **Browser/OS distribution:** For compatibility planning
- **Geography (country level only):** For tax law relevance

### What We NEVER Track ❌

- **Tax data:** Income amounts, deductions, personal info
- **PII:** Names, addresses, SSNs, email addresses
- **Sensitive calculations:** Actual tax amounts
- **Workflow content:** Specific node configurations
- **User identification:** Cross-session tracking

---

## Analytics Options

### Option 1: Plausible Analytics (Recommended)

**Why Plausible?**
- ✅ Privacy-focused (GDPR, CCPA compliant)
- ✅ No cookies or personal data collection
- ✅ Simple, lightweight script (<1KB)
- ✅ Open source
- ✅ GDPR compliant without consent banners

**Pricing:**
- 10,000 pageviews/month: $9/month
- 100,000 pageviews/month: $19/month

#### Setup Instructions

1. **Create Account**
   - Go to [plausible.io](https://plausible.io)
   - Sign up for account
   - Add website: `your-domain.com`

2. **Get Script URL**
   ```
   https://plausible.io/js/script.js
   ```

3. **Add to HTML**

Update `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TaxFlow Enhanced</title>

    <!-- Plausible Analytics -->
    <script
      defer
      data-domain="your-domain.com"
      src="https://plausible.io/js/script.js"
    ></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

4. **Track Custom Events**

```typescript
// src/utils/analytics.ts
import { env, isFeatureEnabled } from '@/config/environment';

declare global {
  interface Window {
    plausible?: (event: string, options?: any) => void;
  }
}

export const analytics = {
  trackEvent: (eventName: string, props?: Record<string, any>) => {
    if (!isFeatureEnabled('VITE_ENABLE_ANALYTICS')) {
      return;
    }

    if (window.plausible) {
      // Remove any sensitive data from props
      const sanitizedProps = sanitizeProps(props);
      window.plausible(eventName, { props: sanitizedProps });
    }
  },
};

function sanitizeProps(props?: Record<string, any>) {
  if (!props) return undefined;

  // Remove sensitive fields
  const {
    income,
    deductions,
    taxReturn,
    personalInfo,
    ...safeProps
  } = props;

  return safeProps;
}
```

5. **Track Key Actions**

```typescript
// In components
import { analytics } from '@/utils/analytics';

// Workflow created
analytics.trackEvent('workflow_created', {
  nodeCount: workflow.nodes.length,
});

// Workflow executed
analytics.trackEvent('workflow_executed', {
  nodeCount: workflow.nodes.length,
  executionTime: elapsedMs,
  success: true,
});

// PDF exported
analytics.trackEvent('pdf_exported');

// Node added
analytics.trackEvent('node_added', {
  nodeType: node.type,
  category: node.category,
});
```

6. **Environment Variable**

```env
# .env.production
VITE_ENABLE_ANALYTICS=true

# .env.development
VITE_ENABLE_ANALYTICS=false
```

---

### Option 2: Google Analytics 4 (GA4)

**Use if:**
- You need detailed funnel analysis
- You want cross-platform tracking
- You need integration with Google Ads

**Privacy Considerations:**
- ⚠️ Requires cookie consent in EU
- ⚠️ More invasive than Plausible
- ⚠️ Third-party data sharing

#### Setup Instructions

1. **Create GA4 Property**
   - Go to [analytics.google.com](https://analytics.google.com)
   - Create new property
   - Get Measurement ID (G-XXXXXXXXXX)

2. **Install Package**

```bash
npm install react-ga4
```

3. **Initialize GA4**

```typescript
// src/utils/analytics-ga4.ts
import ReactGA from 'react-ga4';
import { env, isFeatureEnabled, isProduction } from '@/config/environment';

export function initializeAnalytics() {
  if (!isFeatureEnabled('VITE_ENABLE_ANALYTICS')) {
    return;
  }

  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;

  if (!measurementId) {
    console.warn('GA4 Measurement ID not configured');
    return;
  }

  ReactGA.initialize(measurementId, {
    testMode: !isProduction,
    gaOptions: {
      anonymizeIp: true, // Anonymize IP addresses
      cookieFlags: 'SameSite=None; Secure', // Cookie security
    },
    gtagOptions: {
      send_page_view: false, // Manual pageview tracking
      cookie_expires: 90, // Cookie expiry in days
    },
  });

  console.log('GA4 initialized');
}
```

4. **Track Events**

```typescript
import ReactGA from 'react-ga4';

// Page view
ReactGA.send({ hitType: 'pageview', page: window.location.pathname });

// Custom event
ReactGA.event({
  category: 'Workflow',
  action: 'Created',
  label: 'Standard',
  value: nodeCount,
});

// Timing
ReactGA.event({
  category: 'Performance',
  action: 'Workflow Execution',
  value: executionTimeMs,
});
```

5. **Privacy Configuration**

```typescript
// Disable advertising features
ReactGA.gtag('config', measurementId, {
  allow_google_signals: false,
  allow_ad_personalization_signals: false,
});

// Data retention
// Set in GA4 dashboard: Admin → Data Settings → Data Retention → 2 months
```

6. **Environment Variables**

```env
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_ENABLE_ANALYTICS=true
```

---

### Option 3: Self-Hosted (Matomo)

**Use if:**
- You need complete data ownership
- You're in a regulated industry
- You want no third-party dependencies

**Setup:** See [Matomo documentation](https://matomo.org/docs/)

---

## Recommended Events to Track

### Core Events

```typescript
// Application lifecycle
analytics.trackEvent('app_loaded', {
  loadTime: performance.now(),
  userAgent: navigator.userAgent,
});

// Workflow events
analytics.trackEvent('workflow_created');
analytics.trackEvent('workflow_loaded');
analytics.trackEvent('workflow_saved');
analytics.trackEvent('workflow_cleared');

// Execution events
analytics.trackEvent('workflow_executed', {
  nodeCount: number,
  executionTime: milliseconds,
  success: boolean,
});

analytics.trackEvent('execution_error', {
  errorType: string,
  nodeType: string,
});

// Node events
analytics.trackEvent('node_added', {
  nodeType: 'AGICalculator' | 'Form1040' | etc,
  category: 'input' | 'calculation' | etc,
});

analytics.trackEvent('node_removed', {
  nodeType: string,
});

// Feature usage
analytics.trackEvent('pdf_exported');
analytics.trackEvent('excel_exported');
analytics.trackEvent('search_used');

// Errors
analytics.trackEvent('error_boundary_triggered', {
  component: string,
  errorMessage: string, // Sanitized
});

// Performance
analytics.trackEvent('slow_operation', {
  operation: string,
  duration: milliseconds,
});
```

### User Journey

```typescript
// Session start
analytics.trackEvent('session_start');

// Key milestones
analytics.trackEvent('first_node_added');
analytics.trackEvent('first_connection_made');
analytics.trackEvent('first_workflow_executed');
analytics.trackEvent('first_export');
```

---

## Event Sanitization

Always sanitize events to remove sensitive data:

```typescript
// src/utils/analytics.ts

const SENSITIVE_FIELDS = [
  'income',
  'wages',
  'deductions',
  'tax',
  'refund',
  'ssn',
  'name',
  'address',
  'email',
  'taxReturn',
  'personalInfo',
  'taxpayerInfo',
];

export function sanitizeEventData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sanitized: any = {};

  for (const [key, value] of Object.entries(data)) {
    // Skip sensitive fields
    if (SENSITIVE_FIELDS.some(field =>
      key.toLowerCase().includes(field.toLowerCase())
    )) {
      continue;
    }

    // Recursively sanitize nested objects
    if (typeof value === 'object') {
      sanitized[key] = sanitizeEventData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
```

---

## Cookie Consent (If Required)

If using GA4 or other cookie-based analytics in EU:

### Cookie Consent Banner

```bash
npm install react-cookie-consent
```

```typescript
import CookieConsent from 'react-cookie-consent';

function App() {
  return (
    <>
      <CookieConsent
        location="bottom"
        buttonText="Accept"
        declineButtonText="Decline"
        enableDeclineButton
        onAccept={() => {
          initializeAnalytics();
        }}
        style={{ background: '#2B373B' }}
        buttonStyle={{ color: '#4e503b', fontSize: '13px' }}
      >
        We use cookies to improve your experience. No personal tax data is collected.
      </CookieConsent>

      {/* Rest of app */}
    </>
  );
}
```

**Note:** Plausible doesn't require consent banners as it doesn't use cookies.

---

## Dashboard & Reporting

### Key Metrics to Track

1. **Usage Metrics**
   - Daily/weekly/monthly active users
   - Average session duration
   - Page views per session

2. **Feature Adoption**
   - % of users creating workflows
   - % of users executing calculations
   - % of users exporting (PDF/Excel)
   - Most used node types

3. **Performance Metrics**
   - Average page load time
   - Average workflow execution time
   - Error rate
   - Bounce rate

4. **Workflow Metrics**
   - Average nodes per workflow
   - Average connections per workflow
   - Most common workflow patterns
   - Execution success rate

### Custom Reports

#### Plausible Custom Goals

1. Go to Plausible → Settings → Goals
2. Add custom events:
   - `workflow_executed`
   - `pdf_exported`
   - `excel_exported`

#### GA4 Custom Reports

1. Go to GA4 → Configure → Custom Definitions
2. Add custom dimensions:
   - `node_count`
   - `execution_time`
   - `node_type`

---

## Privacy Policy

Update your privacy policy to include analytics:

```markdown
## Analytics

We use privacy-focused analytics to understand how our application is used:

### Data We Collect:
- Page views and navigation patterns
- Feature usage (which buttons are clicked)
- Workflow statistics (number of nodes, execution frequency)
- Performance metrics (load times, errors)
- Device and browser information

### Data We DO NOT Collect:
- Personal information (names, addresses, emails)
- Tax data (income, deductions, calculations)
- Workflow content or specific configurations
- Cookies or cross-site tracking (if using Plausible)

### Analytics Provider:
- [Plausible Analytics / Google Analytics]
- Data retention: [30 / 90] days
- No third-party sharing
- GDPR and CCPA compliant

### Your Rights:
- Opt-out available at [link]
- Data deletion requests: [email]
```

---

## Cost Comparison

| Provider | Free Tier | Paid | Privacy | Cookies |
|----------|-----------|------|---------|---------|
| Plausible | No | $9-19/mo | ⭐⭐⭐⭐⭐ | No |
| GA4 | Yes | Free | ⭐⭐⭐ | Yes |
| Matomo Cloud | 21 day trial | $19/mo | ⭐⭐⭐⭐⭐ | Optional |
| Fathom | No | $14/mo | ⭐⭐⭐⭐⭐ | No |

---

## Recommendations

### For Public Launch
**Use:** Plausible Analytics
- No cookies = No consent banner needed
- Privacy-focused
- Simple to implement
- Affordable

### For Enterprise/Internal
**Use:** Matomo (self-hosted)
- Complete data ownership
- No third-party dependencies
- Full GDPR compliance

### For Detailed Analysis
**Use:** GA4 + Cookie Consent
- Free
- Powerful analysis tools
- Requires consent banner

---

## Testing Analytics

### Development Testing

```typescript
// src/utils/analytics.ts

if (import.meta.env.DEV) {
  // Log analytics events in console instead of sending
  window.plausible = (event, options) => {
    console.log('[Analytics]', event, options);
  };
}
```

### Verify in Production

1. Open browser DevTools → Network tab
2. Filter for "plausible.io" or "google-analytics.com"
3. Trigger an event
4. Verify request appears
5. Check analytics dashboard for event

---

## Support

- **Plausible Docs:** https://plausible.io/docs
- **GA4 Docs:** https://developers.google.com/analytics/devguides/collection/ga4
- **Matomo Docs:** https://matomo.org/docs/

---

**Status:** Template ready for implementation 📈
**Recommendation:** Start with Plausible for privacy and simplicity
**Next:** Choose provider and configure account
