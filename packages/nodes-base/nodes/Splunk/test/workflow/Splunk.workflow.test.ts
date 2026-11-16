import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const baseUrl = 'https://splunk.example.com:8089';
const reportId = 'Errors%20in%20the%20last%20hour';
const searchJobId = '1718944376.178';

const xmlEntry = (path: string) =>
	`<entry><title>Entry</title><id>${baseUrl}${path}</id><content type="text/xml"><s:dict><s:key name="status">ok</s:key><s:key name="owner">admin</s:key></s:dict></content></entry>`;
const xmlFeed = (path: string) => `<feed>${xmlEntry(path)}</feed>`;
const xmlMessage = '<response><messages><msg type="INFO">Done</msg></messages></response>';
const xmlSid = `<response><sid>${searchJobId}</sid></response>`;
const xmlResults =
	'<results><result><field k="host"><value><text>web-01</text></value></field><field k="count"><value><text>3</text></value></field></result></results>';
const jsonEntry = (path: string) => ({
	entry: [{ id: `${baseUrl}${path}`, name: 'Entry', content: { status: 'ok' } }],
});

const credentials = {
	splunkApi: {
		authToken: 'fake-token',
		baseUrl,
		allowUnauthorizedCerts: false,
	},
};

describe('Splunk v2 > Workflows', () => {
	beforeAll(() => {
		const api = nock(baseUrl);

		api
			.get('/services/alerts/fired_alerts')
			.query(true)
			.reply(200, jsonEntry('/services/alerts/fired_alerts/a1'));
		api
			.get('/services/alerts/metric_alerts')
			.query(true)
			.reply(200, jsonEntry('/services/alerts/metric_alerts/m1'));
		api
			.get(`/services/search/jobs/${searchJobId}`)
			.query(true)
			.times(3)
			.reply(200, jsonEntry(`/services/search/jobs/${searchJobId}`));
		api
			.post('/services/saved/searches')
			.reply(200, xmlFeed(`/services/saved/searches/${reportId}`));
		api.delete(`/services/saved/searches/${reportId}`).reply(200, xmlMessage);
		api
			.get(`/services/saved/searches/${reportId}`)
			.query(true)
			.reply(200, jsonEntry(`/services/saved/searches/${reportId}`));
		api
			.get('/services/saved/searches')
			.query(true)
			.reply(200, jsonEntry(`/services/saved/searches/${reportId}`));
		api.post('/services/search/jobs').reply(200, xmlSid);
		api.delete(`/services/search/jobs/${searchJobId}`).reply(200, xmlMessage);
		api
			.get('/services/search/jobs')
			.query(true)
			.reply(200, jsonEntry(`/services/search/jobs/${searchJobId}`));
		api
			.get(`/services/search/jobs/${searchJobId}/results`)
			.query(true)
			.reply(200, { results: [{ host: 'web-01' }] });
		api
			.post('/services/authentication/users')
			.reply(200, xmlFeed('/services/authentication/users/nathan'));
		api.delete('/services/authentication/users/nathan').reply(200, xmlMessage);
		api
			.get('/services/authentication/users/nathan')
			.query(true)
			.reply(200, jsonEntry('/services/authentication/users/nathan'));
		api
			.get('/services/authentication/users')
			.query(true)
			.reply(200, jsonEntry('/services/authentication/users/nathan'));
		api
			.post('/services/authentication/users/nathan')
			.reply(200, xmlFeed('/services/authentication/users/nathan'));
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests-v2.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});

describe('Splunk v1 > Workflows', () => {
	beforeAll(() => {
		const api = nock(baseUrl);

		api
			.get('/services/alerts/fired_alerts')
			.reply(200, xmlFeed('/services/alerts/fired_alerts/a1'));
		api.delete(`/services/saved/searches//${reportId}`).reply(200, xmlMessage);
		api
			.get(`/services/saved/searches//${reportId}`)
			.reply(200, xmlFeed(`/services/saved/searches/${reportId}`));
		api
			.get('/services/saved/searches')
			.query(true)
			.reply(200, xmlFeed(`/services/saved/searches/${reportId}`));
		api.post('/services/search/jobs').reply(200, xmlSid);
		api
			.get(`/services/search/jobs/${searchJobId}`)
			.reply(200, xmlEntry(`/services/search/jobs/${searchJobId}`));
		api.delete(`/services/search/jobs//${searchJobId}`).reply(200, xmlMessage);
		api
			.get(`/services/search/jobs//${searchJobId}`)
			.reply(200, xmlEntry(`/services/search/jobs/${searchJobId}`));
		api
			.get('/services/search/jobs')
			.query(true)
			.reply(200, xmlFeed(`/services/search/jobs/${searchJobId}`));
		api.get(`/services/search/jobs/${searchJobId}/results`).query(true).reply(200, xmlResults);
		api
			.post('/services/authentication/users')
			.reply(200, xmlFeed('/services/authentication/users/nathan'));
		api.delete('/services/authentication/users/nathan').reply(200, xmlMessage);
		api
			.get('/services/authentication/users//nathan')
			.reply(200, xmlFeed('/services/authentication/users/nathan'));
		api
			.get('/services/authentication/users')
			.query(true)
			.reply(200, xmlFeed('/services/authentication/users/nathan'));
		api
			.post('/services/authentication/users//nathan')
			.reply(200, xmlFeed('/services/authentication/users/nathan'));
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests-v1.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
