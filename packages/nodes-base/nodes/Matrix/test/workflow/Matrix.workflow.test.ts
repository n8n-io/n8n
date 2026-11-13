import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const roomId = '!abc123:example.com';
const userId = '@nathan:example.com';
const event = { event_id: '$evt1:example.com', type: 'm.room.message' };

describe('Matrix > Workflows', () => {
	const credentials = {
		matrixApi: {
			homeserverUrl: 'https://matrix.example.com',
			accessToken: 'fake-access-token',
		},
	};

	beforeAll(() => {
		const mock = nock('https://matrix.example.com/_matrix/client/r0').matchHeader(
			'authorization',
			'Bearer fake-access-token',
		);
		mock.get('/account/whoami').reply(200, { user_id: userId });
		mock
			.post('/createRoom', { name: 'Support', preset: 'private_chat' })
			.reply(200, { room_id: roomId });
		mock.post(`/rooms/${roomId}/join`).reply(200, { room_id: roomId });
		mock.post(`/rooms/${roomId}/leave`).reply(200, {});
		mock.post(`/rooms/${roomId}/invite`, { user_id: userId }).reply(200, {});
		mock.post(`/rooms/${roomId}/kick`, { user_id: userId, reason: 'Spam' }).reply(200, {});
		mock
			.put(new RegExp(`^/_matrix/client/r0/rooms/${roomId}/send/m\\.room\\.message/[0-9a-f-]{36}$`))
			.reply(200, { event_id: event.event_id });
		mock
			.get(`/rooms/${roomId}/messages`)
			.query({ dir: 'b', limit: 10 })
			.reply(200, { chunk: [event] });
		mock.get(`/rooms/${roomId}/event/${event.event_id}`).reply(200, event);
		mock
			.get(`/rooms/${roomId}/members`)
			.query({ membership: '', not_membership: '' })
			.reply(200, { chunk: [{ state_key: userId }] });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
