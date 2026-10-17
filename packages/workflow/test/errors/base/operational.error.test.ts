import { BaseError, OperationalError as SharedOperationalError } from '@n8n/errors';
import { OperationalError } from '../../../src/errors';

describe('OperationalError', () => {
	it('should re-export the shared class', () => {
		expect(OperationalError).toBe(SharedOperationalError);
	});

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
