import { mock } from 'jest-mock-extended';
import type { INode } from '@/Interfaces';
import { NodeApiError } from '@/errors/node-api.error';
import { NodeOperationError } from '@/errors/node-operation.error';
import { ApplicationError } from '@/errors/application.error';

describe('NodeError', () => {
	const node = mock<INode>();

	it('should update re-wrapped error level and message', () => {
		const apiError = new NodeApiError(node, { message: 'Some error happened', code: 500 });
		const opsError = new NodeOperationError(node, mock(), { message: 'Some operation failed' });
		const wrapped1 = new NodeOperationError(node, apiError);
		const wrapped2 = new NodeOperationError(node, opsError);

		expect(wrapped1).toEqual(apiError);
		expect(wrapped2).toEqual(opsError);
	});

	it('should obfuscate errors not processed by n8n', () => {
		const error = new Error('Original error message');
		const nodeOpError = new NodeOperationError(node, error);

		expect(nodeOpError.obfuscate).toBe(true);
		expect(nodeOpError.message).toBe('Original error message');
		expect(nodeOpError.messages).toContain('Original error message');
	});

	it('should not obfuscate errors processed by n8n', () => {
		const appError = new ApplicationError('Processed error message');
		const nodeOpError = new NodeOperationError(node, appError);

		expect(nodeOpError.obfuscate).toBe(false);
		expect(nodeOpError.message).toBe('Processed error message');
		expect(nodeOpError.messages).not.toContain('Processed error message');
	});

	it('should not obfuscate string errors', () => {
		const errorMessage = 'String error message';
		const nodeOpError = new NodeOperationError(node, errorMessage);

		expect(nodeOpError.obfuscate).toBe(false);
		expect(nodeOpError.message).toBe(errorMessage);
		expect(nodeOpError.messages).toHaveLength(0);
	});

	it('should not obfuscate error if description provided', () => {
		const error = new Error('Initial error message');
		const options = { description: 'Error description' };
		const nodeOpError = new NodeOperationError(node, error, options);

		expect(nodeOpError.obfuscate).toBe(false);
		expect(nodeOpError.message).toBe('Initial error message');
	});

	it('should respect provided options for message and description', () => {
		const error = new Error('Initial error message');
		const options = { message: 'Overridden message', description: 'Error description' };
		const nodeOpError = new NodeOperationError(node, error, options);

		expect(nodeOpError.obfuscate).toBe(false);
		expect(nodeOpError.message).toBe('Overridden message');
		expect(nodeOpError.description).toBe('Error description');
	});
});
