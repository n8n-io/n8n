import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import {
	getCreateResponseClassic,
	getSubscriberResponseClassic,
	getAllSubscribersResponseClassic,
	getUpdateSubscriberResponseClassic,
} from '../apiResponses';

describe('MailerLite', () => {
	describe('Run v1 workflow', () => {
		beforeAll(() => {
			const mock = nock('https://api.mailerlite.com/api/v2');

			mock.post('/subscribers').reply(200, getCreateResponseClassic);
			mock.get('/subscribers/demo@mailerlite.com').reply(200, getSubscriberResponseClassic);
			mock.get('/subscribers').query({ limit: 1 }).reply(200, getAllSubscribersResponseClassic);
			mock.put('/subscribers/demo@mailerlite.com').reply(200, getUpdateSubscriberResponseClassic);
		});

		new NodeTestHarness().setupTests();
	});
});
