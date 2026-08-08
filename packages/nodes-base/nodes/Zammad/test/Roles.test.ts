import nock from 'nock';
import axios from 'axios';
import { Zammad } from '../Zammad.node';
import { RoleGetResponse, RoleCreateResponse } from './RoleResponses';

describe('Zammad Node - resource: role', () => {
	beforeAll(() => {
		nock.disableNetConnect();

		// GET /api/v1/roles/1
		nock('https://api.zammad.org/').get('/api/v1/roles/1').reply(200, RoleGetResponse);
	});

	afterAll(() => {
		nock.cleanAll();
		nock.enableNetConnect();
		nock.restore();
	});

	it('should get role "Admin" via the node.execute method', async () => {
		const node = new Zammad();

		const items = [{ json: {} }];

		const context = {
			getInputData: () => items,

			getCredentials: jest.fn().mockResolvedValue({
				baseUrl: 'https://api.zammad.org/',
				accessToken: 'testToken',
				allowUnauthorizedCerts: false,
			}),

			getNodeParameter: (paramName: string, index: number) => {
				if (paramName === 'resource') return 'role';
				if (paramName === 'operation') return 'get';
				if (paramName === 'id') return 1;
				return undefined;
			},

			continueOnFail: () => false,

			helpers: {
				returnJsonArray: (data: any) => [data],
				constructExecutionMetaData: (data: any) => data,
				request: async (options: any) => {
					const response = await axios({
						method: options.method,
						url: options.uri,
						data: options.body,
						headers: options.headers,
						validateStatus: () => true,
					});
					return response.data;
				},
			},
		};

		const result = await node.execute.call(context as any);
		expect(result[0][0].name).toBe('Admin');
	});
});
