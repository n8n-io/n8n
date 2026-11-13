import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const affiliateId = 'nathanexample';
const programId = 'acme-corp-program';
const affiliate = { id: affiliateId, firstname: 'Nathan' };

describe('Tapfiliate > Workflows', () => {
	const credentials = { tapfiliateApi: { apiKey: 'fake-api-key' } };

	beforeAll(() => {
		const mock = nock('https://api.tapfiliate.com/1.6').matchHeader('api-key', 'fake-api-key');
		mock.get(`/affiliates/${affiliateId}/`).reply(200, affiliate);
		mock.get('/affiliates/').reply(200, [affiliate]);
		mock.delete(`/affiliates/${affiliateId}/`).reply(204);
		mock.put(`/affiliates/${affiliateId}/meta-data/tier/`, { value: 'gold' }).reply(200, {});
		mock.delete(`/affiliates/${affiliateId}/meta-data/tier/`).reply(204);
		mock
			.put(`/affiliates/${affiliateId}/meta-data/`, { tier: 'silver' })
			.reply(200, { tier: 'silver' });
		mock
			.post(`/programs/${programId}/affiliates/`, { affiliate: { id: affiliateId } })
			.reply(200, { id: affiliateId, approved: null });
		mock
			.put(`/programs/${programId}/affiliates/${affiliateId}/approved/`)
			.reply(200, { approved: true });
		mock
			.delete(`/programs/${programId}/affiliates/${affiliateId}/approved/`)
			.reply(200, { approved: false });
		mock
			.get(`/programs/${programId}/affiliates/${affiliateId}/`)
			.reply(200, { id: affiliateId, approved: true });
		mock
			.get(`/programs/${programId}/affiliates/`)
			.query({ page: 1 })
			.reply(200, [{ id: affiliateId, approved: true }], {
				link: `<https://api.tapfiliate.com/1.6/programs/${programId}/affiliates/?page=1>; rel="last"`,
			});
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
