import nock from 'nock';

import {
	setup,
	equalityTest,
	workflowToTests,
	getWorkflowFilenames,
} from '../../../../../test/nodes/Helpers';
import { userCreate, userGet, userGetMany, userUpdate } from '../apiResponses';

describe('Wordpress > User Workflows', () => {
	describe('Run workflow', () => {
		const workflows = getWorkflowFilenames(__dirname);
		const tests = workflowToTests(workflows);

		beforeAll(() => {
			const mock = nock('https://myblog.com');
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
			mock
				.get('/wp-json/wp/v2/users')
				.query({ orderby: 'id', per_page: 1 })
				.reply(200, userGetMany);
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

		const nodeTypes = setup(tests);

		for (const testData of tests) {
			test(testData.description, async () => await equalityTest(testData, nodeTypes));
		}
	});
});
