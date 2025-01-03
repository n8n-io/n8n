import { BaseError } from '@/errors/base/base.error';
import { isUnexpectedError, UnexpectedError } from '@/errors/base/unexpected.error';

describe('UnexpectedError', () => {
	it('should be an instance of UnexpectedError', () => {
		const error = new UnexpectedError('test');
		expect(error).toBeInstanceOf(UnexpectedError);
	});

	it('should be an instance of BaseError', () => {
		const error = new UnexpectedError('test');
		expect(error).toBeInstanceOf(BaseError);
	});

	it('should have correct defaults', () => {
		const error = new UnexpectedError('test');
		expect(error.level).toBe('error');
		expect(error.shouldReport).toBe(true);
	});

	it('should allow overriding the default level and shouldReport', () => {
		const error = new UnexpectedError('test', { level: 'fatal', shouldReport: false });
		expect(error.level).toBe('fatal');
		expect(error.shouldReport).toBe(false);
	});
});

describe('isUnexpectedError', () => {
	it('should return true if the error is an instance of UnexpectedError', () => {
		expect(isUnexpectedError(new UnexpectedError('test'))).toBe(true);
	});

	it('should return false if the error is not an instance of UnexpectedError', () => {
		expect(isUnexpectedError(new Error('test'))).toBe(false);
	});
});
