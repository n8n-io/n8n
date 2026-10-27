import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { currentWeatherResponse } from './apiResponses';

describe('OpenWeatherMap', () => {
	describe('v1', () => {
		beforeAll(() => {
			nock('https://api.openweathermap.org')
				.get('/data/2.5/weather')
				.query({ units: 'metric', q: 'berlin,de', lang: 'en' })
				.reply(200, currentWeatherResponse)
				.get('/data/2.5/weather')
				.query({ units: 'metric', q: 'invalid', lang: 'en' })
				.reply(404, { cod: '404', message: 'city not found' });
		});

		new NodeTestHarness().setupTests({
			workflowFiles: ['workflow.json'],
			credentials: { openWeatherMapApi: { accessToken: 'test-key' } },
		});
	});

	describe('v1.1', () => {
		beforeAll(() => {
			nock('https://gateway.example.com')
				.get('/v1/gateway/openweathermap/data/2.5/weather')
				.query({ units: 'metric', q: 'berlin,de', lang: 'en' })
				.reply(200, currentWeatherResponse)
				.get('/v1/gateway/openweathermap/data/2.5/weather')
				.query({ units: 'metric', q: 'invalid', lang: 'en' })
				.reply(404, { cod: '404', message: 'city not found' });
		});

		new NodeTestHarness().setupTests({
			workflowFiles: ['workflow-v1.1.json'],
			credentials: {
				openWeatherMapApi: {
					accessToken: 'test-key',
					url: 'https://gateway.example.com/v1/gateway/openweathermap/',
				},
			},
		});
	});
});
