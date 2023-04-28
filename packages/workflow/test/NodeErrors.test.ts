import { INode } from '../src/Interfaces';
import { NodeApiError } from '../src/NodeErrors';

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
});
