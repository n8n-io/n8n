import {
	getGoogleAnalyticsDomainsArray,
	getTags,
	getToEmailArray,
	validateJSON,
} from '../GenericFunctions';

describe('Mandrill GenericFunctions', () => {
	describe('getToEmailArray', () => {
		it('should convert single email to array', () => {
			const result = getToEmailArray('test@example.com');
			expect(result).toEqual([
				{
					email: 'test@example.com',
					type: 'to',
				},
			]);
		});

		it('should convert comma-separated emails to array', () => {
			const result = getToEmailArray('test1@example.com,test2@example.com,test3@example.com');
			expect(result).toEqual([
				{
					email: 'test1@example.com',
					type: 'to',
				},
				{
					email: 'test2@example.com',
					type: 'to',
				},
				{
					email: 'test3@example.com',
					type: 'to',
				},
			]);
		});

		it('should handle emails with spaces after commas', () => {
			const result = getToEmailArray('test1@example.com, test2@example.com, test3@example.com');
			expect(result).toEqual([
				{
					email: 'test1@example.com',
					type: 'to',
				},
				{
					email: ' test2@example.com',
					type: 'to',
				},
				{
					email: ' test3@example.com',
					type: 'to',
				},
			]);
		});
	});

	describe('getGoogleAnalyticsDomainsArray', () => {
		it('should convert single domain to array', () => {
			const result = getGoogleAnalyticsDomainsArray('example.com');
			expect(result).toEqual(['example.com']);
		});

		it('should convert comma-separated domains to array', () => {
			const result = getGoogleAnalyticsDomainsArray('example.com,test.com,demo.org');
			expect(result).toEqual(['example.com', 'test.com', 'demo.org']);
		});

		it('should handle domains with spaces after commas', () => {
			const result = getGoogleAnalyticsDomainsArray('example.com, test.com, demo.org');
			expect(result).toEqual(['example.com', ' test.com', ' demo.org']);
		});

		it('should handle empty string', () => {
			const result = getGoogleAnalyticsDomainsArray('');
			expect(result).toEqual(['']);
		});
	});

	describe('getTags', () => {
		it('should convert single tag to array', () => {
			const result = getTags('newsletter');
			expect(result).toEqual(['newsletter']);
		});

		it('should convert comma-separated tags to array', () => {
			const result = getTags('newsletter,marketing,promotion');
			expect(result).toEqual(['newsletter', 'marketing', 'promotion']);
		});

		it('should handle tags with spaces after commas', () => {
			const result = getTags('newsletter, marketing, promotion');
			expect(result).toEqual(['newsletter', ' marketing', ' promotion']);
		});

		it('should handle empty string', () => {
			const result = getTags('');
			expect(result).toEqual(['']);
		});
	});

	describe('validateJSON', () => {
		it('should parse valid JSON object', () => {
			const result = validateJSON('{"Test": "value", "number": 123}');
			expect(result).toEqual({ Test: 'value', number: 123 });
		});

		it('should parse valid JSON array', () => {
			const result = validateJSON('[{"name": "Test", "value": "data"}]');
			expect(result).toEqual([{ name: 'Test', value: 'data' }]);
		});

		it('should return empty array for invalid JSON', () => {
			const result = validateJSON('invalid json');
			expect(result).toEqual([]);
		});

		it('should return empty array for undefined input', () => {
			const result = validateJSON(undefined);
			expect(result).toEqual([]);
		});

		it('should return null for null JSON string', () => {
			const result = validateJSON('null');
			expect(result).toEqual(null);
		});

		it('should parse nested JSON correctly', () => {
			const result = validateJSON('{"metadata": {"key": "value"}, "array": [1, 2, 3]}');
			expect(result).toEqual({
				metadata: { key: 'value' },
				array: [1, 2, 3],
			});
		});

		it('should handle JSON with special characters', () => {
			const result = validateJSON('{"message": "Hello\\nWorld\\t!", "emoji": "🎉"}');
			expect(result).toEqual({
				message: 'Hello\nWorld\t!',
				emoji: '🎉',
			});
		});
	});
});
