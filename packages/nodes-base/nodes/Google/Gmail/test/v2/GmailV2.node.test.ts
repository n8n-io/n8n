import nock from 'nock';

import { getWorkflowFilenames, testWorkflows } from '@test/nodes/Helpers';

import labels from './fixtures/labels.json';
import messages from './fixtures/messages.json';

describe('Test Gmail Node v2', () => {
	let nockScopes: nock.Scope[] = [];

	beforeAll(() => {
		nock.disableNetConnect();

		const gmailNock = nock('https://www.googleapis.com/gmail');

		nockScopes = [
			gmailNock.get('/v1/users/me/messages').query({ maxResults: 2 }).reply(200, {
				messages,
			}),
			gmailNock
				.get('/v1/users/me/messages')
				.query({
					includeSpamTrash: 'true',
					labelIds: 'CHAT',
					q: 'test from:Test Sender after:1734390000 before:1735167600',
					readStatus: 'both',
					dataPropertyAttachmentsPrefixName: 'attachment_',
					downloadAttachments: 'true',
					maxResults: '2',
				})
				.reply(200, {
					messages,
				}),
			gmailNock
				.get('/v1/users/me/messages/a1b2c3d4e5f6g7h8')
				.query({
					maxResults: '2',
					format: 'metadata',
					metadataHeaders: ['From', 'To', 'Cc', 'Bcc', 'Subject'],
				})
				.reply(200, messages[0]),
			gmailNock
				.get('/v1/users/me/messages/a1b2c3d4e5f6g7h8')
				.query({
					includeSpamTrash: 'true',
					labelIds: 'CHAT',
					q: 'test from:Test Sender after:1734390000 before:1735167600',
					readStatus: 'both',
					dataPropertyAttachmentsPrefixName: 'attachment_',
					downloadAttachments: 'true',
					maxResults: '2',
					format: 'raw',
				})
				.reply(200, {
					...messages[0],
					raw: 'TUlNRS1WZXJzaW9uOiAxLjANCkRhdGU6IEZyaSwgMTMgRGVjIDIwMjQgMTE6MTU6MDEgKzAxMDANCk1lc3NhZ2UtSUQ6IDxDQUVHQVByb3d1ZEduS1h4cXJoTWpPdXhhbVRoN3lBcmp3UDdPRDlVQnEtSnBrYjBYOXdAbWFpbC5nbWFpbC5jb20-DQpTdWJqZWN0OiBUZXN0IGRyYWZ0DQpGcm9tOiBub2RlIHFhIDxub2RlOHFhQGdtYWlsLmNvbT4NClRvOiB0ZXN0QGdtYWlsLmNvbQ0KQ29udGVudC1UeXBlOiBtdWx0aXBhcnQvYWx0ZXJuYXRpdmU7IGJvdW5kYXJ5PSIwMDAwMDAwMDAwMDA5ZDU4YjYwNjI5MjQxYTIyIg0KDQotLTAwMDAwMDAwMDAwMDlkNThiNjA2MjkyNDFhMjINCkNvbnRlbnQtVHlwZTogdGV4dC9wbGFpbjsgY2hhcnNldD0iVVRGLTgiDQoNCmRyYWZ0IGJvZHkNCg0KLS0wMDAwMDAwMDAwMDA5ZDU4YjYwNjI5MjQxYTIyDQpDb250ZW50LVR5cGU6IHRleHQvaHRtbDsgY2hhcnNldD0iVVRGLTgiDQoNCjxkaXYgZGlyPSJsdHIiPmRyYWZ0IGJvZHk8YnI-PC9kaXY-DQoNCi0tMDAwMDAwMDAwMDAwOWQ1OGI2MDYyOTI0MWEyMi0t',
				}),
			gmailNock
				.get('/v1/users/me/messages/z9y8x7w6v5u4t3s2')
				.query({
					includeSpamTrash: 'true',
					labelIds: 'CHAT',
					q: 'test from:Test Sender after:1734390000 before:1735167600',
					readStatus: 'both',
					dataPropertyAttachmentsPrefixName: 'attachment_',
					downloadAttachments: 'true',
					maxResults: '2',
					format: 'raw',
				})
				.reply(200, {
					...messages[1],
					raw: 'TUlNRS1WZXJzaW9uOiAxLjANCkRhdGU6IEZyaSwgMTMgRGVjIDIwMjQgMTE6MTU6MDEgKzAxMDANCk1lc3NhZ2UtSUQ6IDxDQUVHQVByb3d1ZEduS1h4cXJoTWpPdXhhbVRoN3lBcmp3UDdPRDlVQnEtSnBrYjBYOXdAbWFpbC5nbWFpbC5jb20-DQpTdWJqZWN0OiBUZXN0IGRyYWZ0DQpGcm9tOiBub2RlIHFhIDxub2RlOHFhQGdtYWlsLmNvbT4NClRvOiB0ZXN0QGdtYWlsLmNvbQ0KQ29udGVudC1UeXBlOiBtdWx0aXBhcnQvYWx0ZXJuYXRpdmU7IGJvdW5kYXJ5PSIwMDAwMDAwMDAwMDA5ZDU4YjYwNjI5MjQxYTIyIg0KDQotLTAwMDAwMDAwMDAwMDlkNThiNjA2MjkyNDFhMjINCkNvbnRlbnQtVHlwZTogdGV4dC9wbGFpbjsgY2hhcnNldD0iVVRGLTgiDQoNCmRyYWZ0IGJvZHkNCg0KLS0wMDAwMDAwMDAwMDA5ZDU4YjYwNjI5MjQxYTIyDQpDb250ZW50LVR5cGU6IHRleHQvaHRtbDsgY2hhcnNldD0iVVRGLTgiDQoNCjxkaXYgZGlyPSJsdHIiPmRyYWZ0IGJvZHk8YnI-PC9kaXY-DQoNCi0tMDAwMDAwMDAwMDAwOWQ1OGI2MDYyOTI0MWEyMi0t',
				}),
			gmailNock
				.get('/v1/users/me/messages/z9y8x7w6v5u4t3s2')
				.query({
					maxResults: '2',
					format: 'metadata',
					metadataHeaders: ['From', 'To', 'Cc', 'Bcc', 'Subject'],
				})
				.reply(200, messages[0]),
			gmailNock.get('/v1/users/me/labels').reply(200, {
				labels,
			}),
			gmailNock.get('/v1/users/me/profile').times(2).reply(200, { emailAddress: 'test@n8n.io' }),
			gmailNock
				.post('/v1/users/me/messages/send')
				.query({ format: 'metadata' })
				.reply(200, messages[0]),
			gmailNock.post('/v1/users/me/messages/send').reply(200, messages[0]),
			gmailNock
				.post('/v1/users/me/messages/send')
				.query({ userId: 'me', uploadType: 'media' })
				.reply(200, messages[0]),
			gmailNock
				.post('/v1/users/me/messages/test/modify', (body) => 'addLabelIds' in body)
				.reply(200, messages[0]),
			gmailNock
				.post('/v1/users/me/messages/test/modify', (body) => 'removeLabelIds' in body)
				.reply(200, messages[0]),
			gmailNock.delete('/v1/users/me/messages/test').reply(200, messages[0]),
			gmailNock
				.get('/v1/users/me/messages/test')
				.query({
					format: 'metadata',
					metadataHeaders: ['From', 'To', 'Cc', 'Bcc', 'Subject'],
				})
				.reply(200, messages[0]),
			gmailNock.get('/v1/users/me/labels').reply(200, { labels }),
			gmailNock
				.get('/v1/users/me/messages/test')
				.query({ format: 'raw' })
				.reply(200, { raw: 'test email content' }),
			gmailNock
				.post('/v1/users/me/messages/test/modify', { removeLabelIds: ['UNREAD'] })
				.reply(200, messages[0]),
			gmailNock
				.post('/v1/users/me/messages/test/modify', { addLabelIds: ['UNREAD'] })
				.reply(200, messages[0]),
			gmailNock
				.get('/v1/users/me/messages/test')
				.query({
					format: 'metadata',
				})
				.reply(200, messages[0]),
		];
	});

	afterAll(() => {
		nock.restore();
		jest.resetAllMocks();
	});

	const workflows = getWorkflowFilenames(__dirname);
	testWorkflows(workflows);

	it('should make the correct network calls', () => {
		for (const scope of nockScopes) {
			scope.done();
		}
	});
});
