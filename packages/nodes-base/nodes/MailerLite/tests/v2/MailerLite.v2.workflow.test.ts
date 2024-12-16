import nock from 'nock';

import { getWorkflowFilenames, testWorkflows } from '../../../../test/nodes/Helpers';
import {
	getCreateResponseV2,
	getSubscriberResponseV2,
	getAllSubscribersResponseV2,
	getUpdateSubscriberResponseV2,
} from '../apiResponses';

describe('MailerLite', () => {
	describe('Run v2 workflow', () => {
		beforeAll(() => {
			nock.disableNetConnect();

			const mock = nock('https://connect.mailerlite.com/api');

			mock.post('/subscribers').reply(200, getCreateResponseV2);
			mock.get('/subscribers/user@n8n.io').reply(200, getSubscriberResponseV2);
			mock
				.get('/subscribers')
				.query({ 'filter[status]': 'junk', limit: 2 })
				.reply(200, getAllSubscribersResponseV2);
			mock.put('/subscribers/user@n8n.io').reply(200, getUpdateSubscriberResponseV2);
		});

		afterAll(() => {
			nock.restore();
		});

		const workflows = getWorkflowFilenames(__dirname);
		testWorkflows(workflows);
	});
});
