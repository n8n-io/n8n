import type { IDataObject, IHttpRequestMethods } from 'n8n-workflow';
import nock from 'nock';

import { apiRequest } from '../../../GenericFunctions';
import { createMockExecuteFunction } from '../../Helpers';

const getChatResponse = {
	ok: true,
	result: {
		id: 123456789,
		first_name: 'Nathan',
		last_name: 'Automator',
		username: 'n8n',
		type: 'private',
		active_usernames: ['n8n'],
		bio: 'Automating all the things',
		has_private_forwards: true,
		max_reaction_count: 11,
		accent_color_id: 3,
	},
};

jest.mock('../../../GenericFunctions', () => {
	const originalModule = jest.requireActual('../../../GenericFunctions');
	return {
		...originalModule,
		apiRequest: jest.fn(async function () {
			return getChatResponse;
		}),
	};
});

describe('Telegram > Resource > Chat', () => {
	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
		jest.unmock('../../../GenericFunctions');
	});

	const body = {} as IDataObject;
	const requestMethod = 'POST' as IHttpRequestMethods;

	describe('get', () => {
		it('should return the result of the query', async () => {
			const nodeParameters = {
				resource: 'chat',
				operation: 'get',
				options: { chatId: '123456789' },
			};

			body.chat_id = createMockExecuteFunction(nodeParameters).getNodeParameter(
				'chatId',
				0,
			) as string;

			const response = await apiRequest.call(
				createMockExecuteFunction(nodeParameters),
				requestMethod,
				'getChat',
				body,
			);

			expect(apiRequest).toHaveBeenCalledWith('POST', 'getChat', body);

			expect(response).toEqual(getChatResponse);
		});
	});
});
