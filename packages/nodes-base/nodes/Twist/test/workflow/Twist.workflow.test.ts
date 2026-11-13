import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const requests: Array<['get' | 'post' | 'put' | 'delete', string, object]> = [
	['post', '/api/v3/channels/add', { id: 'twist-0', operation: 'create' }],
	['get', '/api/v3/channels/getone', { id: 'twist-1', operation: 'get' }],
	['get', '/api/v3/channels/get', [{ id: 'twist-2', operation: 'getAll' }]],
	['post', '/api/v3/channels/update', { id: 'twist-3', operation: 'update' }],
	['post', '/api/v3/channels/archive', { id: 'twist-4', operation: 'archive' }],
	['post', '/api/v3/channels/unarchive', { id: 'twist-5', operation: 'unarchive' }],
	['post', '/api/v3/channels/remove', { id: 'twist-6', operation: 'delete' }],
	['post', '/api/v3/comments/add', { id: 'twist-7', operation: 'create' }],
	['get', '/api/v3/comments/getone', { comment: { id: 'twist-8', operation: 'get' } }],
	['get', '/api/v3/comments/get', [{ id: 'twist-9', operation: 'getAll' }]],
	['post', '/api/v3/comments/update', { id: 'twist-10', operation: 'update' }],
	['post', '/api/v3/comments/remove', { id: 'twist-11', operation: 'delete' }],
	['post', '/api/v3/conversation_messages/add', { id: 'twist-12', operation: 'create' }],
	['get', '/api/v3/conversation_messages/getone', { id: 'twist-13', operation: 'get' }],
	['get', '/api/v3/conversation_messages/get', [{ id: 'twist-14', operation: 'getAll' }]],
	['post', '/api/v3/conversation_messages/update', { id: 'twist-15', operation: 'update' }],
	['post', '/api/v3/conversation_messages/remove', { id: 'twist-16', operation: 'delete' }],
	['post', '/api/v3/threads/add', { id: 'twist-17', operation: 'create' }],
	['get', '/api/v3/threads/getone', { id: 'twist-18', operation: 'get' }],
	['get', '/api/v3/threads/get', [{ id: 'twist-19', operation: 'getAll' }]],
	['post', '/api/v3/threads/update', { id: 'twist-20', operation: 'update' }],
	['post', '/api/v3/threads/remove', { id: 'twist-21', operation: 'delete' }],
];

describe('Twist > Workflows', () => {
	const credentials = {
		twistOAuth2Api: { oauthTokenData: { access_token: 'fake-access-token' } },
	};

	beforeAll(() => {
		const twist = nock('https://api.twist.com');
		for (const [method, path, reply] of requests) {
			twist[method](path).query(true).reply(200, reply);
		}
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
