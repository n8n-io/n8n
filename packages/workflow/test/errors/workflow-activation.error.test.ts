import { mock } from 'vitest-mock-extended';

import {
	NodeApiError,
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

	describe('level from the cause', () => {
		const node = mock<INode>({ name: 'Google Drive Trigger' });

		it('should keep `warning` from a node error cause', () => {
			const reconnectError = new NodeOperationError(
				node,
				'The credential "Google Drive account" needs to be reconnected.',
				{ level: 'warning' },
			);

			const error = new WorkflowActivationError(
				`There was a problem activating the workflow: "${reconnectError.message}"`,
				{ cause: reconnectError, node },
			);

			expect(error.level).toBe('warning');
		});

		it('should keep the default `warning` of a node API error cause', () => {
			const apiError = new NodeApiError(node, { message: 'Forbidden', httpCode: '403' });

			const error = new WorkflowActivationError('message', { cause: apiError, node });

			expect(error.level).toBe('warning');
		});

		it('should keep `info` from the cause', () => {
			const infoCause = new NodeOperationError(node, 'failed', { level: 'info' });

			const error = new WorkflowActivationError('message', { cause: infoCause });

			expect(error.level).toBe('info');
		});

		it('should stay at `error` for a cause at `error` level', () => {
			const errorCause = new NodeOperationError(node, 'failed', { level: 'error' });

			const error = new WorkflowActivationError('message', { cause: errorCause });

			expect(error.level).toBe('error');
		});

		it('should prefer an explicit `level` over the cause level', () => {
			const warningCause = new NodeOperationError(node, 'failed', { level: 'warning' });

			const error = new WorkflowActivationError('message', { cause: warningCause, level: 'error' });

			expect(error.level).toBe('error');
		});
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
