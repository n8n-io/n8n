import { WorkflowActivationError } from '../../src/errors';

describe('WorkflowActivationError', () => {
	it('should default to `error` level', () => {
		const error = new WorkflowActivationError('message');
		expect(error.level).toBe('error');
	});

	const cause = new Error('Some error message');

	it('should set `level` based on arg', () => {
		const firstError = new WorkflowActivationError('message', { level: 'warning', cause });

		expect(firstError.level).toBe('warning');

		const secondError = new WorkflowActivationError('message', { level: 'error', cause });

		expect(secondError.level).toBe('error');
	});

	test.each([
		'ETIMEDOUT',
		'ECONNREFUSED',
		'EAUTH',
		'Temporary authentication failure',
		'Invalid credentials',
	])('should set `level` to `warning` for `%s`', (code) => {
		const error = new WorkflowActivationError(code, { cause });

		expect(error.level).toBe('warning');
	});
});
