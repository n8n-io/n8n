import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('NASA > Workflows', () => {
	const credentials = {
		nasaApi: {
			api_key: 'fake-api-key',
		},
	};

	const apod = {
		date: '2024-01-15',
		media_type: 'image',
		title: 'Orion Nebula',
		hdurl: 'https://apod.nasa.gov/apod/image/2401/orion_hd.jpg',
	};

	beforeAll(() => {
		const api = nock('https://api.nasa.gov');

		api
			.get('/planetary/apod')
			.query({ date: '2024-01-15', api_key: 'fake-api-key' })
			.reply(200, { ...apod, title: 'Horsehead Nebula' });
		api
			.get('/planetary/apod')
			.query({ date: '2024-01-16', api_key: 'fake-api-key' })
			.reply(200, { ...apod, date: '2024-01-16' });
		nock('https://apod.nasa.gov')
			.get('/apod/image/2401/orion_hd.jpg')
			.query({ date: '2024-01-16', api_key: 'fake-api-key' })
			.reply(200, Buffer.from('image'));
		api
			.get('/neo/rest/v1/neo/3542519')
			.query({ api_key: 'fake-api-key' })
			.reply(200, { id: '3542519', name: '(2010 PK9)', close_approach_data: [] });
		api
			.get('/neo/rest/v1/neo/browse')
			.query({ size: 2, api_key: 'fake-api-key' })
			.reply(200, {
				near_earth_objects: [
					{ id: '2000433', name: '433 Eros' },
					{ id: '2000719', name: '719 Albert' },
				],
			});
		api
			.get('/DONKI/CME')
			.query({ startDate: '2024-01-01', endDate: '2024-01-31', api_key: 'fake-api-key' })
			.reply(200, [{ activityID: '2024-01-03T14:48:00-CME-001' }]);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
