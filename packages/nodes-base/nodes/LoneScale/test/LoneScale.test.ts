import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('LoneScale Node', () => {
	const credentials = {
		loneScaleApi: {
			apiKey: 'test-api-key',
		},
	};

	beforeAll(() => {
		const baseUrl = 'https://public-api.lonescale.com';

		nock(baseUrl)
			.post('/trigger/enrich/sync')
			.reply(200, {
				contacts: [{ firstName: 'Tim', lastName: 'Cook', email: 'tim@apple.com' }],
			});

		nock(baseUrl)
			.post('/trigger/contact-sourcing/sync')
			.reply(200, {
				contacts: [{ lonescale_full_name: 'Jane Doe', lonescale_job_title: 'Head of Sales' }],
				profiles_found: 1,
			});

		nock(baseUrl)
			.get('/companies/search')
			.query({ domain: 'stripe.com' })
			.reply(200, {
				results: [{ name: 'Stripe', domain: 'stripe.com' }],
				count: 1,
				custom: {},
			});
	});

	new NodeTestHarness().setupTests({ credentials });
});
