import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Mailchimp > Workflows', () => {
	const credentials = {
		mailchimpApi: {
			apiKey: 'test0123456789abcdef-us19',
		},
		mailchimpOAuth2Api: {
			metadataUrl: 'https://login.mailchimp.com/oauth2/metadata',
			oauthTokenData: { access_token: 'fake-access-token' },
		},
	};

	const listId = 'a1b2c3d4e5';
	const categoryId = 'f6e5d4c3b2';
	const campaignId = 'b03bfc273a';
	const email = 'nathan@n8n.io';
	const member = { id: 'm1', email_address: email };
	const campaign = { id: campaignId, status: 'save' };

	beforeAll(() => {
		nock('https://us19.api.mailchimp.com/3.0')
			.get(`/lists/${listId}/interest-categories/${categoryId}/interests`)
			.query({ count: 5 })
			.reply(200, { interests: [{ id: 'int1', name: 'Interest' }] })
			.post(`/lists/${listId}/members`)
			.reply(200, member)
			.post(`/lists/${listId}/members/${email}/actions/delete-permanent`)
			.reply(204)
			.get(`/lists/${listId}/members/${email}`)
			.reply(200, member)
			.get(`/lists/${listId}/members`)
			.query({ count: 5 })
			.reply(200, { members: [member] })
			.put(`/lists/${listId}/members/${email}`)
			.reply(200, member)
			.post(`/lists/${listId}/members/${email}/tags`)
			.twice()
			.reply(204)
			.get('/campaigns')
			.query(true)
			.reply(200, { campaigns: [campaign] })
			.post(`/campaigns/${campaignId}/actions/send`)
			.reply(204)
			.get(`/campaigns/${campaignId}`)
			.reply(200, campaign)
			.delete(`/campaigns/${campaignId}`)
			.reply(204)
			.post(`/campaigns/${campaignId}/actions/replicate`)
			.reply(200, { id: 'c2', status: 'save' })
			.post(`/campaigns/${campaignId}/actions/create-resend`)
			.reply(200, { id: 'c3', status: 'save' });

		nock('https://login.mailchimp.com')
			.get('/oauth2/metadata')
			.reply(200, { api_endpoint: 'https://us19.api.mailchimp.com' });

		nock('https://us19.api.mailchimp.com/3.0')
			.matchHeader('authorization', 'Bearer fake-access-token')
			.get(`/campaigns/${campaignId}`)
			.reply(200, campaign);
	});

	new NodeTestHarness().setupTests({ credentials, workflowFiles: ['workflow.json'] });

	it('should call every mocked endpoint', () => {
		expect(nock.pendingMocks()).toEqual([]);
	});
});
