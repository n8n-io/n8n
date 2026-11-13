import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const resources = [
	{ label: 'epic', path: '/epics', id: 101 },
	{ label: 'issue', path: '/issues', id: 202 },
	{ label: 'task', path: '/tasks', id: 303 },
	{ label: 'user story', path: '/userstories', id: 404 },
];

const mockApi = (baseUrl: string, authCount: number) => {
	nock(`${baseUrl}/api/v1`)
		.post('/auth', { type: 'normal', username: 'nathan', password: 'fake-password' })
		.times(authCount)
		.reply(200, { auth_token: 'fake-token' });
	return nock(`${baseUrl}/api/v1`).matchHeader('authorization', 'Bearer fake-token');
};

describe('Taiga > Workflows', () => {
	describe('self-hosted', () => {
		beforeAll(() => {
			const api = mockApi('https://taiga.example.com', resources.length * 6);
			for (const { label, path, id } of resources) {
				api
					.post(path, { project: '7', subject: `New ${label}` })
					.reply(200, { id, subject: `New ${label}` });
				api
					.get(`${path}/${id}`)
					.times(2)
					.reply(200, { id, subject: `Existing ${label}`, version: 3 });
				api
					.get(path)
					.query({ project: '7', limit: 2 })
					.reply(200, [
						{ id, subject: 'First' },
						{ id: id + 1, subject: 'Second' },
					]);
				api
					.patch(`${path}/${id}`, { subject: 'Updated subject', version: 3 })
					.reply(200, { id, subject: 'Updated subject', version: 4 });
				api.delete(`${path}/${id}`).reply(204);
			}
		});

		new NodeTestHarness().setupTests({
			credentials: {
				taigaApi: {
					username: 'nathan',
					password: 'fake-password',
					environment: 'selfHosted',
					url: 'https://taiga.example.com',
				},
			},
			workflowFiles: ['requests.workflow.json'],
			customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
		});
	});

	describe('cloud', () => {
		beforeAll(() => {
			mockApi('https://api.taiga.io', 1)
				.get('/epics/101')
				.reply(200, { id: 101, subject: 'Existing epic', version: 3 });
		});

		new NodeTestHarness().setupTests({
			credentials: {
				taigaApi: {
					username: 'nathan',
					password: 'fake-password',
					environment: 'cloud',
					url: '',
				},
			},
			workflowFiles: ['cloud.workflow.json'],
			customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
		});
	});
});
