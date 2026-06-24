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

	describe('description', () => {
		it('should surface the cause message in `description`', () => {
			const error = new WorkflowActivationError('Generic wrapper message', { cause });

			expect(error.description).toBe('Some error message');
		});

		it("should prefer the cause's own `description` when present", () => {
			const richCause = new WorkflowActivationError('Cause message');
			richCause.description = 'Actionable detail';

			const error = new WorkflowActivationError('Generic wrapper message', { cause: richCause });

			expect(error.description).toBe('Actionable detail');
		});

		it('should leave `description` undefined when there is no cause', () => {
			const error = new WorkflowActivationError('Generic wrapper message');

			expect(error.description).toBeUndefined();
		});

		it('should keep the generic wrapper `message` unchanged', () => {
			const error = new WorkflowActivationError('Generic wrapper message', { cause });

			expect(error.message).toBe('Generic wrapper message');
		});
	});
});
