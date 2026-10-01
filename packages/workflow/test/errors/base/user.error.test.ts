import { BaseError, UserError as SharedUserError } from '@n8n/errors';
import { UserError } from '../../../src/errors';

describe('UserError', () => {
	it('should re-export the shared class', () => {
		expect(UserError).toBe(SharedUserError);
	});

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
