import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const boardId = 'Kd3RgEJ6qXzM7ZnBQ';
const listId = 'p8NdWqY2sLx4FbTzR';
const cardId = 'c7HvPm3KwQ9eJtY2A';
const swimlaneId = 'sW5mTr8BnX2kLqZ4E';
const userId = 'u4JrN8xQ2mWz6KbYt';
const checklistId = 'h2LpQ9tXw7RmK4NbV';
const itemId = 'i6VbN3qWz8TrL2MxK';
const commentId = 'm9KxT4wQ7pLz3RnVb';

describe('Wekan > Workflows', () => {
	const credentials = {
		wekanApi: {
			url: 'https://wekan.example.com',
			username: 'nathan',
			password: 'fake-password',
			token: 'fake-token',
		},
	};

	beforeAll(() => {
		const api = nock('https://wekan.example.com/api');
		const board = `/boards/${boardId}`;
		const card = `${board}/cards/${cardId}`;
		const checklist = `${card}/checklists/${checklistId}`;

		api.post('/boards', { title: 'Roadmap', owner: userId }).reply(200, { _id: boardId });
		api.delete(board).reply(200, { _id: boardId });
		api.get(board).reply(200, { _id: boardId, title: 'Roadmap' });
		api.get(`/users/${userId}/boards`).reply(200, [{ _id: boardId }]);

		api.post(`${board}/lists/${listId}/cards`).reply(200, { _id: cardId });
		api.delete(`${board}/lists/${listId}/cards/${cardId}`).reply(200, { _id: cardId });
		api
			.get(`${board}/lists/${listId}/cards/${cardId}`)
			.reply(200, { _id: cardId, title: 'Fix login' });
		api.get(`${board}/lists/${listId}/cards`).reply(200, [{ _id: cardId }]);
		api.get(`${board}/swimlanes/${swimlaneId}/cards`).reply(200, [{ _id: cardId }]);
		api.put(`${board}/lists/${listId}/cards/${cardId}`, { title: 'Fix logout' }).reply(200, {
			_id: cardId,
		});

		api.post(`${card}/comments`).reply(200, { _id: commentId });
		api.delete(`${card}/comments/${commentId}`).reply(200, { _id: commentId });
		api.get(`${card}/comments/${commentId}`).reply(200, { _id: commentId, comment: 'Done' });
		api.get(`${card}/comments`).reply(200, [{ _id: commentId }]);

		api.post(`${board}/lists`, { title: 'Backlog' }).reply(200, { _id: listId });
		api.delete(`${board}/lists/${listId}`).reply(200, { _id: listId });
		api.get(`${board}/lists/${listId}`).reply(200, { _id: listId, title: 'Backlog' });
		api.get(`${board}/lists`).reply(200, [{ _id: listId }]);

		api.post(`${card}/checklists`).reply(200, { _id: checklistId });
		api.delete(checklist).reply(200, { _id: checklistId });
		api.get(checklist).reply(200, { _id: checklistId, title: 'Steps' });
		api.get(`${card}/checklists`).reply(200, [{ _id: checklistId }]);

		api.get(`${checklist}/items/${itemId}`).reply(200, { _id: itemId, title: 'Write test' });
		api.delete(`${checklist}/items/${itemId}`).reply(200, { _id: itemId });
		api.put(`${checklist}/items/${itemId}`, { isFinished: true }).reply(200, { _id: itemId });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
