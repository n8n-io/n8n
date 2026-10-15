import { mock } from 'vitest-mock-extended';

import {
	ExpressionError,
	NodeApiError,
	NodeOperationError,
	NodeSslError,
	WorkflowOperationError,
} from '../../src/errors';
import type { INode, JsonObject } from '../../src/interfaces';

/**
 * Shaped like the axios errors the request helpers pass to `NodeApiError`. Typed
 * as `JsonObject` too because that is what `NodeApiError` declares, even though
 * every real call site hands it an `Error`.
 */
const axiosError = () =>
	Object.assign(new Error('Request failed with status code 403'), {
		name: 'AxiosError',
		isAxiosError: true,
		config: { headers: { authorization: 'Bearer secret-token' } },
		response: { status: 403, data: { error: 'insufficient_scope' } },
	}) as unknown as Error & JsonObject;

describe('ExecutionBaseError', () => {
	const node = mock<INode>();

	it('should set name to the concrete class name', () => {
		const error = new ExpressionError('message');

		expect(error.name).toBe('ExpressionError');
	});

	describe('cause', () => {
		it.each([
			['NodeApiError', (cause: Error & JsonObject) => new NodeApiError(node, cause)],
			['NodeOperationError', (cause: Error & JsonObject) => new NodeOperationError(node, cause)],
			['ExpressionError', (cause: Error & JsonObject) => new ExpressionError('message', { cause })],
			['NodeSslError', (cause: Error & JsonObject) => new NodeSslError(cause)],
		])('should preserve an Error cause on %s', (_name, construct) => {
			const cause = axiosError();

			expect(construct(cause).cause).toBe(cause);
		});

		it('should keep cause non-enumerable so it stays out of serialized execution data', () => {
			const cause = axiosError();
			const error = new NodeApiError(node, cause);

			// `workflow-execute.ts` persists node errors as `{ ...error }`, which copies
			// own enumerable properties only. Keeping the native descriptor is what stops
			// the raw axios error - including `config.headers.authorization` - from being
			// written to the database, to error workflows and to the UI.
			expect(Object.getOwnPropertyDescriptor(error, 'cause')?.enumerable).toBe(false);
			expect(JSON.stringify({ ...error })).not.toContain('secret-token');
		});

		it('should adopt the context of an ExecutionBaseError cause and retain the cause', () => {
			const cause = new NodeApiError(node, axiosError());
			const error = new NodeOperationError(node, cause);

			expect(error.cause).toBe(cause);
			expect(error.context).toBe(cause.context);
		});
	});

	describe('toJSON', () => {
		it('should reduce an Error cause to its name and message', () => {
			const error = new NodeApiError(node, axiosError());

			expect(error.toJSON!().cause).toEqual({
				name: 'AxiosError',
				message: 'Request failed with status code 403',
			});
		});

		it('should pass through a non-Error cause unchanged', () => {
			const error = new WorkflowOperationError('message');
			const cause = { failed: 'parameter' };
			error.cause = cause as unknown as Error;

			expect(error.toJSON!().cause).toBe(cause);
		});
	});

	describe('with a frozen Error.prototype', () => {
		const nameDescriptor = Object.getOwnPropertyDescriptor(Error.prototype, 'name')!;

		beforeAll(() => {
			Object.defineProperty(Error.prototype, 'name', { ...nameDescriptor, writable: false });
		});

		afterAll(() => {
			Object.defineProperty(Error.prototype, 'name', nameDescriptor);
		});

		it('should construct and set name without writing through the prototype', () => {
			const error = new ExpressionError('Paired item data is unavailable');

			expect(error.name).toBe('ExpressionError');
			expect(Object.getOwnPropertyDescriptor(error, 'name')?.writable).toBe(true);
		});
	});
});
