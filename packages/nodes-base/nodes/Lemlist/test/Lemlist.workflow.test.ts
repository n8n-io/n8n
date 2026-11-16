import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Lemlist', () => {
	const credentials = { lemlistApi: { apiKey: 'fake-api-key' } };

	const campaignId = 'cam_A1B2C3D4E5F6G7H8I9';
	const email = 'nathan@n8n.io';
	const lead = { _id: 'lea_Z9Y8X7W6V5U4T3S2', email, campaignId };
	const unsubscribe = { _id: 'uns_K1L2M3N4O5P6Q7R8', email };

	const mockLeadRequests = (api: nock.Scope) => {
		api
			.post(`/campaigns/${campaignId}/leads/${email}`)
			.query({ deduplicate: true })
			.reply(200, lead);
		api
			.delete(`/campaigns/${campaignId}/leads/${email}`)
			.query({ action: 'remove' })
			.reply(200, lead);
		api.get(`/leads/${email}`).reply(200, lead);
		api.delete(`/campaigns/${campaignId}/leads/${email}`).reply(200, lead);
		api.post(`/unsubscribes/${email}`).reply(200, unsubscribe);
		api.delete(`/unsubscribes/${email}`).reply(200, unsubscribe);
		api.get('/team').reply(200, { _id: 'tea_1A2B3C4D5E6F', name: 'Acme Corp' });
	};

	describe('v2', () => {
		beforeAll(() => {
			const api = nock('https://api.lemlist.com/api');
			mockLeadRequests(api);
			api
				.get(`/campaigns/${campaignId}/stats`)
				.query({
					startDate: '2024-01-01T00:00:00.000Z',
					endDate: '2024-01-31T00:00:00.000Z',
					timezone: 'Europe/Berlin',
				})
				.reply(200, { nbLeads: 42 });
			api.get('/team/credits').reply(200, { credits: 100 });
			api.get('/enrich/enr_Q1W2E3R4T5Y6U7I8').reply(200, { id: 'enr_Q1W2E3R4T5Y6U7I8' });
			api
				.post('/leads/lea_Z9Y8X7W6V5U4T3S2/enrich/')
				.query({ findEmail: true, verifyEmail: false, linkedinEnrichment: false, findPhone: false })
				.reply(200, { id: 'enr_Q1W2E3R4T5Y6U7I8' });
			api
				.post('/enrich/')
				.query({
					email,
					findEmail: true,
					verifyEmail: false,
					linkedinEnrichment: false,
					findPhone: false,
				})
				.reply(200, { id: 'enr_P1O2I3U4Y5T6R7E8' });
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['requests.workflow.json'],
			customAssertions: () => expect(nock.isDone()).toBe(true),
		});
	});

	describe('v1', () => {
		beforeAll(() => {
			mockLeadRequests(nock('https://api.lemlist.com/api'));
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['requests-v1.workflow.json'],
			customAssertions: () => expect(nock.isDone()).toBe(true),
		});
	});

	describe('pre-encoded email', () => {
		beforeAll(() => {
			const api = nock('https://api.lemlist.com/api');
			api.get('/leads/nathan@n8n.io').times(2).reply(200, lead);
			api.get('/leads/nathan%2540n8n.io').reply(200, lead);
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['encoded-email.workflow.json'],
			customAssertions: () => expect(nock.isDone()).toBe(true),
		});
	});
});
