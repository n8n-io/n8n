import { UNKNOWN_ERROR_DESCRIPTION, UNKNOWN_ERROR_MESSAGE } from '../src/constants';
import { NodeOperationError } from '../src/errors';
import { NodeApiError } from '../src/errors/node-api.error';
import type { INode, JsonObject } from '../src/interfaces';

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

		expect(nodeApiError.message).toEqual(UNKNOWN_ERROR_MESSAGE);
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
			'The connection cannot be established, this usually occurs due to an incorrect host (domain) value',
		);
	});

	it('should return default message for ENOTFOUND, NodeApiError', () => {
		const nodeApiError = new NodeApiError(node, { message: 'ENOTFOUND test error message' });

		expect(nodeApiError.message).toEqual(
			'The connection cannot be established, this usually occurs due to an incorrect host (domain) value',
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

		//description should not include error message
		expect(nodeOperationError.description).toEqual('test error description');
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

describe('NodeApiError message and description logic', () => {
	it('case: customMessage && customDescription, result: message === customMessage; description === customDescription', () => {
		const apiError = { message: 'Original message', code: 404 };
		const nodeApiError = new NodeApiError(node, apiError, {
			message: 'Custom message',
			description: 'Custom description',
		});

		expect(nodeApiError.message).toEqual('Custom message');
		expect(nodeApiError.description).toEqual('Custom description');
		expect(nodeApiError.messages).toContain('Original message');
	});

	it('case: customMessage && !customDescription && extractedMessage, result: message === customMessage; description === extractedMessage', () => {
		const apiError = {
			message: 'Original message',
			code: 404,
			response: { data: { error: { message: 'Extracted message' } } },
		};
		const nodeApiError = new NodeApiError(node, apiError, {
			message: 'Custom message',
		});

		expect(nodeApiError.message).toEqual('Custom message');
		expect(nodeApiError.description).toEqual('Extracted message');
		expect(nodeApiError.messages).toContain('Original message');
	});

	it('case: customMessage && !customDescription && !extractedMessage, result: message === customMessage; !description', () => {
		const apiError = {
			message: '',
			code: 404,
			response: { data: { error: { foo: 'Extracted message' } } },
		};
		const nodeApiError = new NodeApiError(node, apiError, {
			message: 'Custom message',
		});

		expect(nodeApiError.message).toEqual('Custom message');
		expect(nodeApiError.description).toBeFalsy();
		expect(nodeApiError.messages.length).toBe(0);
	});

	it('case: !customMessage && httpCodeMapping && extractedMessage, result: message === httpCodeMapping; description === extractedMessage', () => {
		const apiError = {
			message: 'Original message',
			code: 404,
			response: { data: { error: { message: 'Extracted message' } } },
		};
		const nodeApiError = new NodeApiError(node, apiError);

		expect(nodeApiError.message).toEqual('The resource you are requesting could not be found');
		expect(nodeApiError.description).toEqual('Extracted message');
		expect(nodeApiError.messages).toContain('Original message');
	});

	it('case: !customMessage && httpCodeMapping && !extractedMessage, result: message === httpCodeMapping; !description', () => {
		const apiError = {
			message: '',
			code: 500,
		};
		const nodeApiError = new NodeApiError(node, apiError);

		expect(nodeApiError.message).toEqual('The service was not able to process your request');
		expect(nodeApiError.description).toBeFalsy();
	});

	it('case: !customMessage && !httpCodeMapping && extractedMessage, result: message === extractedMessage; !description', () => {
		const apiError = {
			message: '',
			code: 300,
			response: { data: { error: { message: 'Extracted message' } } },
		};
		const nodeApiError = new NodeApiError(node, apiError);

		expect(nodeApiError.message).toEqual('Extracted message');
		expect(nodeApiError.description).toBeFalsy();
	});

	it('case: !customMessage && !httpCodeMapping && !extractedMessage, result: message === UNKNOWN_ERROR_MESSAGE; description === UNKNOWN_ERROR_DESCRIPTION', () => {
		const apiError = {};
		const nodeApiError = new NodeApiError(node, apiError);

		expect(nodeApiError.message).toEqual(UNKNOWN_ERROR_MESSAGE);
		expect(nodeApiError.description).toEqual(UNKNOWN_ERROR_DESCRIPTION);
	});

	it('case: Error code sent as "any"', () => {
		const error = {
			code: 400,
			message: "Invalid value 'test' for viewId parameter.",
			status: 'INVALID_ARGUMENT',
		};
		const [message, ...rest] = error.message.split('\n');
		const description = rest.join('\n');
		const httpCode = error.code as any;
		const nodeApiError = new NodeApiError(node, error as JsonObject, {
			message,
			description,
			httpCode,
		});

		expect(nodeApiError.message).toEqual(error.message);
	});
});
