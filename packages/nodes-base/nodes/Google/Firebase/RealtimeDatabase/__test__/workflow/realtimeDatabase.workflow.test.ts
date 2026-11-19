import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Google Cloud Realtime Database Node - request URLs', () => {
	beforeAll(() => {
		nock('https://acme-shop-default-rtdb.europe-west1.firebasedatabase.app')
			.put('/users/u8Kf2Lq9/profile.json', { name: 'Alice', city: 'Berlin' })
			.reply(200, { name: 'Alice', city: 'Berlin' })
			.post('/orders.json', { name: 'Alice', city: 'Berlin' })
			.reply(200, { name: '-NxQ7aB3cD4eF5gH6iJ' })
			.patch('/users/u8Kf2Lq9/.json', { age: 31 })
			.reply(200, { age: 31 })
			.get('/.json')
			.reply(200, { users: { u8Kf2Lq9: { age: 31 } } })
			.get('/logs/2026-10-12T09:00:00Z/status.json')
			.reply(200, '"ok"', { 'Content-Type': 'application/json' })
			.delete('/orders/-NxQ7aB3cD4eF5gH6iJ.json')
			.reply(200, 'null', { 'Content-Type': 'application/json' });
	});

	afterAll(() => {
		expect(nock.pendingMocks()).toEqual([]);
	});

	new NodeTestHarness().setupTests({
		credentials: {
			googleFirebaseRealtimeDatabaseOAuth2Api: {
				region: 'europe-west1.firebasedatabase.app',
				oauthTokenData: { access_token: 'test-access-token' },
			},
		},
		workflowFiles: ['realtimeDatabase.workflow.json'],
	});
});
