import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test SlackV2, user => updateProfile', () => {
	nock('https://slack.com')
		.post('/api/users.profile.set', {
			profile: {
				customFieldUi: {
					customFieldValues: [{ alt: '', id: 'Xf05SGHVUDKM', value: 'TEST title' }],
				},
				email: 'some@email.com',
				fields: { Xf05SGHVUDKM: { alt: '', value: 'TEST title' } },
				first_name: 'first',
				last_name: 'last',
				status_emoji: '👶',
				status_expiration: 1734670800,
				status_text: 'test status',
			},
			user: 'id-new',
		})
		.reply(200, { profile: { test: 'OK' } });

	new NodeTestHarness().setupTests({
		workflowFiles: ['updateProfile.workflow.json'],
	});
});
