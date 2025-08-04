import { BaseError } from '../../../src/errors/base/base.error';
import { UnexpectedError } from '../../../src/errors/base/unexpected.error';

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
