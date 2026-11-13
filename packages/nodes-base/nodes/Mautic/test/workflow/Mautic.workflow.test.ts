import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const contact = {
	id: 34,
	fields: { all: { id: 34, firstname: 'Nathan', email: 'nathan@example.com' } },
};
const company = { id: 12, fields: { all: { id: 12, companyname: 'Acme Corp' } } };
const success = { success: true };

describe('Mautic > Workflows', () => {
	describe('Credentials authentication', () => {
		const credentials = {
			mauticApi: {
				url: 'https://mautic.example.com',
				username: 'nathan',
				password: 'fake-password',
			},
		};

		beforeAll(() => {
			const mock = nock('https://mautic.example.com/api');
			mock.get('/companies/12').reply(200, { company });
			mock
				.get('/companies')
				.query({ limit: 2, start: 0 })
				.reply(200, { companies: { 12: company } });
			mock.patch('/companies/12/edit', { companyname: 'Acme Corp' }).reply(200, { company });
			mock.delete('/companies/12/delete').reply(200, { company });
			mock.get('/contacts/34').reply(200, { contact });
			mock.patch('/contacts/34/edit', { firstname: 'Nathan' }).reply(200, { contact });
			mock.delete('/contacts/34/delete').reply(200, { contact });
			mock.post('/emails/5/contact/34/send').reply(200, success);
			mock.post('/contacts/34/dnc/email/add').reply(200, { contact });
			mock.post('/contacts/34/points/plus/10').reply(200, success);
			mock.post('/segments/7/contact/34/add').reply(200, success);
			mock.post('/segments/7/contact/34/remove').reply(200, success);
			mock.post('/campaigns/3/contact/34/add').reply(200, success);
			mock.post('/campaigns/3/contact/34/remove').reply(200, success);
			mock.post('/emails/9/send').reply(200, success);
			mock.post('/companies/12/contact/34/add').reply(200, success);
			mock.post('/companies/12/contact/34/remove').reply(200, success);
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['requests.api.workflow.json'],
		});
	});

	describe('OAuth2 authentication', () => {
		const credentials = {
			mauticOAuth2Api: {
				url: 'https://oauth.mautic.example.com/',
				oauthTokenData: { access_token: 'fake-access-token' },
			},
		};

		beforeAll(() => {
			const mock = nock('https://oauth.mautic.example.com/api').matchHeader(
				'authorization',
				'Bearer fake-access-token',
			);
			mock.get('/contacts/34').reply(200, { contact });
			mock.post('/segments/7/contact/34/add').reply(200, success);
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['requests.oauth2.workflow.json'],
		});
	});
});
