import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Jira', () => {
	const credentials = {
		jiraSoftwareCloudApi: {
			email: 'nathan@n8n.io',
			apiToken: 'fake-api-token',
			domain: 'https://acme.atlassian.net',
		},
	};

	const issueKey = 'NODE-123';
	const issue = { id: '10001', key: issueKey, fields: { summary: 'Fix login' } };
	const comment = { id: '10500', body: 'Looks good' };
	const attachment = {
		id: '10200',
		filename: 'report.pdf',
		mimeType: 'application/pdf',
		content: 'https://acme.atlassian.net/rest/api/3/attachment/content/10200',
	};
	const user = { accountId: '5b10ac8d82e05b22cc7d4ef5', displayName: 'Nathan' };
	const issueTypes = [{ id: '10004', subtask: false }];

	beforeAll(() => {
		const api = nock('https://acme.atlassian.net/rest');
		api.get('/api/2/issuetype').times(2).reply(200, issueTypes);
		api.post('/api/2/issue').reply(201, { id: '10001', key: issueKey });
		api.post(`/api/2/issue/${issueKey}/transitions`, { transition: { id: '31' } }).reply(204);
		api.put(`/api/2/issue/${issueKey}`).reply(204);
		api.get(`/api/2/issue/${issueKey}`).reply(200, issue);
		api.post('/api/2/search/jql').reply(200, { issues: [issue] });
		api
			.get(`/api/2/issue/${issueKey}/changelog`)
			.query({ maxResults: 5 })
			.reply(200, { values: [{ id: '20001' }] });
		api.post(`/api/2/issue/${issueKey}/notify`).reply(204);
		api
			.get(`/api/2/issue/${issueKey}/transitions`)
			.reply(200, { transitions: [{ id: '31', name: 'Done' }] });
		api.delete(`/api/2/issue/${issueKey}`).query({ deleteSubtasks: true }).reply(204);
		api.get('/api/3/attachment/10200').reply(200, attachment);
		api
			.get(`/api/2/issue/${issueKey}`)
			.reply(200, { ...issue, fields: { attachment: [attachment] } });
		api.delete('/api/3/attachment/10200').reply(204);
		api.post(`/api/3/issue/${issueKey}/comment`).reply(201, comment);
		api.get(`/api/3/issue/${issueKey}/comment/10500`).reply(200, comment);
		api
			.get(`/api/3/issue/${issueKey}/comment`)
			.query({ maxResults: 5 })
			.reply(200, { comments: [comment] });
		api.put(`/api/3/issue/${issueKey}/comment/10500`).reply(200, comment);
		api.delete(`/api/3/issue/${issueKey}/comment/10500`).reply(204);
		api.post('/api/3/user').reply(201, user);
		api.get('/api/3/user').query({ accountId: user.accountId }).reply(200, user);
		api.delete('/api/3/user').query({ accountId: user.accountId }).reply(204);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
