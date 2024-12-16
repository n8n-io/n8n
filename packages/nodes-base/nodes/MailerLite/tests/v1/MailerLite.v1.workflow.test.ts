import nock from 'nock';

import { getWorkflowFilenames, testWorkflows } from '../../../../test/nodes/Helpers';
import {
	getCreateResponseClassic,
	getSubscriberResponseClassic,
	getAllSubscribersResponseClassic,
	getUpdateSubscriberResponseClassic,
} from '../apiResponses';

describe('MailerLite', () => {
	describe('Run v1 workflow', () => {
		beforeAll(() => {
			nock.disableNetConnect();

			const mock = nock('https://api.mailerlite.com/api/v2');

			mock.post('/subscribers').reply(200, getCreateResponseClassic);
			mock.get('/subscribers/demo@mailerlite.com').reply(200, getSubscriberResponseClassic);
			mock.get('/subscribers').query({ limit: 1 }).reply(200, getAllSubscribersResponseClassic);
			mock.put('/subscribers/demo@mailerlite.com').reply(200, getUpdateSubscriberResponseClassic);
		});

		afterAll(() => {
			nock.restore();
		});

		const workflows = getWorkflowFilenames(__dirname);
		testWorkflows(workflows);
	});
});
