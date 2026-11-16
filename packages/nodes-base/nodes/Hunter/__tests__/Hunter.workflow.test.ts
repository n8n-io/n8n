import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Hunter', () => {
	const credentials = { hunterApi: { apiKey: 'fake-api-key' } };

	const email = { value: 'nathan@n8n.io', type: 'personal', confidence: 94 };

	beforeAll(() => {
		const api = nock('https://api.hunter.io/v2');
		api
			.get('/domain-search')
			.query({ api_key: 'fake-api-key', domain: 'n8n.io', limit: 10 })
			.reply(200, { data: { domain: 'n8n.io', organization: 'n8n', emails: [email] } });
		api
			.get('/domain-search')
			.query({ api_key: 'fake-api-key', domain: 'n8n.io', offset: 0, limit: 100 })
			.reply(200, {
				data: { domain: 'n8n.io', emails: [email] },
				meta: { results: 1, offset: 0 },
			});
		api
			.get('/domain-search')
			.query({ api_key: 'fake-api-key', domain: 'n8n.io', offset: 100, limit: 100 })
			.reply(200, {
				data: { domain: 'n8n.io', emails: [] },
				meta: { results: 1, offset: 100 },
			});
		api
			.get('/email-finder')
			.query({
				api_key: 'fake-api-key',
				domain: 'n8n.io',
				first_name: 'Nathan',
				last_name: 'Smith',
			})
			.reply(200, { data: { email: 'nathan@n8n.io', score: 97 } });
		api
			.get('/email-verifier')
			.query({ api_key: 'fake-api-key', email: 'nathan@n8n.io' })
			.reply(200, { data: { email: 'nathan@n8n.io', status: 'valid' } });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
