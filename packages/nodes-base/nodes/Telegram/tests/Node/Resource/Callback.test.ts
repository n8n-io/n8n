import type { IDataObject, IHttpRequestMethods } from 'n8n-workflow';
import nock from 'nock';

import { apiRequest } from '../../../GenericFunctions';
import { createMockExecuteFunction } from '../../Helpers';

const answerCallbackQueryResponse = {
	ok: true,
	result: true,
};

jest.mock('../../../GenericFunctions', () => {
	const originalModule = jest.requireActual('../../../GenericFunctions');
	return {
		...originalModule,
		apiRequest: jest.fn(async function () {
			return answerCallbackQueryResponse;
		}),
	};
});

describe('Telegram > Resource > Callback', () => {
	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
		jest.unmock('../../../GenericFunctions');
	});

	const body = {} as IDataObject;
	const requestMethod = 'POST' as IHttpRequestMethods;

	describe('answerQuery', () => {
		it('should return the result of the query', async () => {
			const nodeParameters = {
				resource: 'callback',
				operation: 'answerQuery',
				options: { queryId: 'test' },
			};

			body.callback_query_id = createMockExecuteFunction(nodeParameters).getNodeParameter(
				'queryId',
				0,
			) as string;

			const response = await apiRequest.call(
				createMockExecuteFunction(nodeParameters),
				requestMethod,
				'answerCallbackQuery',
				body,
			);

			expect(apiRequest).toHaveBeenCalledWith('POST', 'answerCallbackQuery', body);

			expect(response).toEqual(answerCallbackQueryResponse);
		});
	});

	describe('answerInlineQuery', () => {
		it('should return the result of the inline Query', async () => {
			const nodeParameters = {
				resource: 'callback',
				operation: 'answerQuery',
				options: { queryId: 'test', results: 'a' },
			};

			body.callback_query_id = createMockExecuteFunction(nodeParameters).getNodeParameter(
				'queryId',
				0,
			) as string;

			body.results = createMockExecuteFunction(nodeParameters).getNodeParameter(
				'results',
				0,
			) as string;

			const response = await apiRequest.call(
				createMockExecuteFunction(nodeParameters),
				requestMethod,
				'answerInlineQuery',
				body,
			);

			expect(apiRequest).toHaveBeenCalledWith('POST', 'answerInlineQuery', body);

			expect(response).toEqual(answerCallbackQueryResponse);
		});
	});
});
