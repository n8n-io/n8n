import { isEmailValid } from '../GenericFunctions';

describe('isEmailValid', () => {
	it('should return true for a valid email address', () => {
		const email = 'test@example.com';
		const result = isEmailValid(email);
		expect(result).toBe(true);
	});

	it('should return false for an invalid email address', () => {
		const email = 'invalid-email';
		const result = isEmailValid(email);
		expect(result).toBe(false);
	});

	it('should return true for an email address with subdomain', () => {
		const email = 'user@sub.example.com';
		const result = isEmailValid(email);
		expect(result).toBe(true);
	});

	it('should return false for an email address without a domain', () => {
		const email = 'user@';
		const result = isEmailValid(email);
		expect(result).toBe(false);
	});

	it('should return false for an email address without a username', () => {
		const email = '@example.com';
		const result = isEmailValid(email);
		expect(result).toBe(false);
	});

	it('should return true for an email address with a plus sign', () => {
		const email = 'user+alias@example.com';
		const result = isEmailValid(email);
		expect(result).toBe(true);
	});

	it('should return false for an email address with invalid characters', () => {
		const email = 'user@exa$mple.com';
		const result = isEmailValid(email);
		expect(result).toBe(false);
	});

	it('should return false for an email address without a top-level domain', () => {
		const email = 'user@example';
		const result = isEmailValid(email);
		expect(result).toBe(false);
	});

	it('should return true for an email address with a valid top-level domain', () => {
		const email = 'user@example.co.uk';
		const result = isEmailValid(email);
		expect(result).toBe(true);
	});

	it('should return false for an empty email string', () => {
		const email = '';
		const result = isEmailValid(email);
		expect(result).toBe(false);
	});
});
