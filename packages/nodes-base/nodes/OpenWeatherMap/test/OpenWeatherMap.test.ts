import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { currentWeatherResponse } from './apiResponses';

describe('OpenWeatherMap', () => {
	describe('Run OpenWeatherMap workflow', () => {
		beforeAll(() => {
			nock('https://api.openweathermap.org')
				.get('/data/2.5/weather')
				.query({ units: 'metric', q: 'berlin,de', lang: 'en' })
				.reply(200, currentWeatherResponse)
				.get('/data/2.5/weather')
				.query({ units: 'metric', q: 'invalid', lang: 'en' })
				.reply(404, { cod: '404', message: 'city not found' });
		});

		new NodeTestHarness().setupTests();
	});
});
