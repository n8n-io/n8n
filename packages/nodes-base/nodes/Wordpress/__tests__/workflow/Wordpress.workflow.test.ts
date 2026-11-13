import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const post = { id: 123, title: { rendered: 'Hello world' } };
const page = { id: 456, title: { rendered: 'About' } };
const user = { id: 7, name: 'Nathan' };

describe('Wordpress > Workflows', () => {
	const credentials = {
		wordpressApi: {
			url: 'https://blog.example.com/wp',
			username: 'nathan',
			password: 'fake-password',
			allowUnauthorizedCerts: false,
		},
	};

	beforeAll(() => {
		const basic = nock('https://blog.example.com/wp/wp-json/wp/v2');
		basic.get('/posts/123').reply(200, post);
		basic.delete('/posts/123').query({ force: true }).reply(200, post);
		basic.post('/pages', { title: 'About' }).reply(200, page);
		basic.delete('/pages/456').query({ force: true }).reply(200, page);
		basic
			.post('/users', {
				name: 'Nathan',
				username: 'nathan',
				first_name: 'Nathan',
				last_name: 'Smith',
				email: 'nathan@example.com',
				password: 'fake-password',
			})
			.reply(200, user);
		basic.delete('/users/me').query({ reassign: '1', force: true }).reply(200, user);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
