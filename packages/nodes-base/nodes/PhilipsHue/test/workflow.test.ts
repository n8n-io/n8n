import nock from 'nock';

import {
	deleteLightResponse,
	getLightsResponse,
	getConfigResponse,
	updateLightResponse,
} from './apiResponses';
import {
	setup,
	equalityTest,
	workflowToTests,
	getWorkflowFilenames,
} from '../../../test/nodes/Helpers';

describe('PhilipsHue', () => {
	describe('Run workflow', () => {
		const workflows = getWorkflowFilenames(__dirname);
		const tests = workflowToTests(workflows);

		beforeAll(() => {
			const mock = nock('https://api.meethue.com/route');
			mock.persist().get('/api/0/config').reply(200, getConfigResponse);
			mock.get('/api/pAtwdCV8NZId25Gk/lights').reply(200, getLightsResponse);
			mock.put('/api/pAtwdCV8NZId25Gk/lights/1/state').reply(200, updateLightResponse);
			mock.delete('/api/pAtwdCV8NZId25Gk/lights/1').reply(200, deleteLightResponse);
		});

		const nodeTypes = setup(tests);

		for (const testData of tests) {
			test(testData.description, async () => await equalityTest(testData, nodeTypes));
		}
	});
});
