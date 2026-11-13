import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';

const fileId = '01BYE5RZ6QN3ZWBTUFOFD3GSPGOHDJD36K';
const folderId = '01BYE5RZ5MYLM2SMX75ZBIPQZIHT6OAYPB';
const file = { id: fileId, name: 'report.txt', file: { mimeType: 'text/plain' } };

describe('Microsoft OneDrive - request URLs', () => {
	beforeAll(() => {
		const graph = nock('https://graph.microsoft.com/v1.0/me');

		graph
			.post(`/drive/items/${fileId}/copy`, { parentReference: { id: folderId } })
			.reply(202, '', { location: 'https://graph.microsoft.com/monitor/copy-1' });

		graph.delete(`/drive/items/${fileId}`).reply(204);

		graph
			.get(`/drive/items/${fileId}`)
			.reply(200, file)
			.get(`/drive/items/${fileId}/content`)
			.reply(200, 'hello', { 'content-type': 'text/plain' });

		graph.get(`/drive/items/${fileId}`).reply(200, file);

		graph
			.patch(`/drive/items/${fileId}`, { parentReference: { id: folderId } })
			.reply(200, { ...file, parentReference: { id: folderId } });

		graph
			.patch(`/drive/items/${fileId}`, { name: 'report-final.txt' })
			.reply(200, { ...file, name: 'report-final.txt' });

		graph
			.get("/drive/root/search(q='Q1%20report')")
			.query({ $top: 100 })
			.reply(200, { value: [file] });

		graph
			.post(`/drive/items/${fileId}/createLink`, { type: 'view', scope: 'organization' })
			.reply(200, { id: 'link-1', link: { type: 'view' } });

		graph
			.put(`/drive/items/${folderId}:/notes%20v1.txt:/content`, 'hello')
			.reply(201, { id: '01BYE5RZ3NOTESFILEID0000000000000', name: 'notes v1.txt' });

		graph
			.post('/drive/root/children', { name: 'Reports', folder: {} })
			.reply(201, { id: '01BYE5RZ4REPORTSFOLDERID0000000000', name: 'Reports', folder: {} })
			.post('/drive/items/01BYE5RZ4REPORTSFOLDERID0000000000/children', {
				name: '2026',
				folder: {},
			})
			.reply(201, { id: '01BYE5RZ7ZQ4KXZ2W6KJGZ3ZC2026XYZAB', name: '2026', folder: {} });

		graph.delete(`/drive/items/${folderId}`).reply(204);

		graph
			.get(`/drive/items/${folderId}/children`)
			.query({ $top: 100 })
			.reply(200, { value: [file] });

		graph
			.get("/drive/root/search(q='Reports')")
			.query({ $top: 100 })
			.reply(200, { value: [{ id: folderId, name: 'Reports', folder: {} }] });

		graph
			.post(`/drive/items/${folderId}/createLink`, { type: 'edit', scope: 'anonymous' })
			.reply(200, { id: 'link-2', link: { type: 'edit' } });
	});

	afterAll(() => {
		expect(nock.pendingMocks()).toEqual([]);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requestUrls.workflow.json'],
	});
});
