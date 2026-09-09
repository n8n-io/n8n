import { NodeApiError, NodeOperationError } from '../../src/errors';
import type { Failure } from '../../src/errors';
import type { INode } from '../../src/interfaces';

// @ts-expect-error A wait hint only exists on the causes a wait can help.
const hintOnActionableCause: Failure = { cause: 'credential-invalid', retryAfterMs: 5_000 };
void hintOnActionableCause;

const node: INode = {
	id: '1',
	name: 'Test Node',
	typeVersion: 1,
	type: 'n8n-nodes-base.test',
	position: [0, 0],
	parameters: {},
};

describe('the failure option', () => {
	it('declares a cause on a NodeApiError', () => {
		const error = new NodeApiError(
			node,
			{ message: 'unauthorized' },
			{ failure: { cause: 'credential-invalid' } },
		);

		expect(error.failure).toEqual({ cause: 'credential-invalid' });
	});

	it('declares a cause with hints on a NodeApiError', () => {
		const resetsAtEpochMs = Date.parse('2026-08-19T00:00:00.000Z');
		const error = new NodeApiError(
			node,
			{ message: 'slow down' },
			{ failure: { cause: 'quota-exhausted', retryAfterMs: 1_000, resetsAtEpochMs } },
		);

		expect(error.failure).toEqual({
			cause: 'quota-exhausted',
			retryAfterMs: 1_000,
			resetsAtEpochMs,
		});
	});

	it('declares a cause on a NodeOperationError', () => {
		const error = new NodeOperationError(node, 'bad folder', {
			failure: { cause: 'configuration-invalid' },
		});

		expect(error.failure).toEqual({ cause: 'configuration-invalid' });
	});

	it('carries a wait hint on any timed cause', () => {
		const error = new NodeApiError(
			node,
			{ message: 'maintenance' },
			{ failure: { cause: 'temporarily-unavailable', retryAfterMs: 5_000 } },
		);

		expect(error.failure).toEqual({
			cause: 'temporarily-unavailable',
			retryAfterMs: 5_000,
		});
	});

	it('leaves the rest of the error untouched', () => {
		const error = new NodeApiError(
			node,
			{ message: 'api failure', httpCode: '401' },
			{ failure: { cause: 'credential-invalid' } },
		);

		expect(error.name).toBe('NodeApiError');
		expect(error.httpCode).toBe('401');
		expect(error.message).toBe('Authorization failed - please check your credentials');
	});

	it('declares on the original error when re-wrapping hands it back', () => {
		const original = new NodeApiError(node, { message: 'unauthorized' });
		const rewrapped = new NodeApiError(node, original as never, {
			failure: { cause: 'credential-invalid' },
		});

		expect(rewrapped).toBe(original);
		expect(original.failure).toEqual({ cause: 'credential-invalid' });
	});

	it('replaces an earlier declaration when re-wrapping declares again', () => {
		const original = new NodeApiError(
			node,
			{ message: 'boom' },
			{ failure: { cause: 'temporarily-unavailable' } },
		);
		const rewrapped = new NodeApiError(node, original as never, {
			failure: { cause: 'credential-invalid' },
		});

		expect(rewrapped).toBe(original);
		expect(original.failure).toEqual({ cause: 'credential-invalid' });
	});

	it('declares on the original NodeOperationError when re-wrapping hands it back', () => {
		const original = new NodeOperationError(node, 'boom');
		const rewrapped = new NodeOperationError(node, original, { failure: { cause: 'node-defect' } });

		expect(rewrapped).toBe(original);
		expect(original.failure).toEqual({ cause: 'node-defect' });
	});

	it('carries the declaration over when re-wrapping builds a new error', () => {
		const original = new NodeOperationError(node, 'reconnect', {
			failure: { cause: 'credential-invalid' },
		});
		const rewrapped = new NodeApiError(node, original as never);

		expect(rewrapped).not.toBe(original);
		expect(rewrapped.failure).toEqual({ cause: 'credential-invalid' });
	});

	it('prefers the declared cause over the one it re-wraps', () => {
		const original = new NodeOperationError(node, 'boom', { failure: { cause: 'node-defect' } });
		const rewrapped = new NodeApiError(node, original as never, {
			failure: { cause: 'credential-invalid' },
		});

		expect(rewrapped.failure).toEqual({ cause: 'credential-invalid' });
	});

	it('leaves an error without the option unannotated', () => {
		expect(new NodeApiError(node, { message: 'boom' }).failure).toBeUndefined();
		expect(new NodeOperationError(node, 'boom').failure).toBeUndefined();
	});
});
