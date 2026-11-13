import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const credentials = {
	microsoftToDoOAuth2Api: {
		scope: 'openid',
		oauthTokenData: {
			access_token: 'token',
		},
	},
};

describe('Microsoft To Do > request URLs', () => {
	const listId = 'AAMkADIyAAAhrbPXAAA=';
	const taskId = 'AAMkADIyAAAhrbPYAAA=';
	const linkedResourceId = 'f9cddce2-dce2-f9cd-e2dc-cdf9e2dccdf9';

	const linkedResource = { id: linkedResourceId, applicationName: 'n8n', displayName: 'Ticket' };
	const task = { id: taskId, title: 'Review report', status: 'notStarted' };
	const list = { id: listId, displayName: 'Project' };

	const tasksPath = `/v1.0/me/todo/lists/${listId}/tasks`;
	const linkedResourcesPath = `${tasksPath}/${taskId}/linkedResources`;

	beforeAll(() => {
		const graph = nock('https://graph.microsoft.com');

		graph.post(linkedResourcesPath).reply(201, linkedResource);
		graph.delete(`${linkedResourcesPath}/${linkedResourceId}`).reply(204);
		graph.get(`${linkedResourcesPath}/${linkedResourceId}`).reply(200, linkedResource);
		graph
			.get(linkedResourcesPath)
			.query({ $top: 2 })
			.reply(200, { value: [linkedResource] });
		graph.patch(`${linkedResourcesPath}/${linkedResourceId}`).reply(200, linkedResource);

		graph.post(tasksPath).reply(201, task);
		graph.delete(`${tasksPath}/${taskId}`).reply(204);
		graph.get(`${tasksPath}/${taskId}`).reply(200, task);
		graph
			.get(`${tasksPath}/`)
			.query({ $top: 2 })
			.reply(200, { value: [task] });
		graph.patch(`${tasksPath}/${taskId}`).reply(200, task);

		graph.post('/v1.0/me/todo/lists/').reply(201, list);
		graph.delete(`/v1.0/me/todo/lists/${listId}`).reply(204);
		graph.get(`/v1.0/me/todo/lists/${listId}`).reply(200, list);
		graph
			.get('/v1.0/me/todo/lists')
			.query({ $top: 100 })
			.reply(200, {
				value: [list],
				'@odata.nextLink':
					'https://graph.microsoft.com/v1.0/me/todo/lists?$top=100&$skiptoken=page2',
			});
		graph
			.get('/v1.0/me/todo/lists')
			.query({ $top: 100, $skiptoken: 'page2' })
			.reply(200, { value: [{ id: 'AAMkADIyAAAhrbPZAAA=', displayName: 'Groceries' }] });
		graph.patch(`/v1.0/me/todo/lists/${listId}`).reply(200, list);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requestUrls.workflow.json'],
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
