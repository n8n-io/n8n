import nock from 'nock';

import { testWorkflows } from '@test/nodes/Helpers';

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

	const workflows = ['nodes/Slack/test/v2/node/user/updateProfile.workflow.json'];
	testWorkflows(workflows);
});
