import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('HighLevel > Workflows', () => {
	const credentials = {
		highLevelApi: {
			apiKey: 'fake-api-key',
		},
		highLevelOAuth2Api: {
			scope: '',
			oauthTokenData: {
				access_token: 'fake-access-token',
				locationId: 've9EPM428h8vShlRW1KT',
			},
		},
	};

	beforeAll(() => {
		const v1 = nock('https://rest.gohighlevel.com/v1');
		v1.get('/pipelines/bCkKGpDsyPP4peuKBmyb/opportunities/zgzD7Ozd2ZAXx3pdKfmN').reply(200, {
			id: 'zgzD7Ozd2ZAXx3pdKfmN',
			name: 'Website deal',
			status: 'open',
		});
		v1.put('/pipelines/bCkKGpDsyPP4peuKBmyb/opportunities/zgzD7Ozd2ZAXx3pdKfmN', {
			monetaryValue: 250,
			status: 'open',
			title: 'Website deal',
		}).reply(200, {
			id: 'zgzD7Ozd2ZAXx3pdKfmN',
			name: 'Website deal',
			status: 'open',
			monetaryValue: 250,
		});
		v1.get('/contacts/ocQHyuzHvysMo5N5VsXc/tasks/TxbGPBOtYbYQXPsyITsA').reply(200, {
			id: 'TxbGPBOtYbYQXPsyITsA',
			title: 'Follow up',
			dueDate: '2025-03-01T10:00:00.000Z',
		});
		v1.put('/contacts/ocQHyuzHvysMo5N5VsXc/tasks/TxbGPBOtYbYQXPsyITsA', {
			description: 'Call back',
			title: 'Follow up',
			dueDate: '2025-03-01T05:00:00-05:00',
		}).reply(200, {
			id: 'TxbGPBOtYbYQXPsyITsA',
			title: 'Follow up',
			description: 'Call back',
		});

		const v2 = nock('https://services.leadconnectorhq.com');
		v2.post('/contacts/upsert/', {
			email: 'jane@example.com',
			phone: '',
			locationId: 've9EPM428h8vShlRW1KT',
		}).reply(200, {
			new: true,
			contact: {
				id: 'seD4PfOuKoVMLkEZqohJ',
				locationId: 've9EPM428h8vShlRW1KT',
				email: 'jane@example.com',
			},
		});
		v2.post('/contacts/seD4PfOuKoVMLkEZqohJ/notes', {
			userId: 've9EPM428h8vShlRW1KT',
			body: 'First call done',
		}).reply(201, { note: { id: 'note1' } });
		v2.get('/contacts/ocQHyuzHvysMo5N5VsXc/tasks/TxbGPBOtYbYQXPsyITsA').reply(200, {
			title: 'Follow up',
			dueDate: '2025-03-01T10:00:00.000Z',
		});
		v2.put('/contacts/ocQHyuzHvysMo5N5VsXc/tasks/TxbGPBOtYbYQXPsyITsA/', {
			completed: true,
			title: 'Follow up',
			dueDate: '2025-03-01T05:00:00-05:00',
		}).reply(200, {
			task: { id: 'TxbGPBOtYbYQXPsyITsA', title: 'Follow up', completed: true },
		});
	});

	new NodeTestHarness().setupTests({
		credentials,
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
