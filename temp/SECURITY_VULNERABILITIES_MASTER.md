# Security Vulnerabilities Master Document

Repository: dmgoldstein1/n8n
Generated: March 6, 2026
Total Dependabot Alerts: 55
Total Code Scanning Alerts: 184

Part 1: Dependabot Alerts (55 total)
High Severity (44 alerts)

## Vulnerability Package Ecosystem Manifest — High Severity

31 Rollup 4 has Arbitrary File Write via Path Traversal rollup npm pnpm-lock.yaml
30 Rollup 4 has Arbitrary File Write via Path Traversal rollup npm pnpm-lock.yaml
33 Storybook Dev Server is Vulnerable to WebSocket Hijacking storybook npm pnpm-lock.yaml
11 kangax html-minifier REDoS vulnerability html-minifier npm pnpm-lock.yaml
42 Multer vulnerable to Denial of Service via incomplete cleanup multer npm pnpm-lock.yaml
41 Multer vulnerable to Denial of Service via resource exhaustion multer npm pnpm-lock.yaml
29 minimatch has a ReDoS via repeated wildcards with non-matching literal in pattern minimatch npm pnpm-lock.yaml
28 minimatch has a ReDoS via repeated wildcards with non-matching literal in pattern minimatch npm pnpm-lock.yaml
27 minimatch has a ReDoS via repeated wildcards with non-matching literal in pattern minimatch npm pnpm-lock.yaml
53 Multer Vulnerable to Denial of Service via Uncontrolled Recursion multer npm pnpm-lock.yaml
51 Immutable is vulnerable to Prototype Pollution immutable npm pnpm-lock.yaml
43 Underscore has unlimited recursion in _.flatten and_.isEqual, potential for DoS attack underscore npm pnpm-lock.yaml
54 tar has Hardlink Path Traversal via Drive-Relative Linkpath tar npm pnpm-lock.yaml
40 Serialize JavaScript is Vulnerable to RCE via RegExp.flags and Date.prototype.toISOString() serialize-javascript npm pnpm-lock.yaml
1 AIOHTTP's HTTP Parser auto_decompress feature is vulnerable to zip bomb aiohttp pip packages/@n8n/task-runner-python/uv.lock
39 minimatch has ReDoS: matchOne() combinatorial backtracking via multiple non-adjacent GLOBSTAR segments minimatch npm pnpm-lock.yaml
38 minimatch has ReDoS: matchOne() combinatorial backtracking via multiple non-adjacent GLOBSTAR segments minimatch npm pnpm-lock.yaml
37 minimatch has ReDoS: matchOne() combinatorial backtracking via multiple non-adjacent GLOBSTAR segments minimatch npm pnpm-lock.yaml
36 minimatch ReDoS: nested `*()` extglobs generate catastrophically backtracking regular expressions minimatch npm pnpm-lock.yaml
35 minimatch ReDoS: nested `*()` extglobs generate catastrophically backtracking regular expressions minimatch npm pnpm-lock.yaml
34 minimatch ReDoS: nested `*()` extglobs generate catastrophically backtracking regular expressions minimatch npm pnpm-lock.yaml
44 Hono vulnerable to arbitrary file access via serveStatic vulnerability hono npm pnpm-lock.yaml
55 express-rate-limit: IPv4-mapped IPv6 addresses bypass per-client rate limiting on servers with dual-stack network express-rate-limit npm pnpm-lock.yaml
52 SVGO DoS through entity expansion in DOCTYPE (Billion Laughs) svgo npm pnpm-lock.yaml
47 @hono/node-server has authorization bypass for protected static paths via encoded slashes in Serve Static Middleware @hono/node-server npm pnpm-lock.yaml
Moderate Severity (22 alerts)

## Vulnerability Package Ecosystem Manifest — Moderate Severity

22 vite allows server.fs.deny bypass via backslash on Windows vite npm pnpm-lock.yaml
21 vite allows server.fs.deny bypass via backslash on Windows vite npm pnpm-lock.yaml
6 AIOHTTP vulnerable to denial of service through large payloads aiohttp pip packages/@n8n/task-runner-python/uv.lock
5 AIOHTTP vulnerable to DoS when bypassing asserts aiohttp pip packages/@n8n/task-runner-python/uv.lock
7 AIOHTTP vulnerable to DoS through chunked messages aiohttp pip packages/@n8n/task-runner-python/uv.lock
20 Element Plus Link component (el-link) implements insufficient input validation for the href attribute element-plus npm pnpm-lock.yaml
45 Hono Vulnerable to SSE Control Field Injection via CR/LF in writeSSE() hono npm pnpm-lock.yaml
15 vite-plugin-static-copy files not included in src are possible to access with a crafted request vite-plugin-static-copy npm pnpm-lock.yaml
10 vite-plugin-static-copy files not included in src are possible to access with a crafted request vite-plugin-static-copy npm packages/frontend/editor-ui/package.json
25 Undici has an unbounded decompression chain in HTTP responses on Node.js Fetch API via Content-Encoding leads to resource exhaustion undici npm pnpm-lock.yaml
26 markdown-it is has a Regular Expression Denial of Service (ReDoS) markdown-it npm pnpm-lock.yaml
9 markdown-it is has a Regular Expression Denial of Service (ReDoS) markdown-it npm packages/frontend/@n8n/design-system/package.json
46 Hono Vulnerable to Cookie Attribute Injection via Unsanitized domain and path in setCookie() hono npm pnpm-lock.yaml
50 DOMPurify contains a Cross-site Scripting vulnerability dompurify npm pnpm-lock.yaml
49 DOMPurify contains a Cross-site Scripting vulnerability dompurify npm pnpm-lock.yaml
13 PrismJS DOM Clobbering vulnerability prismjs npm pnpm-lock.yaml
12 DOMPurify allows Cross-site Scripting (XSS) dompurify npm pnpm-lock.yaml
23 MJML allows mj-include directory traversal due to an incomplete fix for CVE-2020-12827 mjml npm pnpm-lock.yaml
32 LangChain Community: redirect chaining can lead to SSRF bypass via RecursiveUrlLoader @langchain/community npm pnpm-lock.yaml
Low Severity (6 alerts)

## Vulnerability Package Ecosystem Manifest — Low Severity

19 Vite middleware may serve files starting with the same name with the public directory vite npm pnpm-lock.yaml
18 Vite middleware may serve files starting with the same name with the public directory vite npm pnpm-lock.yaml
24 Elliptic Uses a Cryptographic Primitive with a Risky Implementation elliptic npm pnpm-lock.yaml
4 AIOHTTP vulnerable to brute-force leak of internal static file path components aiohttp pip packages/@n8n/task-runner-python/uv.lock
3 AIOHTTP has unicode match groups in regexes for ASCII protocol elements aiohttp pip packages/@n8n/task-runner-python/uv.lock
2 AIOHTTP's unicode processing of header values could cause parsing discrepancies aiohttp pip packages/@n8n/task-runner-python/uv.lock
Part 2: Code Scanning Alerts (184 total)
All alerts detected by CodeQL. Below is a summary by category.

High Severity Issues by Category

1. Disabling Certificate Validation (3 alerts)

## File / Line — Disabling Certificate Validation (3 alerts)

226 packages/@n8n/client-oauth2/src/client-oauth2.ts 51
225 packages/core/src/execution-engine/node-execution-context/utils/request-helper-functions.ts 791
224 packages/core/src/execution-engine/node-execution-context/utils/request-helper-functions.ts 600
223 packages/cli/src/modules/log-streaming.ee/destinations/message-event-bus-destination-webhook.ee.ts 168
2. Inefficient/Polynomial Regular Expressions - ReDoS (18 alerts)

## File / Line — Inefficient/Polynomial Regular Expressions (ReDoS) (18 alerts)

245 packages/nodes-base/nodes/SeaTable/v2/GenericFunctions.ts 184
244 packages/nodes-base/nodes/SeaTable/v1/GenericFunctions.ts 226
243 packages/frontend/@n8n/i18n/src/utils.ts 49
242 packages/cli/src/services/url.service.ts 40
241 packages/cli/src/modules/workflow-builder/workflow-builder-session.repository.ts 64
240 packages/cli/src/modules/mcp/mcp-server-middleware.service.ts 105
239 packages/cli/src/modules/dynamic-credentials.ee/services/dynamic-credential-web.service.ts 22
238 packages/cli/src/modules/community-packages/npm-utils.ts 40
237 packages/@n8n/workflow-sdk/src/utils/code-helpers.ts 35
236 packages/@n8n/workflow-sdk/src/utils/code-helpers.ts 11
235 packages/@n8n/workflow-sdk/src/generate-types/generate-types.ts 1103
234 packages/@n8n/workflow-sdk/src/expression/index.ts 101
233 packages/@n8n/workflow-sdk/src/expression/index.ts 11
232 packages/@n8n/utils/src/files/sanitize.ts 64
231 packages/@n8n/ai-workflow-builder.ee/src/code-builder/utils/extract-code.ts 21
230 packages/testing/janitor/src/core/facade-resolver.ts 112
3. Uncontrolled Data Used in Path Expression (7 alerts)

## File / Line — Uncontrolled Path Expression (7 alerts)

222 packages/cli/src/executions/execution-data/fs-store.ts 49
221 packages/cli/src/executions/execution-data/fs-store.ts 43
220 packages/cli/src/executions/execution-data/fs-store.ts 43
219 packages/cli/src/executions/execution-data/fs-store.ts 39
218 packages/@n8n/backend-common/src/utils/fs.ts 9
217 packages/@n8n/backend-common/src/utils/fs.ts 7
4. Arbitrary File Access - Zip Slip (1 alert)

## File / Line — Zip Slip (1 alert)

216 packages/@n8n/workflow-sdk/scripts/extract-workflows.ts 38
5. Insecure Randomness / Biased Random Numbers (5 alerts)

## File / Line — Insecure Randomness (5 alerts)

215 packages/cli/src/modules/mcp/tools/execute-workflow.tool.ts 298
202 packages/@n8n/expression-runtime/src/extensions/array-extensions.ts 9
201 packages/@n8n/backend-test-utils/src/random.ts 22
200 packages/workflow/src/utils.ts 357
199 packages/workflow/src/utils.ts 342
6. Use of Broken/Weak Cryptographic Algorithm (7 alerts)

## File / Line — Weak Cryptographic Algorithms (7 alerts)

198 packages/nodes-base/nodes/Cisco/Webex/GenericFunctions.ts 631
197 packages/core/src/execution-engine/node-execution-context/utils/request-helper-functions.ts 271
196 packages/core/src/encryption/cipher.ts 39
195 packages/core/src/encryption/cipher.ts 36
194 packages/core/src/encryption/cipher.ts 34
193 packages/nodes-base/nodes/WooCommerce/GenericFunctions.ts 78
192 packages/nodes-base/nodes/Taiga/GenericFunctions.ts 120
7. Incomplete Multi-character Sanitization (4 alerts)

## File / Line — Incomplete Multi-character Sanitization (4 alerts)

187 packages/@n8n/expression-runtime/src/extensions/string-extensions.ts 177
186 packages/@n8n/expression-runtime/src/extensions/string-extensions.ts 147
185 packages/workflow/src/extensions/string-extensions.ts 216
184 packages/workflow/src/extensions/string-extensions.ts 186
8. Incomplete String Escaping or Encoding (Multiple alerts across many files)
Files affected include:

packages/nodes-base/nodes/Shopify/GenericFunctions.ts (lines 117)
packages/nodes-base/nodes/SentryIo/GenericFunctions.ts (line 80)
packages/nodes-base/nodes/MySql/v2/helpers/utils.ts (line 162)
packages/nodes-base/nodes/Microsoft/OneDrive/MicrosoftOneDriveTrigger.node.ts (lines 127, 111, 97)
packages/nodes-base/nodes/Google/Sheet/v2/methods/listSearch.ts (line 20)
packages/nodes-base/nodes/Google/Drive/v2/methods/listSearch.ts (lines 118, 63, 32)
packages/nodes-base/nodes/Google/Drive/v1/SearchFunctions.ts (lines 75, 50, 24)
packages/nodes-base/nodes/Gitlab/Gitlab.node.ts (line 1398)
packages/nodes-base/nodes/Freshdesk/GenericFunctions.ts (line 70)
packages/nodes-base/nodes/Files/ReadWriteFile/helpers/utils.ts (line 39)
packages/nodes-base/nodes/Cisco/Webex/GenericFunctions.ts (line 73)
packages/nodes-base/nodes/CircleCi/CircleCi.node.ts (lines 122, 87, 71)
packages/frontend/editor-ui (test files)
9. CORS Misconfiguration (1 alert)

## File / Line — CORS Misconfiguration (1 alert)

228 packages/cli/src/middlewares/cors.ts 6
10. Insecure Helmet Configuration (1 alert)

## File / Line — Insecure Helmet Configuration (1 alert)

227 packages/cli/src/server.ts 371
11. Reflected Cross-Site Scripting (1 alert)

## File / Line — Reflected Cross-Site Scripting (1 alert)

229 packages/cli/test/integration/middlewares/body-parser.test.ts 11
Summary Statistics
Dependabot by Severity
High: 44 alerts
Moderate: 22 alerts
Low: 6 alerts
Dependabot by Ecosystem
npm: 47 alerts
pip: 8 alerts
Code Scanning by Category (approximate)
Incomplete String Escaping: ~30+ alerts
Polynomial Regular Expressions (ReDoS): ~16 alerts
Weak Cryptographic Algorithms: ~7 alerts
Uncontrolled Path Expression: ~7 alerts
Biased Random Numbers: 5 alerts
Certificate Validation Disabled: 4 alerts
Incomplete Sanitization: 4 alerts
CORS Misconfiguration: 1 alert
Insecure Helmet Config: 1 alert
XSS: 1 alert
Zip Slip: 1 alert
Recommendations for Fixing
Priority 1 (Critical - High Severity)
Certificate Validation - Remove rejectUnauthorized: false from HTTP requests
Weak Crypto - Replace MD5/DES with AES-256-GCM, SHA-256+
Path Traversal - Validate and sanitize all file paths, use path.resolve()
ReDoS - Optimize regex patterns, use non-backtracking regex or external libraries
Priority 2 (High - Moderate Severity)
XSS - Ensure proper output encoding
CORS - Configure proper allowed origins
Helmet - Enable all security headers
Priority 3 (Lower - Update Dependencies)
Update minimatch to latest version
Update multer to latest version
Update hono to latest version
Update aiohttp to latest version
Update vite to latest version
Update DOMPurify to latest version
This document was automatically generated from GitHub Security alerts.
