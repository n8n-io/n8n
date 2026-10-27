import { mock } from 'vitest-mock-extended';

import {
	NodeOperationError,
	WorkflowActivationError,
	WorkflowOperationError,
} from '../../src/errors';
import type { INode } from '../../src/interfaces';

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

	describe('level from the failure the cause declares', () => {
		const node = mock<INode>();

		it('should keep level error for a node error cause without a declared failure', () => {
			const nodeCause = new NodeOperationError(node, 'Sheet with ID 0 not found');

			const error = new WorkflowActivationError('activation failed', { cause: nodeCause });

			expect(error.level).toBe('error');
		});

		it('should keep level error when the cause declares node-defect', () => {
			const nodeCause = new NodeOperationError(node, 'Unexpected response shape', {
				failure: { cause: 'node-defect' },
			});

			const error = new WorkflowActivationError('activation failed', { cause: nodeCause });

			expect(error.level).toBe('error');
		});

		const credentialInvalidCause = () =>
			new NodeOperationError(node, 'The credential needs to be reconnected.', {
				failure: { cause: 'credential-invalid' },
			});

		it('should set level warning when the cause declares credential-invalid', () => {
			const error = new WorkflowActivationError('activation failed', {
				cause: credentialInvalidCause(),
			});

			expect(error.level).toBe('warning');
		});

		it('should set level warning when an error wrapped by the cause declares credential-invalid', () => {
			const wrapper = new Error('wrapper', { cause: credentialInvalidCause() });

			const error = new WorkflowActivationError('activation failed', { cause: wrapper });

			expect(error.level).toBe('warning');
		});

		it('should set level warning when the cause declares configuration-invalid', () => {
			const nodeCause = new NodeOperationError(
				node,
				'The folder this node watches no longer exists.',
				{
					failure: { cause: 'configuration-invalid' },
				},
			);

			const error = new WorkflowActivationError('activation failed', { cause: nodeCause });

			expect(error.level).toBe('warning');
		});
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
