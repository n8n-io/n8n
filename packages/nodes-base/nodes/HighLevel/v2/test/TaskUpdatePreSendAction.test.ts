import type { IExecuteSingleFunctions, IHttpRequestOptions } from 'n8n-workflow';

import { taskUpdatePreSendAction } from '../GenericFunctions';

describe('taskUpdatePreSendAction', () => {
	let mockThis: Partial<IExecuteSingleFunctions>;

	beforeEach(() => {
		mockThis = {
			getNodeParameter: jest.fn(),
			helpers: {
				httpRequestWithAuthentication: jest.fn(),
			} as any,
		};
	});

	it('should not modify requestOptions if title and dueDate are provided', async () => {
		const requestOptions: IHttpRequestOptions = {
			url: 'https://api.example.com',
			body: {
				title: 'Task Title',
				dueDate: '2024-12-25T00:00:00Z',
			},
		};

		const result = await taskUpdatePreSendAction.call(
			mockThis as IExecuteSingleFunctions,
			requestOptions,
		);

		expect(result).toEqual(requestOptions);
	});

	it('should fetch missing title and dueDate from the API', async () => {
		(mockThis.getNodeParameter as jest.Mock).mockReturnValueOnce('123').mockReturnValueOnce('456');

		const mockApiResponse = {
			title: 'Fetched Task Title',
			dueDate: '2024-12-25T02:00:00+02:00',
		};

		(mockThis.helpers?.httpRequestWithAuthentication as jest.Mock).mockResolvedValue(
			mockApiResponse,
		);

		const requestOptions: IHttpRequestOptions = {
			url: 'https://api.example.com',
			body: {
				title: undefined,
				dueDate: undefined,
			},
		};

		const result = await taskUpdatePreSendAction.call(
			mockThis as IExecuteSingleFunctions,
			requestOptions,
		);

		expect(mockThis.getNodeParameter).toHaveBeenCalledWith('contactId');
		expect(mockThis.getNodeParameter).toHaveBeenCalledWith('taskId');
		expect(mockThis.helpers?.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'highLevelOAuth2Api',
			expect.objectContaining({
				method: 'GET',
				url: 'https://services.leadconnectorhq.com/contacts/123/tasks/456',
				headers: { 'Content-Type': 'application/json', Version: '2021-07-28' },
				json: true,
			}),
		);

		expect(result.body).toEqual({
			title: 'Fetched Task Title',
			dueDate: '2024-12-25T02:00:00+02:00',
		});
	});

	it('should only fetch title if dueDate is provided', async () => {
		(mockThis.getNodeParameter as jest.Mock).mockReturnValueOnce('123').mockReturnValueOnce('456');

		const mockApiResponse = {
			title: 'Fetched Task Title',
			dueDate: '2024-12-25T02:00:00+02:00',
		};

		(mockThis.helpers?.httpRequestWithAuthentication as jest.Mock).mockResolvedValue(
			mockApiResponse,
		);

		const requestOptions: IHttpRequestOptions = {
			url: 'https://api.example.com',
			body: {
				title: undefined,
				dueDate: '2024-12-24T00:00:00Z',
			},
		};

		const result = await taskUpdatePreSendAction.call(
			mockThis as IExecuteSingleFunctions,
			requestOptions,
		);

		expect(result.body).toEqual({
			title: 'Fetched Task Title',
			dueDate: '2024-12-24T00:00:00Z',
		});
	});

	it('should only fetch dueDate if title is provided', async () => {
		(mockThis.getNodeParameter as jest.Mock).mockReturnValueOnce('123').mockReturnValueOnce('456');

		const mockApiResponse = {
			title: 'Fetched Task Title',
			dueDate: '2024-12-25T02:00:00+02:00',
		};

		(mockThis.helpers?.httpRequestWithAuthentication as jest.Mock).mockResolvedValue(
			mockApiResponse,
		);

		const requestOptions: IHttpRequestOptions = {
			url: 'https://api.example.com',
			body: {
				title: 'Existing Task Title',
				dueDate: undefined,
			},
		};

		const result = await taskUpdatePreSendAction.call(
			mockThis as IExecuteSingleFunctions,
			requestOptions,
		);

		expect(result.body).toEqual({
			title: 'Existing Task Title',
			dueDate: '2024-12-25T02:00:00+02:00',
		});
	});
});
