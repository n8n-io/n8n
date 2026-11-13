import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const space = { name: 'spaces/AAAAx1y2z3', spaceType: 'SPACE', displayName: 'Team Planning' };
const member = {
	name: 'spaces/AAAAx1y2z3/members/115839216493',
	state: 'JOINED',
	member: { name: 'users/115839216493', type: 'HUMAN' },
};
const message = {
	name: 'spaces/AAAAx1y2z3/messages/Kp2qR7sT9uV.Kp2qR7sT9uV',
	text: 'Weekly sync starts now',
	space: { name: 'spaces/AAAAx1y2z3' },
};

describe('Google Chat Node - request URLs', () => {
	beforeAll(() => {
		const messagePath = '/v1/spaces/AAAAx1y2z3/messages/Kp2qR7sT9uV.Kp2qR7sT9uV';

		nock('https://chat.googleapis.com')
			.get('/v1/spaces/AAAAx1y2z3')
			.reply(200, space)
			.get('/v1/spaces')
			.query({ pageSize: 1 })
			.reply(200, { spaces: [space] })
			.get('/v1/spaces/AAAAx1y2z3/members/115839216493')
			.reply(200, member)
			.get('/v1/spaces/AAAAx1y2z3/members')
			.query({ pageSize: 2 })
			.reply(200, { memberships: [member] })
			.post('/v1/spaces/AAAAx1y2z3/messages', { text: 'Weekly sync starts now' })
			.reply(200, message)
			.get(messagePath)
			.reply(200, message)
			.put(messagePath, { text: 'Weekly sync moved to 10:00' })
			.query({ updateMask: 'text' })
			.reply(200, { ...message, text: 'Weekly sync moved to 10:00' })
			.delete(messagePath)
			.reply(200, {});
	});

	afterAll(() => {
		expect(nock.pendingMocks()).toEqual([]);
	});

	new NodeTestHarness().setupTests({
		credentials: {
			googleChatOAuth2Api: {
				scope: 'https://www.googleapis.com/auth/chat.messages',
				oauthTokenData: { access_token: 'test-access-token' },
			},
		},
		workflowFiles: ['requests.workflow.json'],
	});
});
