import { createErrorFromParameters } from '../utils';

describe('createErrorFromParameters', () => {
	describe('Error Message Type', () => {
		it('should return simple message for errorMessage type', () => {
			const result = createErrorFromParameters('errorMessage', 'Simple error message');

			expect(result.message).toBe('Simple error message');
			expect(result.options).toBeUndefined();
		});

		it('should handle empty error message', () => {
			const result = createErrorFromParameters('errorMessage', '');

			expect(result.message).toBe('');
			expect(result.options).toBeUndefined();
		});

		it('should handle whitespace-only error message', () => {
			const result = createErrorFromParameters('errorMessage', '   ');

			expect(result.message).toBe('   ');
			expect(result.options).toBeUndefined();
		});
	});

	describe('Error Object Type', () => {
		it('should extract message from error object', () => {
			const errorObject = JSON.stringify({
				message: 'Custom error message',
				code: '404',
			});

			const result = createErrorFromParameters('errorObject', errorObject);

			expect(result.message).toBe('Custom error message');
			expect(result.options?.level).toBe('error');
			expect(result.options?.metadata).toEqual({
				message: 'Custom error message',
				code: '404',
			});
		});

		it('should use description when message is not available', () => {
			const errorObject = JSON.stringify({
				description: 'Detailed error description',
				code: '500',
			});

			const result = createErrorFromParameters('errorObject', errorObject);

			expect(result.message).toBe('Detailed error description');
			expect(result.options?.description).toBe('Detailed error description');
		});

		it('should use error property when message and description are not available', () => {
			const errorObject = JSON.stringify({
				error: 'Something went wrong',
				code: '400',
			});

			const result = createErrorFromParameters('errorObject', errorObject);

			expect(result.message).toBe('Something went wrong');
			expect(result.options?.description).toBeUndefined();
		});

		it('should stringify object when no recognizable message properties exist', () => {
			const errorObjectData = {
				code: '404',
				status: 'not found',
			};
			const errorObject = JSON.stringify(errorObjectData);

			const result = createErrorFromParameters('errorObject', errorObject);

			expect(result.message).toBe(`Error: ${JSON.stringify(errorObjectData)}`);
			expect(result.options?.metadata).toEqual(errorObjectData);
		});

		it('should include type and description in options when available', () => {
			const errorObject = JSON.stringify({
				message: 'Main error',
				description: 'Detailed description',
				type: 'ValidationError',
				code: '400',
			});

			const result = createErrorFromParameters('errorObject', errorObject);

			expect(result.message).toBe('Main error');
			expect(result.options?.description).toBe('Detailed description');
			expect(result.options?.type).toBe('ValidationError');
			expect(result.options?.level).toBe('error');
		});

		it('should handle complex nested object', () => {
			const errorObjectData = {
				message: 'Database error',
				details: {
					table: 'users',
					operation: 'SELECT',
					constraint: 'foreign_key',
				},
				code: 'DB_001',
			};
			const errorObject = JSON.stringify(errorObjectData);

			const result = createErrorFromParameters('errorObject', errorObject);

			expect(result.message).toBe('Database error');
			expect(result.options?.metadata).toEqual(errorObjectData);
		});

		it('should handle object with null and undefined values', () => {
			const errorObject = JSON.stringify({
				message: 'Test message',
				description: null,
				type: undefined,
				code: '200',
			});

			const result = createErrorFromParameters('errorObject', errorObject);

			expect(result.message).toBe('Test message');
			expect(result.options?.description).toBeUndefined();
			expect(result.options?.type).toBeUndefined();
		});

		it('should prioritize message over description and error', () => {
			const errorObject = JSON.stringify({
				message: 'Primary message',
				description: 'Secondary description',
				error: 'Tertiary error',
			});

			const result = createErrorFromParameters('errorObject', errorObject);

			expect(result.message).toBe('Primary message');
		});

		it('should prioritize description over error when message is not available', () => {
			const errorObject = JSON.stringify({
				description: 'Primary description',
				error: 'Secondary error',
			});

			const result = createErrorFromParameters('errorObject', errorObject);

			expect(result.message).toBe('Primary description');
			expect(result.options?.description).toBe('Primary description');
		});
	});

	describe('Invalid JSON Handling', () => {
		it('should throw error for invalid JSON in errorObject type', () => {
			expect(() => {
				createErrorFromParameters('errorObject', '{invalid json}');
			}).toThrow();
		});

		it('should handle empty JSON object', () => {
			const result = createErrorFromParameters('errorObject', '{}');

			expect(result.message).toBe('Error: {}');
			expect(result.options?.metadata).toEqual({});
		});
	});

	describe('Edge Cases', () => {
		it('should handle arrays in error object', () => {
			const errorObjectData = {
				message: 'Validation failed',
				errors: ['Field required', 'Invalid format'],
			};
			const errorObject = JSON.stringify(errorObjectData);

			const result = createErrorFromParameters('errorObject', errorObject);

			expect(result.message).toBe('Validation failed');
			expect(result.options?.metadata).toEqual(errorObjectData);
		});

		it('should handle empty string values in message fields', () => {
			const errorObject = JSON.stringify({
				message: '',
				description: 'Fallback description',
			});

			const result = createErrorFromParameters('errorObject', errorObject);

			expect(result.message).toBe('Fallback description');
		});

		it('should handle whitespace-only string values in message fields', () => {
			const errorObject = JSON.stringify({
				message: '   ',
				description: 'Fallback description',
			});

			const result = createErrorFromParameters('errorObject', errorObject);

			expect(result.message).toBe('   ');
		});
	});
});
