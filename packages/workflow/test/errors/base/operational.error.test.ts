import { BaseError } from '@/errors/base/base.error';
import { isOperationalError, OperationalError } from '@/errors/base/operational.error';

describe('OperationalError', () => {
	it('should be an instance of OperationalError', () => {
		const error = new OperationalError('test');
		expect(error).toBeInstanceOf(OperationalError);
	});

	it('should be an instance of BaseError', () => {
		const error = new OperationalError('test');
		expect(error).toBeInstanceOf(BaseError);
	});

	it('should have correct defaults', () => {
		const error = new OperationalError('test');
		expect(error.level).toBe('warning');
		expect(error.shouldReport).toBe(false);
	});

	it('should allow overriding the default level and shouldReport', () => {
		const error = new OperationalError('test', { level: 'error', shouldReport: true });
		expect(error.level).toBe('error');
		expect(error.shouldReport).toBe(true);
	});
});

describe('isOperationalError', () => {
	it('should return true if the error is an instance of OperationalError', () => {
		expect(isOperationalError(new OperationalError('test'))).toBe(true);
	});

	it('should return false if the error is not an instance of OperationalError', () => {
		expect(isOperationalError(new Error('test'))).toBe(false);
	});
});
