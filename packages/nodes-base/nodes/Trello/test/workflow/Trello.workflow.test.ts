import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const requests: Array<['get' | 'post' | 'put' | 'delete', string, object]> = [
	['post', '/1/boards', { id: 'trello-0', operation: 'create' }],
	['get', '/1/boards/5f1b2c3d4e5f6a7b8c9d0e1f', { id: 'trello-1', operation: 'get' }],
	['put', '/1/boards/5f1b2c3d4e5f6a7b8c9d0e1f', { id: 'trello-2', operation: 'update' }],
	['delete', '/1/boards/5f1b2c3d4e5f6a7b8c9d0e1f', { id: 'trello-3', operation: 'delete' }],
	['get', '/1/boards/5f1b2c3d4e5f6a7b8c9d0e1f/members', [{ id: 'trello-4', operation: 'getAll' }]],
	[
		'put',
		'/1/boards/5f1b2c3d4e5f6a7b8c9d0e1f/members/62c3d4e5f6a7b8c9d0e1f2a4',
		{ id: 'trello-5', operation: 'add' },
	],
	['put', '/1/boards/5f1b2c3d4e5f6a7b8c9d0e1f/members', { id: 'trello-6', operation: 'invite' }],
	[
		'delete',
		'/1/boards/5f1b2c3d4e5f6a7b8c9d0e1f/members/62c3d4e5f6a7b8c9d0e1f2a4',
		{ id: 'trello-7', operation: 'remove' },
	],
	['post', '/1/cards', { id: 'trello-8', operation: 'create' }],
	['get', '/1/cards/60a1b2c3d4e5f6a7b8c9d0e2', { id: 'trello-9', operation: 'get' }],
	['put', '/1/cards/60a1b2c3d4e5f6a7b8c9d0e2', { id: 'trello-10', operation: 'update' }],
	['delete', '/1/cards/60a1b2c3d4e5f6a7b8c9d0e2', { id: 'trello-11', operation: 'delete' }],
	[
		'post',
		'/1/cards/60a1b2c3d4e5f6a7b8c9d0e2/actions/comments',
		{ id: 'trello-12', operation: 'create' },
	],
	[
		'put',
		'/1/cards/60a1b2c3d4e5f6a7b8c9d0e2/actions/67b8c9d0e1f2a3b4c5d6e7f9/comments',
		{ id: 'trello-13', operation: 'update' },
	],
	[
		'delete',
		'/1//cards/60a1b2c3d4e5f6a7b8c9d0e2/actions/67b8c9d0e1f2a3b4c5d6e7f9/comments',
		{ id: 'trello-14', operation: 'delete' },
	],
	['put', '/1/lists/61b2c3d4e5f6a7b8c9d0e1f3/closed', { id: 'trello-15', operation: 'archive' }],
	['post', '/1/lists', { id: 'trello-16', operation: 'create' }],
	['get', '/1/lists/61b2c3d4e5f6a7b8c9d0e1f3', { id: 'trello-17', operation: 'get' }],
	['get', '/1/boards/5f1b2c3d4e5f6a7b8c9d0e1f/lists', [{ id: 'trello-18', operation: 'getAll' }]],
	['get', '/1/lists/61b2c3d4e5f6a7b8c9d0e1f3/cards', [{ id: 'trello-19', operation: 'getCards' }]],
	['put', '/1/lists/61b2c3d4e5f6a7b8c9d0e1f3', { id: 'trello-20', operation: 'update' }],
	[
		'post',
		'/1/cards/60a1b2c3d4e5f6a7b8c9d0e2/attachments',
		{ id: 'trello-21', operation: 'create' },
	],
	[
		'get',
		'/1/cards/60a1b2c3d4e5f6a7b8c9d0e2/attachments/63d4e5f6a7b8c9d0e1f2a3b5',
		{ id: 'trello-22', operation: 'get' },
	],
	[
		'get',
		'/1/cards/60a1b2c3d4e5f6a7b8c9d0e2/attachments',
		[{ id: 'trello-23', operation: 'getAll' }],
	],
	[
		'delete',
		'/1/cards/60a1b2c3d4e5f6a7b8c9d0e2/attachments/63d4e5f6a7b8c9d0e1f2a3b5',
		{ id: 'trello-24', operation: 'delete' },
	],
	[
		'post',
		'/1/cards/60a1b2c3d4e5f6a7b8c9d0e2/checklists',
		{ id: 'trello-25', operation: 'create' },
	],
	['get', '/1/checklists/64e5f6a7b8c9d0e1f2a3b4c6', { id: 'trello-26', operation: 'get' }],
	[
		'get',
		'/1/cards/60a1b2c3d4e5f6a7b8c9d0e2/checklists',
		[{ id: 'trello-27', operation: 'getAll' }],
	],
	[
		'delete',
		'/1/cards/60a1b2c3d4e5f6a7b8c9d0e2/checklists/64e5f6a7b8c9d0e1f2a3b4c6',
		{ id: 'trello-28', operation: 'delete' },
	],
	[
		'post',
		'/1/checklists/64e5f6a7b8c9d0e1f2a3b4c6/checkItems',
		{ id: 'trello-29', operation: 'createCheckItem' },
	],
	[
		'get',
		'/1/cards/60a1b2c3d4e5f6a7b8c9d0e2/checkItem/65f6a7b8c9d0e1f2a3b4c5d7',
		{ id: 'trello-30', operation: 'getCheckItem' },
	],
	[
		'put',
		'/1/cards/60a1b2c3d4e5f6a7b8c9d0e2/checkItem/65f6a7b8c9d0e1f2a3b4c5d7',
		{ id: 'trello-31', operation: 'updateCheckItem' },
	],
	[
		'delete',
		'/1/cards/60a1b2c3d4e5f6a7b8c9d0e2/checkItem/65f6a7b8c9d0e1f2a3b4c5d7',
		{ id: 'trello-32', operation: 'deleteCheckItem' },
	],
	['post', '/1/labels', { id: 'trello-33', operation: 'create' }],
	['get', '/1/labels/66a7b8c9d0e1f2a3b4c5d6e8', { id: 'trello-34', operation: 'get' }],
	['get', '/1/board/5f1b2c3d4e5f6a7b8c9d0e1f/labels', [{ id: 'trello-35', operation: 'getAll' }]],
	['put', '/1/labels/66a7b8c9d0e1f2a3b4c5d6e8', { id: 'trello-36', operation: 'update' }],
	['delete', '/1/labels/66a7b8c9d0e1f2a3b4c5d6e8', { id: 'trello-37', operation: 'delete' }],
	[
		'post',
		'/1//cards/60a1b2c3d4e5f6a7b8c9d0e2/idLabels',
		{ id: 'trello-38', operation: 'addLabel' },
	],
	[
		'delete',
		'/1//cards/60a1b2c3d4e5f6a7b8c9d0e2/idLabels/66a7b8c9d0e1f2a3b4c5d6e8',
		{ id: 'trello-39', operation: 'removeLabel' },
	],
];

describe('Trello > Workflows', () => {
	const credentials = {
		trelloApi: { apiKey: 'fake-api-key', apiToken: 'fake-api-token' },
	};

	beforeAll(() => {
		const trello = nock('https://api.trello.com');
		for (const [method, path, reply] of requests) {
			trello[method](path).query(true).reply(200, reply);
		}
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
