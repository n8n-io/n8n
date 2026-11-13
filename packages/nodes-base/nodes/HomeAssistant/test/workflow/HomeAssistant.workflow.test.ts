import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const kitchenLight = { entity_id: 'light.kitchen', state: 'on', attributes: {} };

describe('HomeAssistant > Workflows', () => {
	const credentials = {
		homeAssistantApi: {
			host: 'homeassistant.local',
			port: 8123,
			ssl: false,
			accessToken: 'fake-access-token',
		},
	};

	beforeAll(() => {
		const api = nock('http://homeassistant.local:8123/api').matchHeader(
			'authorization',
			'Bearer fake-access-token',
		);
		api.get('/config').reply(200, { version: '2024.5.0' });
		api.post('/config/core/check_config').reply(200, { result: 'valid' });
		api.get('/services').reply(200, [{ domain: 'light', services: {} }]);
		api.post('/services/light/turn_on', { entity_id: 'light.kitchen' }).reply(200, [kitchenLight]);
		api.get('/states').reply(200, [kitchenLight]);
		api.get('/states/light.kitchen').reply(200, kitchenLight);
		api
			.post('/states/sensor.outside_temperature', {
				state: '21',
				attributes: { unit_of_measurement: 'C' },
			})
			.reply(200, { entity_id: 'sensor.outside_temperature', state: '21' });
		api.get('/events').reply(200, [{ event: 'state_changed', listener_count: 1 }]);
		api
			.post('/events/garage_door_opened', { source: 'n8n' })
			.reply(200, { message: 'Event garage_door_opened fired.' });
		api.get('/error_log').reply(200, 'No errors');
		api
			.get('/logbook/2024-05-01T08:00:00')
			.query({ entity: 'light.kitchen' })
			.reply(200, [{ entity_id: 'light.kitchen', state: 'on' }]);
		api.post('/template', { template: "{{ states('light.kitchen') }}" }).reply(200, 'on');
		api.get('/history/period/2024-05-01T08:00:00').reply(200, [[kitchenLight]]);
		api
			.get('/camera_proxy/camera.front_door')
			.reply(200, Buffer.from('jpeg'), { 'content-type': 'image/jpeg' });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
