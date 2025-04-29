import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IHttpRequestMethods,
	INode,
} from 'n8n-workflow';
import nock from 'nock';

import { profileResponse } from './apiResponses';
import { ouraApiRequest } from '../GenericFunctions';

const node: INode = {
	id: '2cdb46cf-b561-4537-a982-b8d26dd7718b',
	name: 'Oura',
	type: 'n8n-nodes-base.oura',
	typeVersion: 1,
	position: [0, 0],
	parameters: {
		resource: 'profile',
		operation: 'get',
	},
};

const mockThis = {
	helpers: {
		httpRequestWithAuthentication: jest
			.fn()
			.mockResolvedValue({ statusCode: 200, data: profileResponse }),
	},
	getNode() {
		return node;
	},
	getNodeParameter: jest.fn(),
} as unknown as IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions;

describe('Oura', () => {
	describe('ouraApiRequest', () => {
		it('should make an authenticated API request to Oura', async () => {
			const method: IHttpRequestMethods = 'GET';
			const resource = '/usercollection/personal_info';

			await ouraApiRequest.call(mockThis, method, resource);

			expect(mockThis.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith('ouraApi', {
				method: 'GET',
				url: 'https://api.ouraring.com/v2/usercollection/personal_info',
				json: true,
			});
		});
	});

	describe('Run Oura workflow', () => {
		beforeAll(() => {
			nock('https://api.ouraring.com/v2')
				.get('/usercollection/personal_info')
				.reply(200, profileResponse);
		});

		new NodeTestHarness().setupTests();
	});
});
