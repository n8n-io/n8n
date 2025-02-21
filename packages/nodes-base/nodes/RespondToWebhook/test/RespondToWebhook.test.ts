import type { DeepMockProxy } from 'jest-mock-extended';
import { mock, mockDeep } from 'jest-mock-extended';
import { constructExecutionMetaData } from 'n8n-core';
import {
	BINARY_ENCODING,
	WAIT_NODE_TYPE,
	type IExecuteFunctions,
	type INode,
	type INodeExecutionData,
	type NodeTypeAndVersion,
} from 'n8n-workflow';

import { RespondToWebhook } from '../RespondToWebhook.node';

describe('RespondToWebhook Node', () => {
	let respondToWebhook: RespondToWebhook;
	let mockExecuteFunctions: DeepMockProxy<IExecuteFunctions>;

	beforeEach(() => {
		respondToWebhook = new RespondToWebhook();
		mockExecuteFunctions = mockDeep<IExecuteFunctions>({
			helpers: { constructExecutionMetaData },
		});
	});

	describe('execute method', () => {
		it('should throw an error if no WEBHOOK_NODE_TYPES in parents', async () => {
			mockExecuteFunctions.getInputData.mockReturnValue([]);
			mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.1 }));
			mockExecuteFunctions.getParentNodes.mockReturnValue([
				mock<NodeTypeAndVersion>({ type: 'n8n-nodes-base.someNode' }),
			]);

			await expect(respondToWebhook.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'No Webhook node found in the workflow',
			);
		});

		it('should not throw an error if WEBHOOK_NODE_TYPES is in parents', async () => {
			mockExecuteFunctions.getInputData.mockReturnValue([]);
			mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.1 }));
			mockExecuteFunctions.getParentNodes.mockReturnValue([
				mock<NodeTypeAndVersion>({ type: WAIT_NODE_TYPE }),
			]);
			mockExecuteFunctions.getNodeParameter.mockReturnValue('text');
			mockExecuteFunctions.getNodeParameter.mockReturnValue({});
			mockExecuteFunctions.getNodeParameter.mockReturnValue('noData');
			mockExecuteFunctions.sendResponse.mockReturnValue();

			await expect(respondToWebhook.execute.call(mockExecuteFunctions)).resolves.not.toThrow();
		});

		it('should correctly apply response options', async () => {
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: { input: true } }]);
			mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.1 }));
			mockExecuteFunctions.getParentNodes.mockReturnValue([
				mock<NodeTypeAndVersion>({ type: WAIT_NODE_TYPE }),
			]);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName) => {
				if (paramName === 'respondWith') return 'firstIncomingItem';
				if (paramName === 'options')
					return {
						responseHeaders: { entries: [{ name: 'X-My-Header', value: 'X-My-Header' }] },
						responseCode: 201,
						responseKey: 'data',
					};
			});
			mockExecuteFunctions.sendResponse.mockReturnValue();

			await expect(respondToWebhook.execute.call(mockExecuteFunctions)).resolves.not.toThrow();
			expect(mockExecuteFunctions.sendResponse).toHaveBeenCalledWith({
				body: { data: { input: true } },
				headers: { 'x-my-header': 'X-My-Header' },
				statusCode: 201,
			});
		});

		it('should correctly return a json response', async () => {
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: { input: true } }]);
			mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.1 }));
			mockExecuteFunctions.getParentNodes.mockReturnValue([
				mock<NodeTypeAndVersion>({ type: WAIT_NODE_TYPE }),
			]);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName) => {
				if (paramName === 'respondWith') return 'json';
				if (paramName === 'options') return {};
				if (paramName === 'responseBody') return { response: true };
			});
			mockExecuteFunctions.sendResponse.mockReturnValue();

			await expect(respondToWebhook.execute.call(mockExecuteFunctions)).resolves.not.toThrow();
			expect(mockExecuteFunctions.sendResponse).toHaveBeenCalledWith({
				body: { response: true },
				headers: {},
				statusCode: 200,
			});
		});

		it('should correctly return a stringified json response', async () => {
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: { input: true } }]);
			mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.1 }));
			mockExecuteFunctions.getParentNodes.mockReturnValue([
				mock<NodeTypeAndVersion>({ type: WAIT_NODE_TYPE }),
			]);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName) => {
				if (paramName === 'respondWith') return 'json';
				if (paramName === 'options') return {};
				if (paramName === 'responseBody') return JSON.stringify({ response: true });
			});
			mockExecuteFunctions.sendResponse.mockReturnValue();

			await expect(respondToWebhook.execute.call(mockExecuteFunctions)).resolves.not.toThrow();
			expect(mockExecuteFunctions.sendResponse).toHaveBeenCalledWith({
				body: { response: true },
				headers: {},
				statusCode: 200,
			});
		});

		it('should correctly return a jwt response', async () => {
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: { input: true } }]);
			mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.1 }));
			mockExecuteFunctions.getCredentials.mockResolvedValue(
				mock({
					keyType: 'passphrase',
					privateKey: 'privateKey',
					secret: 'secret',
					algorithm: 'HS256',
				}),
			);
			mockExecuteFunctions.getParentNodes.mockReturnValue([
				mock<NodeTypeAndVersion>({ type: WAIT_NODE_TYPE }),
			]);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName) => {
				if (paramName === 'respondWith') return 'jwt';
				if (paramName === 'options') return {};
				if (paramName === 'payload') return 'payload';
			});
			mockExecuteFunctions.sendResponse.mockReturnValue();

			await expect(respondToWebhook.execute.call(mockExecuteFunctions)).resolves.not.toThrow();
			expect(mockExecuteFunctions.sendResponse).toHaveBeenCalledWith({
				body: {
					token: 'eyJhbGciOiJIUzI1NiJ9.cGF5bG9hZA.4GMt2k_zZryxhKgC8_HvdSZtYxyEyDa0AFIL-n60a8M',
				},
				headers: {},
				statusCode: 200,
			});
		});

		it('should correctly return a text response', async () => {
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: { input: true } }]);
			mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.1 }));
			mockExecuteFunctions.getParentNodes.mockReturnValue([
				mock<NodeTypeAndVersion>({ type: WAIT_NODE_TYPE }),
			]);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName) => {
				if (paramName === 'respondWith') return 'text';
				if (paramName === 'options') return {};
				if (paramName === 'responseBody') return 'responseBody';
			});
			mockExecuteFunctions.sendResponse.mockReturnValue();

			await expect(respondToWebhook.execute.call(mockExecuteFunctions)).resolves.not.toThrow();
			expect(mockExecuteFunctions.sendResponse).toHaveBeenCalledWith({
				body: 'responseBody',
				headers: {},
				statusCode: 200,
			});
		});

		it('should correctly return a redirect', async () => {
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: { input: true } }]);
			mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.1 }));
			mockExecuteFunctions.getParentNodes.mockReturnValue([
				mock<NodeTypeAndVersion>({ type: WAIT_NODE_TYPE }),
			]);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName) => {
				if (paramName === 'respondWith') return 'redirect';
				if (paramName === 'options') return {};
				if (paramName === 'redirectURL') return 'https://n8n.io';
			});
			mockExecuteFunctions.sendResponse.mockReturnValue();

			await expect(respondToWebhook.execute.call(mockExecuteFunctions)).resolves.not.toThrow();
			expect(mockExecuteFunctions.sendResponse).toHaveBeenCalledWith({
				headers: { location: 'https://n8n.io' },
				statusCode: 307,
			});
		});

		it('should correctly return incoming items', async () => {
			const inputItems = [{ json: { index: 0, input: true } }, { json: { index: 1, input: true } }];
			mockExecuteFunctions.getInputData.mockReturnValue(inputItems);
			mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.1 }));
			mockExecuteFunctions.getParentNodes.mockReturnValue([
				mock<NodeTypeAndVersion>({ type: WAIT_NODE_TYPE }),
			]);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName) => {
				if (paramName === 'respondWith') return 'allIncomingItems';
				if (paramName === 'options') return {};
			});
			mockExecuteFunctions.sendResponse.mockReturnValue();

			await expect(respondToWebhook.execute.call(mockExecuteFunctions)).resolves.not.toThrow();
			expect(mockExecuteFunctions.sendResponse).toHaveBeenCalledWith({
				body: inputItems.map((item) => item.json),
				headers: {},
				statusCode: 200,
			});
		});

		it('should correctly return binary', async () => {
			const binary = { data: 'text', mimeType: 'text/plain' };
			const inputItems: INodeExecutionData[] = [{ binary: { data: binary }, json: {} }];
			mockExecuteFunctions.getInputData.mockReturnValue(inputItems);
			mockExecuteFunctions.helpers.assertBinaryData.mockReturnValue(binary);
			mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.1 }));
			mockExecuteFunctions.getParentNodes.mockReturnValue([
				mock<NodeTypeAndVersion>({ type: WAIT_NODE_TYPE }),
			]);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName) => {
				if (paramName === 'respondWith') return 'binary';
				if (paramName === 'options') return {};
			});
			mockExecuteFunctions.sendResponse.mockReturnValue();

			await expect(respondToWebhook.execute.call(mockExecuteFunctions)).resolves.not.toThrow();
			expect(mockExecuteFunctions.sendResponse).toHaveBeenCalledWith({
				body: Buffer.from('text', BINARY_ENCODING),
				headers: {
					'content-length': 3,
					'content-type': 'text/plain',
				},
				statusCode: 200,
			});
		});

		it('should correctly handle continue on fail', async () => {
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: { input: true } }]);
			mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.1 }));
			mockExecuteFunctions.continueOnFail.mockReturnValue(true);
			mockExecuteFunctions.getParentNodes.mockReturnValue([
				mock<NodeTypeAndVersion>({ type: WAIT_NODE_TYPE }),
			]);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName) => {
				if (paramName === 'respondWith') return 'notSupportedRespondWith';
				if (paramName === 'options') return {};
			});
			mockExecuteFunctions.sendResponse.mockReturnValue();

			await expect(respondToWebhook.execute.call(mockExecuteFunctions)).resolves.toEqual([
				[
					{
						json: { error: 'The Response Data option "notSupportedRespondWith" is not supported!' },
						pairedItem: [{ item: 0 }],
					},
				],
			]);
			expect(mockExecuteFunctions.sendResponse).not.toHaveBeenCalled();
		});
	});
});
