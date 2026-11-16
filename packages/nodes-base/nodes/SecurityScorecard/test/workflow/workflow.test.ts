import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('SecurityScorecard > Workflows', () => {
	const credentials = {
		securityScorecardApi: {
			apiKey: 'test-api-key',
		},
	};

	beforeAll(() => {
		const portfolio = '5f3c2a1b9d8e7f6a5b4c3d2e';
		const mock = nock('https://api.securityscorecard.io');
		mock.post('/portfolios').reply(200, { id: portfolio });
		mock.put(`/portfolios/${portfolio}`).reply(200, { id: portfolio });
		mock.delete(`/portfolios/${portfolio}`).reply(200, {});
		mock.get('/portfolios').reply(200, { entries: [{ id: portfolio }] });
		mock
			.put(`/portfolios/${portfolio}/companies/example.com`)
			.reply(200, { domain: 'example.com' });
		mock.delete(`/portfolios/${portfolio}/companies/example.com`).reply(200, {});
		mock
			.get(`/portfolios/${portfolio}/companies`)
			.reply(200, { entries: [{ domain: 'example.com' }] });
		mock
			.get('/reports/files/summary-example.pdf')
			.reply(200, 'report', { 'content-type': 'application/pdf' });
		mock.post('/reports/summary').reply(200, { id: 'report-1' });
		mock.get('/reports/recent').reply(200, { entries: [{ id: 'report-1' }] });
		mock.post('/invitations').reply(200, { id: 'invite-1' });
		mock.get('/industries/technology/score').reply(200, { score: 85 });
		mock
			.get('/industries/technology/history/factors')
			.times(2)
			.reply(200, { entries: [{ date: '2026-01-01', factors: [] }] });
		mock.get('/companies/example.com').reply(200, { domain: 'example.com' });
		mock
			.get('/companies/example.com/factors')
			.reply(200, { entries: [{ name: 'patching_cadence' }] });
		mock
			.get('/companies/example.com/history/factors/score')
			.reply(200, { entries: [{ date: '2026-01-01', factors: [] }] });
		mock
			.get('/companies/example.com/score-plans/by-target/90')
			.reply(200, { entries: [{ factor: 'patching_cadence' }] });
	});

	new NodeTestHarness().setupTests({
		credentials,
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
