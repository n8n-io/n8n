import { WorkflowActivationError, WorkflowOperationError } from '../../src/errors';

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

	it('should surface the cause message in `description`', () => {
		const error = new WorkflowActivationError('Generic wrapper message', { cause });

		expect(error.description).toBe('Some error message');
	});

	it("should prefer the cause's own `description` over its message", () => {
		const richCause = new WorkflowActivationError('Cause message');
		richCause.description = 'Actionable detail';

		const error = new WorkflowActivationError('Generic wrapper message', { cause: richCause });

		expect(error.description).toBe('Actionable detail');
	});

	describe('with a frozen Error.prototype', () => {
		const descriptors = {
			name: Object.getOwnPropertyDescriptor(Error.prototype, 'name')!,
			constructor: Object.getOwnPropertyDescriptor(Error.prototype, 'constructor')!,
		};

		beforeAll(() => {
			for (const [key, descriptor] of Object.entries(descriptors)) {
				Object.defineProperty(Error.prototype, key, { ...descriptor, writable: false });
			}
		});

		afterAll(() => {
			for (const [key, descriptor] of Object.entries(descriptors)) {
				Object.defineProperty(Error.prototype, key, descriptor);
			}
		});

		it('should wrap an ExecutionBaseError cause without writing through the prototype', () => {
			const operationCause = new WorkflowOperationError('operation failed');

			const error = new WorkflowActivationError('activation failed', { cause: operationCause });

			expect(error.name).toBe('WorkflowActivationError');
			expect(error.description).toBe('operation failed');
		});
	});
});
