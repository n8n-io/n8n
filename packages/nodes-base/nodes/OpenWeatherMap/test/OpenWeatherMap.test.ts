import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { currentWeatherResponse } from './apiResponses';

describe('OpenWeatherMap', () => {
	describe('Run OpenWeatherMap workflow', () => {
		beforeAll(() => {
			nock('https://api.openweathermap.org')
				.get('/data/2.5/weather')
				.query({ units: 'metric', q: 'berlin,de', lang: 'en' })
				.reply(200, currentWeatherResponse);
		});

		new NodeTestHarness().setupTests();
	});
});
