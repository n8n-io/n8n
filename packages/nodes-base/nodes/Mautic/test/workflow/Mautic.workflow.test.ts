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

	// The Primary Company field became a resourceLocator. These run through the real
	// execution engine (including core's extractValue): workflows saved before the change
	// (no company, raw string, expression) must send exactly what they sent before, and
	// resourceLocator values must send the company name. nock only answers requests whose
	// body matches exactly.
	describe('Primary Company', () => {
		const credentials = {
			mauticApi: {
				url: 'https://mautic.example.com',
				username: 'nathan',
				password: 'fake-password',
			},
		};
		const created = (id: number, email: string) => ({
			contact: { id, fields: { all: { id, email } } },
		});
		const updated = (id: number) => ({ contact: { id, fields: { all: { id } } } });
		const createBody = (email: string, company: string) => ({
			email,
			firstname: '',
			lastname: '',
			company,
			position: '',
			title: '',
		});

		beforeAll(() => {
			const mock = nock('https://mautic.example.com/api');
			mock
				.post('/contacts/new', createBody('legacy-none@example.com', ''))
				.reply(200, created(1, 'legacy-none@example.com'));
			mock
				.post('/contacts/new', createBody('legacy-string@example.com', 'Legacy Company'))
				.reply(200, created(2, 'legacy-string@example.com'));
			mock
				.post('/contacts/new', createBody('legacy-expression@example.com', 'Expression Company'))
				.reply(200, created(3, 'legacy-expression@example.com'));
			mock
				.post('/contacts/new', createBody('rl-list@example.com', 'Acme: North Branch'))
				.reply(200, created(4, 'rl-list@example.com'));
			mock
				.post('/contacts/new', createBody('rl-name@example.com', 'Typed Company'))
				.reply(200, created(5, 'rl-name@example.com'));
			mock.patch('/contacts/41/edit', { company: 'Legacy Company' }).reply(200, updated(41));
			mock.patch('/contacts/42/edit', { company: 'Acme Corp' }).reply(200, updated(42));
			mock.patch('/contacts/43/edit', { firstname: 'Nathan' }).reply(200, updated(43));
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['requests.company.workflow.json'],
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
