import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const success = { result: 'success', msg: '' };

describe('Zulip > Workflows', () => {
	const credentials = {
		zulipApi: {
			url: 'https://chat.example.com/',
			email: 'bot@example.com',
			apiKey: 'fake-api-key',
		},
	};

	beforeAll(() => {
		const mock = nock('https://chat.example.com/api/v1').matchHeader(
			'authorization',
			`Basic ${Buffer.from('bot@example.com:fake-api-key').toString('base64')}`,
		);
		mock
			.post('/messages', { type: 'private', to: 'nathan@example.com', content: 'Hello' })
			.reply(200, { result: 'success', id: 42 });
		mock.get('/messages/42').reply(200, { result: 'success', raw_content: 'Hello' });
		mock.patch('/messages/42', { content: 'Hi' }).reply(200, success);
		mock.delete('/messages/42').reply(200, success);
		mock
			.get('/streams')
			.reply(200, { result: 'success', streams: [{ stream_id: 7, name: 'general' }] });
		mock.patch('/streams/7', { is_private: 'true' }).reply(200, success);
		mock.delete('/streams/7').reply(200, success);
		mock
			.get('/users/9')
			.reply(200, { result: 'success', user: { user_id: 9, full_name: 'Nathan' } });
		mock.patch('/users/9', { role: '400' }).reply(200, success);
		mock.delete('/users/9').reply(200, success);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
