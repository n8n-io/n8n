import nock from 'nock';

import { setup, equalityTest, workflowToTests, getWorkflowFilenames } from '@test/nodes/Helpers';

import { currentWeatherResponse } from './apiResponses';

describe('OpenWeatherMap', () => {
	describe('Run OpenWeatherMap workflow', () => {
		const workflows = getWorkflowFilenames(__dirname);
		const tests = workflowToTests(workflows);

		beforeAll(() => {
			nock('https://api.openweathermap.org')
				.get('/data/2.5/weather')
				.query({ units: 'metric', q: 'berlin,de', lang: 'en' })
				.reply(200, currentWeatherResponse);
		});

		const nodeTypes = setup(tests);

		for (const testData of tests) {
			test(testData.description, async () => await equalityTest(testData, nodeTypes));
		}
	});
});
