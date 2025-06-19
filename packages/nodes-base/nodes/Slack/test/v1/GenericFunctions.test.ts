import type { IExecuteFunctions } from 'n8n-workflow';

import { slackApiRequest, slackApiRequestAllItems, validateJSON } from '../../V1/GenericFunctions';

jest.mock('n8n-workflow', () => ({
	...jest.requireActual('n8n-workflow'),
	NodeApiError: jest.fn(),
}));

describe('Slack V1 > GenericFunctions', () => {
	let mockExecuteFunctions: IExecuteFunctions;

	beforeEach(() => {
		jest.clearAllMocks();
		mockExecuteFunctions = {
			helpers: {
				requestWithAuthentication: jest.fn(),
			},
			getNode: jest.fn().mockReturnValue({ type: 'n8n-nodes-base.slack', typeVersion: 1 }),
			getNodeParameter: jest.fn().mockReturnValue('accessToken'),
		} as unknown as IExecuteFunctions;
	});

	describe('slackApiRequest', () => {
		it('should handle successful response', async () => {
			const mockResponse = { ok: true, data: 'testData' };
			mockExecuteFunctions.helpers.requestWithAuthentication = jest
				.fn()
				.mockResolvedValue(mockResponse);

			const result = await slackApiRequest.call(mockExecuteFunctions, 'GET', '/test');
			expect(result).toEqual(mockResponse);
		});

		it('should use OAuth2 credentials when authentication is oAuth2', async () => {
			mockExecuteFunctions.getNodeParameter = jest.fn().mockReturnValue('oAuth2');
			const mockResponse = { ok: true };
			mockExecuteFunctions.helpers.requestWithAuthentication = jest
				.fn()
				.mockResolvedValue(mockResponse);

			await slackApiRequest.call(mockExecuteFunctions, 'GET', '/test');

			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'slackOAuth2Api',
				expect.any(Object),
				expect.objectContaining({
					oauth2: expect.any(Object),
				}),
			);
		});
	});

	describe('slackApiRequestAllItems', () => {
		it('should use default limit of 100 when no limit is provided', async () => {
			const mockResponse = {
				ok: true,
				channels: [{ id: 'ch1' }],
				response_metadata: { next_cursor: undefined },
			};

			mockExecuteFunctions.helpers.requestWithAuthentication = jest
				.fn()
				.mockResolvedValue(mockResponse);

			await slackApiRequestAllItems.bind(mockExecuteFunctions)(
				'channels',
				'GET',
				'conversations.list',
			);

			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'slackApi',
				expect.objectContaining({
					headers: expect.any(Object),
					qs: {
						limit: 100,
						page: 2,
						cursor: undefined,
					},
					json: true,
					method: 'GET',
					uri: expect.any(String),
				}),
				expect.any(Object),
			);
		});

		it('should use count instead of limit for files.list endpoint', async () => {
			const mockResponse = {
				ok: true,
				files: [{ id: 'file1' }],
				response_metadata: { next_cursor: undefined },
			};

			mockExecuteFunctions.helpers.requestWithAuthentication = jest
				.fn()
				.mockResolvedValue(mockResponse);

			await slackApiRequestAllItems.call(mockExecuteFunctions, 'files', 'GET', 'files.list');

			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'slackApi',
				expect.objectContaining({
					headers: expect.any(Object),
					qs: {
						count: 100,
						page: 2,
						cursor: undefined,
					},
					json: true,
					method: 'GET',
					uri: expect.any(String),
				}),
				expect.any(Object),
			);
		});

		it('should handle pagination with response_metadata next_cursor', async () => {
			const responses = [
				{
					ok: true,
					channels: [{ id: '1' }],
					response_metadata: { next_cursor: 'cursor1' },
				},
				{
					ok: true,
					channels: [{ id: '2' }],
					response_metadata: { next_cursor: '' },
				},
			];

			mockExecuteFunctions.helpers.requestWithAuthentication = jest
				.fn()
				.mockImplementationOnce(() => responses[0])
				.mockImplementationOnce(() => responses[1]);

			const result = await slackApiRequestAllItems.call(
				mockExecuteFunctions,
				'channels',
				'GET',
				'conversations.list',
			);

			expect(result).toEqual([{ id: '1' }, { id: '2' }]);
			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledTimes(2);
		});
	});

	describe('validateJSON', () => {
		it('should return undefined for invalid JSON', () => {
			const result = validateJSON('{invalid:json}');
			expect(result).toBeUndefined();
		});

		it('should return parsed object for valid JSON', () => {
			const result = validateJSON('{"key":"value"}');
			expect(result).toEqual({ key: 'value' });
		});
	});
});
