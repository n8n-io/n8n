import type { INode } from '@/Interfaces';
import { NodeOperationError } from '@/errors';
import { NodeApiError } from '@/errors/node-api.error';

const node: INode = {
	id: '1',
	name: 'Postgres node',
	typeVersion: 2,
	type: 'n8n-nodes-base.postgres',
	position: [60, 760],
	parameters: {
		operation: 'executeQuery',
	},
};

describe('NodeErrors tests', () => {
	it('should return unknown error message', () => {
		const nodeApiError = new NodeApiError(node, {});

		expect(nodeApiError.message).toEqual(
			'UNKNOWN ERROR - check the detailed error for more information',
		);
	});

	it('should return the error message', () => {
		const nodeApiError = new NodeApiError(node, { message: 'test error message' });

		expect(nodeApiError.message).toEqual('test error message');
	});

	it('should return the error message defined in reason', () => {
		const nodeApiError = new NodeApiError(node, { reason: { message: 'test error message' } });

		expect(nodeApiError.message).toEqual('test error message');
	});

	it('should return the error message defined in options', () => {
		const nodeApiError = new NodeApiError(node, {}, { message: 'test error message' });

		expect(nodeApiError.message).toEqual('test error message');
	});

	it('should return description error message', () => {
		const nodeApiError = new NodeApiError(node, { description: 'test error description' });

		expect(nodeApiError.message).toEqual('test error description');
	});

	it('should return description as error message defined in reason', () => {
		const nodeApiError = new NodeApiError(node, {
			reason: { description: 'test error description' },
		});

		expect(nodeApiError.message).toEqual('test error description');
	});

	it('should return description as error message defined in options', () => {
		const nodeApiError = new NodeApiError(node, {}, { description: 'test error description' });

		expect(nodeApiError.message).toEqual('test error description');
	});

	it('should return default message for ECONNREFUSED', () => {
		const nodeApiError = new NodeApiError(node, {
			message: 'ECONNREFUSED',
		});

		expect(nodeApiError.message).toEqual(
			'The service refused the connection - perhaps it is offline',
		);
	});

	it('should return default message for 502', () => {
		const nodeApiError = new NodeApiError(node, {
			message: '502 Bad Gateway',
		});

		expect(nodeApiError.message).toEqual('Bad gateway - the service failed to handle your request');
	});

	it('should return default message for ENOTFOUND, NodeOperationError', () => {
		const nodeOperationError = new NodeOperationError(node, 'ENOTFOUND test error message');

		expect(nodeOperationError.message).toEqual(
			'The connection cannot be established, this usually occurs due to an incorrect host(domain) value',
		);
	});

	it('should return default message for ENOTFOUND, NodeApiError', () => {
		const nodeApiError = new NodeApiError(node, { message: 'ENOTFOUND test error message' });

		expect(nodeApiError.message).toEqual(
			'The connection cannot be established, this usually occurs due to an incorrect host(domain) value',
		);
	});

	it('should return default message for EEXIST based on code, NodeApiError', () => {
		const nodeApiError = new NodeApiError(node, {
			message: 'test error message',
			code: 'EEXIST',
		});

		expect(nodeApiError.message).toEqual('The file or directory already exists');
	});

	it('should update description GETADDRINFO, NodeOperationError', () => {
		const nodeOperationError = new NodeOperationError(node, 'GETADDRINFO test error message', {
			description: 'test error description',
		});

		expect(nodeOperationError.message).toEqual('The server closed the connection unexpectedly');

		expect(nodeOperationError.description).toEqual(
			'GETADDRINFO test error message - test error description',
		);
	});

	it('should remove description if it is equal to message, NodeOperationError', () => {
		const nodeOperationError = new NodeOperationError(node, 'some text', {
			description: 'some text',
		});

		expect(nodeOperationError.message).toEqual('some text');

		expect(nodeOperationError.description).toEqual(undefined);
	});

	it('should remove description if it is equal to message, message provided in options take precedence over original, NodeApiError', () => {
		const nodeApiError = new NodeApiError(
			node,
			{
				message: 'original message',
			},
			{ message: 'new text', description: 'new text' },
		);

		expect(nodeApiError.message).toEqual('new text');

		expect(nodeApiError.description).toEqual(undefined);
	});

	it('should return mapped message for MYMAPPEDMESSAGE, NodeOperationError', () => {
		const nodeOperationError = new NodeOperationError(node, 'MYMAPPEDMESSAGE test error message', {
			messageMapping: {
				MYMAPPEDMESSAGE: 'test error message',
			},
		});

		expect(nodeOperationError.message).toEqual('test error message');
	});

	it('should return mapped message for MYMAPPEDMESSAGE, NodeApiError', () => {
		const nodeApiError = new NodeApiError(
			node,
			{ message: 'MYMAPPEDMESSAGE test error message' },
			{
				messageMapping: {
					MYMAPPEDMESSAGE: 'test error message',
				},
			},
		);

		expect(nodeApiError.message).toEqual('test error message');
	});

	it('should return default message for EACCES, custom mapping not found, NodeOperationError', () => {
		const nodeOperationError = new NodeOperationError(node, 'EACCES test error message', {
			messageMapping: {
				MYMAPPEDMESSAGE: 'test error message',
			},
		});

		expect(nodeOperationError.message).toEqual(
			'Forbidden by access permissions, make sure you have the right permissions',
		);
	});
});
