# Security Policy

## Supported Versions

We release patches for security vulnerabilities. The following versions are currently supported:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

The TaxFlow Enhanced team takes security bugs seriously. We appreciate your efforts to responsibly disclose your findings, and will make every effort to acknowledge your contributions.

### How to Report a Security Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to: [INSERT SECURITY EMAIL]

If possible, encrypt your message with our PGP key (available upon request).

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

### What to Include in Your Report

Please include the following information to help us better understand the nature and scope of the possible issue:

* Type of issue (e.g. buffer overflow, SQL injection, cross-site scripting, etc.)
* Full paths of source file(s) related to the manifestation of the issue
* The location of the affected source code (tag/branch/commit or direct URL)
* Any special configuration required to reproduce the issue
* Step-by-step instructions to reproduce the issue
* Proof-of-concept or exploit code (if possible)
* Impact of the issue, including how an attacker might exploit it

This information will help us triage your report more quickly.

## Preferred Languages

We prefer all communications to be in English.

## Security Update Process

When we receive a security bug report, we will:

1. **Confirm the problem** and determine the affected versions
2. **Audit code** to find any similar problems
3. **Prepare fixes** for all supported releases
4. **Release new security versions** as soon as possible

## Security Best Practices

When using TaxFlow Enhanced, please follow these security best practices:

### Client-Side Security

* **Data Privacy:** TaxFlow Enhanced runs entirely in the browser. All tax data is stored locally (IndexedDB) and never transmitted to external servers.
* **HTTPS Only:** Always access TaxFlow Enhanced over HTTPS in production
* **Keep Updated:** Use the latest version to ensure you have all security patches
* **Browser Security:** Keep your browser updated to the latest version

### Environment Variables

* **Never commit secrets:** Do not commit `.env` files or any files containing sensitive information
* **Use environment-specific files:** Use `.env.development` for development and configure production variables in your deployment platform
* **Validate inputs:** All environment variables are validated using Zod schemas

### Deployment Security

* **Security Headers:** Ensure the following headers are configured:
  ```
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Content-Security-Policy: (configure as needed)
  ```
* **CORS:** Configure CORS appropriately if adding backend services
* **SSL/TLS:** Always use valid SSL certificates (Vercel provides this automatically)

### Dependencies

* **Regular Updates:** Run `npm audit` regularly to check for vulnerabilities
* **Automated Scanning:** Use Dependabot or similar tools to automate dependency updates
* **Review Dependencies:** Review all dependencies before adding them to the project

## Known Security Considerations

### Client-Side Only Architecture

TaxFlow Enhanced is designed as a client-side only application:

* **Pros:**
  - No server-side vulnerabilities (XSS, SQL injection, etc.)
  - User data never leaves their browser
  - No database to compromise
  - No authentication system to hack

* **Cons:**
  - All code is visible to users (not a security issue for this project)
  - Calculations can be inspected (expected behavior)
  - Data stored locally can be accessed if device is compromised

### Data Storage

* **IndexedDB:** Workflow data stored in browser's IndexedDB
* **No Encryption:** Data is not encrypted at rest (browser security responsibility)
* **Local Only:** Data never synchronized to cloud (by design)

### Third-Party Services

If you enable optional integrations:

* **Analytics:** Review privacy policies of analytics providers
* **Error Tracking:** Ensure PII is not included in error reports
* **External APIs:** Validate all responses from external services

## Security Disclosure Policy

When we receive a security report:

* We will **acknowledge receipt** within 48 hours
* We will **confirm or deny** the vulnerability within 1 week
* We will **develop a fix** and release timeline
* We will **credit reporters** in release notes (unless they prefer to remain anonymous)

## Security Hall of Fame

We maintain a Security Hall of Fame to recognize security researchers who have helped make TaxFlow Enhanced more secure:

<!-- This section will be updated as we receive security reports -->

*No security vulnerabilities have been reported yet.*

## Contact

For security-related questions or concerns, please contact:

**Email:** [INSERT SECURITY EMAIL]
**PGP Key:** [INSERT PGP KEY or REQUEST URL]

For non-security issues, please use:
* **GitHub Issues:** For bugs and feature requests
* **GitHub Discussions:** For questions and community support

## Disclaimer

While we strive to make TaxFlow Enhanced as secure as possible, please note:

* **Tax Tool Only:** TaxFlow Enhanced is a calculation tool, not a tax filing service
* **Professional Advice:** Always consult a qualified tax professional for complex situations
* **No Warranty:** This software is provided "as is" without warranty (see MIT License)
* **User Responsibility:** Users are responsible for the accuracy of their tax data and calculations

## Additional Resources

* [OWASP Top 10](https://owasp.org/www-project-top-ten/)
* [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
* [React Security Best Practices](https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml)
* [Vite Security](https://vitejs.dev/guide/env-and-mode.html#security-notes)

---

**Last Updated:** 2025-11-23
**Version:** 1.0.0

Thank you for helping keep TaxFlow Enhanced secure!
