import nock from 'nock';

import { getWorkflowFilenames, testWorkflows } from '@test/nodes/Helpers';

import {
	deleteLightResponse,
	getLightsResponse,
	getConfigResponse,
	updateLightResponse,
} from './apiResponses';

describe('PhilipsHue', () => {
	describe('Run workflow', () => {
		beforeAll(() => {
			const mock = nock('https://api.meethue.com/route');
			mock.persist().get('/api/0/config').reply(200, getConfigResponse);
			mock.get('/api/pAtwdCV8NZId25Gk/lights').reply(200, getLightsResponse);
			mock.put('/api/pAtwdCV8NZId25Gk/lights/1/state').reply(200, updateLightResponse);
			mock.delete('/api/pAtwdCV8NZId25Gk/lights/1').reply(200, deleteLightResponse);
		});

		const workflows = getWorkflowFilenames(__dirname);
		testWorkflows(workflows);
	});
});
