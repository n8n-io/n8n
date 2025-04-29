import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { userCreate, userGet, userGetMany, userUpdate } from '../apiResponses';
import { credentials } from '../credentials';

describe('Wordpress > User Workflows', () => {
	beforeAll(() => {
		const mock = nock(credentials.wordpressApi.url);
		mock
			.post('/wp-json/wp/v2/users', {
				name: 'nathan tester',
				username: 'new-user',
				first_name: 'Nathan',
				last_name: 'Tester',
				email: 'nathan@domain.com',
				password: 'fake-password',
			})
			.reply(200, userCreate);
		mock.get('/wp-json/wp/v2/users/2').query({ context: 'view' }).reply(200, userGet);
		mock.get('/wp-json/wp/v2/users').query({ orderby: 'id', per_page: 1 }).reply(200, userGetMany);
		mock
			.post('/wp-json/wp/v2/users/2', {
				id: '2',
				name: 'Name Change',
				first_name: 'Name',
				last_name: 'Change',
				nickname: 'newuser',
			})
			.reply(200, userUpdate);
	});

	new NodeTestHarness().setupTests({ credentials });
});
