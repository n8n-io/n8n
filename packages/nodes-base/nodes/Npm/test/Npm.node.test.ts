import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test npm Node', () => {
	const credentials = {
		npmApi: {
			accessToken: 'fake-npm-access-token',
			registryUrl: 'https://fake.npm.registry',
		},
	};

	beforeAll(() => {
		const { registryUrl } = credentials.npmApi;
		const mock = nock(registryUrl); //.matchHeader('Authorization', `Bearer ${accessToken}`);

		mock.get('/-/package/n8n/dist-tags').reply(200, {
			latest: '0.225.2',
			next: '0.226.2',
		});

		mock.get('/n8n').reply(200, {
			time: {
				'0.225.2': '2023-04-25T09:45:36.407Z',
				'0.226.2': '2023-05-03T09:41:30.844Z',
				'0.227.0': '2023-05-03T13:44:32.079Z',
			},
		});

		mock.get('/n8n/latest').reply(200, {
			name: 'n8n',
			version: '0.225.2',
			rest: 'of the properties',
		});
	});

	new NodeTestHarness().setupTests({ credentials });
});
