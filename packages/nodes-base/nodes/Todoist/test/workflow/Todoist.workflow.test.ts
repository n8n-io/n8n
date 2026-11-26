import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { IDataObject } from 'n8n-workflow';
import nock from 'nock';
import { isDeepStrictEqual } from 'node:util';

const v1Task = { id: '7025491738', content: 'Buy milk' };
const task = { id: '6X7rM8997g3RQmvh', content: 'Buy milk' };
const collaborator = { id: '2671355', name: 'Nathan', email: 'nathan@example.com' };

describe('Todoist > Request URLs', () => {
	const credentials = {
		todoistApi: {
			apiKey: 'fake-api-key',
		},
	};

	beforeAll(() => {
		const api = nock('https://api.todoist.com');
		api.get('/rest/v2/tasks/7025491738').reply(200, v1Task);
		api.post('/rest/v2/tasks/7025491738/close').reply(204);
		api.post('/rest/v2/tasks/7025491738/reopen').reply(204);
		api.post('/rest/v2/tasks/7025491738', { content: 'Buy milk' }).reply(200, v1Task);
		api.delete('/rest/v2/tasks/7025491738').reply(204);
		const syncBody =
			(type: string, id: string) =>
			({ commands, temp_id_mapping }: { commands: IDataObject[]; temp_id_mapping: IDataObject }) =>
				commands.length === 1 &&
				commands[0].type === type &&
				isDeepStrictEqual(commands[0].args, { id }) &&
				isDeepStrictEqual(temp_id_mapping, {});
		api.get('/rest/v2/sections').query({ project_id: '2302163813' }).times(2).reply(200, []);
		api.post('/sync/v9/sync', syncBody('item_close', '7025491738')).reply(200, {});
		api.post('/sync/v9/sync', syncBody('item_uncomplete', '7025491739')).reply(200, {});
		api.get('/api/v1/tasks/6X7rM8997g3RQmvh').reply(200, task);
		api
			.get('/api/v1/projects/6Jf8VQXxpwv56VQ7/collaborators')
			.reply(200, { results: [collaborator], next_cursor: null });
		api.post('/api/v1/tasks/quick', { text: 'Buy milk tomorrow' }).reply(200, task);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
