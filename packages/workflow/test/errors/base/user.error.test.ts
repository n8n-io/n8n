import { BaseError } from '@/errors/base/base.error';
import { isUserError } from '@/errors/base/user.error';
import { UserError } from '@/errors/base/user.error';

describe('UserError', () => {
	it('should be an instance of UserError', () => {
		const error = new UserError('test');
		expect(error).toBeInstanceOf(UserError);
	});

	it('should be an instance of BaseError', () => {
		const error = new UserError('test');
		expect(error).toBeInstanceOf(BaseError);
	});

	it('should have correct defaults', () => {
		const error = new UserError('test');
		expect(error.level).toBe('info');
		expect(error.shouldReport).toBe(false);
	});

	it('should allow overriding the default level and shouldReport', () => {
		const error = new UserError('test', { level: 'warning', shouldReport: true });
		expect(error.level).toBe('warning');
		expect(error.shouldReport).toBe(true);
	});
});

describe('isUserError', () => {
	it('should return true if the error is an instance of UserError', () => {
		expect(isUserError(new UserError('test'))).toBe(true);
	});

	it('should return false if the error is not an instance of UserError', () => {
		expect(isUserError(new Error('test'))).toBe(false);
	});
});
