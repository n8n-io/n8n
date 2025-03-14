import {
	NodeApiError,
	type IExecuteSingleFunctions,
	type IN8nHttpFullResponse,
} from 'n8n-workflow';
import nock from 'nock';

import { sendErrorPostReceive } from '../GenericFunctions';

describe('Chat Completion Operations', () => {
	const baseUrl = 'https://api.perplexity.ai';
	let mockExecuteFunctions: IExecuteSingleFunctions;

	beforeEach(() => {
		if (!nock.isActive()) {
			nock.activate();
		}

		mockExecuteFunctions = {
			getNodeParameter: jest.fn((param: string) => {
				if (param === 'model') return 'sonar-reasoning';
				if (param === 'messages') return [{ role: 'user', content: 'Hello' }];
				return null;
			}),
			helpers: {
				request: jest.fn().mockResolvedValue({
					id: 'completion_12345',
					choices: [
						{ message: { role: 'assistant', content: 'Hello! How can I help you today?' } },
					],
				}),
			},
			getNode: () => ({
				name: 'Mock Node',
				type: 'mock-type',
				position: [0, 0],
			}),
		} as unknown as IExecuteSingleFunctions;
	});

	afterEach(() => {
		nock.cleanAll();
	});

	afterAll(() => {
		nock.restore();
	});

	it('should send a message and receive a completion response', async () => {
		nock(baseUrl)
			.post('/chat/completions')
			.reply(200, {
				id: 'completion_12345',
				choices: [{ message: { role: 'assistant', content: 'Hello! How can I help you today?' } }],
			});

		const apiResponse = await mockExecuteFunctions.helpers.request({
			method: 'POST',
			url: `${baseUrl}/chat/completions`,
			body: {
				model: 'sonar-reasoning',
				messages: [{ role: 'user', content: 'Hello' }],
			},
			headers: {
				Authorization: 'Bearer test-api-key',
				'Content-Type': 'application/json',
			},
		});

		const result = await sendErrorPostReceive.call(mockExecuteFunctions, [{ json: {} }], {
			statusCode: 200,
			headers: {},
			body: apiResponse,
		});

		expect(result).toEqual([{ json: {} }]);
		expect(mockExecuteFunctions.helpers.request).toHaveBeenCalledTimes(1);
	});

	it('should throw NodeApiError if the API returns a 400 error', async () => {
		const testResponse: IN8nHttpFullResponse = {
			statusCode: 400,
			headers: {},
			body: {
				error: {
					message: 'Bad request - please check your parameters',
					code: '400_BAD_REQUEST',
				},
			},
		};

		await expect(sendErrorPostReceive.call(mockExecuteFunctions, [], testResponse)).rejects.toThrow(
			NodeApiError,
		);
	});

	it('should throw NodeApiError if the API returns a 500 error', async () => {
		const testResponse: IN8nHttpFullResponse = {
			statusCode: 500,
			headers: {},
			body: {
				error: {
					message: 'Internal server error - please try again later',
					code: '500_INTERNAL_ERROR',
				},
			},
		};

		await expect(sendErrorPostReceive.call(mockExecuteFunctions, [], testResponse)).rejects.toThrow(
			NodeApiError,
		);
	});
});
