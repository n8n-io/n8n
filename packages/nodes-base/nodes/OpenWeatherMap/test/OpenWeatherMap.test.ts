import nock from 'nock';

import { getWorkflowFilenames, testWorkflows } from '@test/nodes/Helpers';

import { currentWeatherResponse } from './apiResponses';

describe('OpenWeatherMap', () => {
	describe('Run OpenWeatherMap workflow', () => {
		beforeAll(() => {
			nock('https://api.openweathermap.org')
				.get('/data/2.5/weather')
				.query({ units: 'metric', q: 'berlin,de', lang: 'en' })
				.reply(200, currentWeatherResponse);
		});

		const workflows = getWorkflowFilenames(__dirname);
		testWorkflows(workflows);
	});
});
