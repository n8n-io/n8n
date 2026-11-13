import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Strava', () => {
	const credentials = {
		stravaOAuth2Api: {
			clientId: 'test-client-id',
			clientSecret: 'test-client-secret',
			oauthTokenData: { access_token: 'test-access-token' },
		},
	};
	const activity = { id: 1234567890, name: 'Morning Run' };

	describe('Run workflow', () => {
		beforeAll(() => {
			const mock = nock('https://www.strava.com/api/v3');
			mock.get('/activities/1234567890').reply(200, activity);
			mock.get('/activities/1234567890/laps').reply(200, [
				{ id: 4479306946, lap_index: 1 },
				{ id: 4479306947, lap_index: 2 },
			]);
			mock.get('/activities/1234567890/zones').reply(200, [{ type: 'heartrate' }]);
			mock.get('/activities/1234567890/kudos').reply(200, [{ firstname: 'Jan' }]);
			mock.get('/activities/1234567890/comments').reply(200, [
				{ id: 1, text: 'Nice run' },
				{ id: 2, text: 'Great pace' },
			]);
			mock
				.get('/activities/1234567890/streams')
				.query({ keys: 'time', key_by_type: true })
				.reply(200, [{ type: 'time', data: [0, 1] }]);
			mock.put('/activities/1234567890').reply(200, activity);
		});

		afterAll(() => {
			expect(nock.pendingMocks()).toEqual([]);
		});

		new NodeTestHarness().setupTests({ credentials });
	});
});
