/* eslint-disable n8n-nodes-base/node-param-display-name-miscased */
import { mock, mockDeep } from 'jest-mock-extended';
import { jsonParse, type ILoadOptionsFunctions, type INode } from 'n8n-workflow';
import nock from 'nock';

import { testWorkflows } from '@test/nodes/Helpers';

import { getLabels } from '../../v1/loadOptions';
import labels from '../fixtures/labels.json';
import messages from '../fixtures/messages.json';

describe('Test Gmail Node v1', () => {
	beforeAll(() => {
		jest
			.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] })
			.setSystemTime(new Date('2024-12-16 12:34:56.789Z'));

		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
		jest.resetAllMocks();
	});

	describe('Messages', () => {
		const gmailNock = nock('https://www.googleapis.com/gmail');

		beforeAll(() => {
			gmailNock.get('/v1/users/me/messages').query({ maxResults: 2 }).reply(200, {
				messages,
			});
			gmailNock
				.get('/v1/users/me/messages')
				.query({
					includeSpamTrash: 'true',
					labelIds: 'CHAT',
					q: 'test from:Test Sender after:1734393600 before:1735171200',
					readStatus: 'both',
					dataPropertyAttachmentsPrefixName: 'attachment_',
					downloadAttachments: 'true',
					maxResults: '2',
				})
				.reply(200, { messages });
			gmailNock
				.get('/v1/users/me/messages/a1b2c3d4e5f6g7h8')
				.query({
					maxResults: '2',
					format: 'metadata',
					metadataHeaders: ['From', 'To', 'Cc', 'Bcc', 'Subject'],
				})
				.reply(200, messages[0]);
			gmailNock
				.get('/v1/users/me/messages/a1b2c3d4e5f6g7h8')
				.query({
					includeSpamTrash: 'true',
					labelIds: 'CHAT',
					q: 'test from:Test Sender after:1734393600 before:1735171200',
					readStatus: 'both',
					dataPropertyAttachmentsPrefixName: 'attachment_',
					downloadAttachments: 'true',
					maxResults: '2',
					format: 'raw',
				})
				.reply(200, {
					...messages[0],
					raw: 'TUlNRS1WZXJzaW9uOiAxLjANCkRhdGU6IEZyaSwgMTMgRGVjIDIwMjQgMTE6MTU6MDEgKzAxMDANCk1lc3NhZ2UtSUQ6IDxDQUVHQVByb3d1ZEduS1h4cXJoTWpPdXhhbVRoN3lBcmp3UDdPRDlVQnEtSnBrYjBYOXdAbWFpbC5nbWFpbC5jb20-DQpTdWJqZWN0OiBUZXN0IGRyYWZ0DQpGcm9tOiBub2RlIHFhIDxub2RlOHFhQGdtYWlsLmNvbT4NClRvOiB0ZXN0QGdtYWlsLmNvbQ0KQ29udGVudC1UeXBlOiBtdWx0aXBhcnQvYWx0ZXJuYXRpdmU7IGJvdW5kYXJ5PSIwMDAwMDAwMDAwMDA5ZDU4YjYwNjI5MjQxYTIyIg0KDQotLTAwMDAwMDAwMDAwMDlkNThiNjA2MjkyNDFhMjINCkNvbnRlbnQtVHlwZTogdGV4dC9wbGFpbjsgY2hhcnNldD0iVVRGLTgiDQoNCmRyYWZ0IGJvZHkNCg0KLS0wMDAwMDAwMDAwMDA5ZDU4YjYwNjI5MjQxYTIyDQpDb250ZW50LVR5cGU6IHRleHQvaHRtbDsgY2hhcnNldD0iVVRGLTgiDQoNCjxkaXYgZGlyPSJsdHIiPmRyYWZ0IGJvZHk8YnI-PC9kaXY-DQoNCi0tMDAwMDAwMDAwMDAwOWQ1OGI2MDYyOTI0MWEyMi0t',
				});
			gmailNock
				.get('/v1/users/me/messages/z9y8x7w6v5u4t3s2')
				.query({
					includeSpamTrash: 'true',
					labelIds: 'CHAT',
					q: 'test from:Test Sender after:1734393600 before:1735171200',
					readStatus: 'both',
					dataPropertyAttachmentsPrefixName: 'attachment_',
					downloadAttachments: 'true',
					maxResults: '2',
					format: 'raw',
				})
				.reply(200, {
					...messages[1],
					raw: 'TUlNRS1WZXJzaW9uOiAxLjANCkRhdGU6IEZyaSwgMTMgRGVjIDIwMjQgMTE6MTU6MDEgKzAxMDANCk1lc3NhZ2UtSUQ6IDxDQUVHQVByb3d1ZEduS1h4cXJoTWpPdXhhbVRoN3lBcmp3UDdPRDlVQnEtSnBrYjBYOXdAbWFpbC5nbWFpbC5jb20-DQpTdWJqZWN0OiBUZXN0IGRyYWZ0DQpGcm9tOiBub2RlIHFhIDxub2RlOHFhQGdtYWlsLmNvbT4NClRvOiB0ZXN0QGdtYWlsLmNvbQ0KQ29udGVudC1UeXBlOiBtdWx0aXBhcnQvYWx0ZXJuYXRpdmU7IGJvdW5kYXJ5PSIwMDAwMDAwMDAwMDA5ZDU4YjYwNjI5MjQxYTIyIg0KDQotLTAwMDAwMDAwMDAwMDlkNThiNjA2MjkyNDFhMjINCkNvbnRlbnQtVHlwZTogdGV4dC9wbGFpbjsgY2hhcnNldD0iVVRGLTgiDQoNCmRyYWZ0IGJvZHkNCg0KLS0wMDAwMDAwMDAwMDA5ZDU4YjYwNjI5MjQxYTIyDQpDb250ZW50LVR5cGU6IHRleHQvaHRtbDsgY2hhcnNldD0iVVRGLTgiDQoNCjxkaXYgZGlyPSJsdHIiPmRyYWZ0IGJvZHk8YnI-PC9kaXY-DQoNCi0tMDAwMDAwMDAwMDAwOWQ1OGI2MDYyOTI0MWEyMi0t',
				});
			gmailNock
				.get('/v1/users/me/messages/z9y8x7w6v5u4t3s2')
				.query({
					maxResults: '2',
					format: 'metadata',
					metadataHeaders: ['From', 'To', 'Cc', 'Bcc', 'Subject'],
				})
				.reply(200, messages[0]);
			gmailNock.get('/v1/users/me/labels').reply(200, {
				labels,
			});
			gmailNock.get('/v1/users/me/profile').times(2).reply(200, { emailAddress: 'test@n8n.io' });
			gmailNock
				.post('/v1/users/me/messages/send')
				.query({ format: 'metadata' })
				.reply(200, messages[0]);
			gmailNock.post('/v1/users/me/messages/send').reply(200, messages[0]);
			gmailNock
				.post('/v1/users/me/messages/send')
				.query({ userId: 'me', uploadType: 'media' })
				.reply(200, messages[0]);
			gmailNock
				.post('/v1/users/me/messages/test/modify', (body) => 'addLabelIds' in body)
				.reply(200, messages[0]);
			gmailNock
				.post('/v1/users/me/messages/test/modify', (body) => 'removeLabelIds' in body)
				.reply(200, messages[0]);
			gmailNock.delete('/v1/users/me/messages/test').reply(200, messages[0]);
			gmailNock
				.get('/v1/users/me/messages/test')
				.query({
					format: 'metadata',
					metadataHeaders: ['From', 'To', 'Cc', 'Bcc', 'Subject'],
				})
				.reply(200, messages[0]);
			gmailNock.get('/v1/users/me/labels').reply(200, { labels });
			gmailNock
				.get('/v1/users/me/messages/test')
				.query({ format: 'raw' })
				.reply(200, { raw: 'test email content' });
			gmailNock
				.post('/v1/users/me/messages/test/modify', { removeLabelIds: ['UNREAD'] })
				.reply(200, messages[0]);
			gmailNock
				.post('/v1/users/me/messages/test/modify', { addLabelIds: ['UNREAD'] })
				.reply(200, messages[0]);
			gmailNock
				.get('/v1/users/me/messages/test')
				.query({
					format: 'metadata',
				})
				.reply(200, messages[0]);
		});

		testWorkflows(['nodes/Google/Gmail/test/v1/messages.workflow.json']);

		it('should make the correct network calls', () => {
			gmailNock.done();
		});
	});

	describe('Labels', () => {
		const gmailNock = nock('https://www.googleapis.com/gmail');

		beforeAll(() => {
			gmailNock
				.post('/v1/users/me/labels', {
					labelListVisibility: 'labelShow',
					messageListVisibility: 'show',
					name: 'Test Label Name',
				})
				.reply(200, labels[0]);
			gmailNock.delete('/v1/users/me/labels/test-label-id').reply(200, labels[0]);
			gmailNock.get('/v1/users/me/labels/test-label-id').reply(200, labels[0]);
			gmailNock.get('/v1/users/me/labels').reply(200, {
				labels,
			});
		});

		testWorkflows(['nodes/Google/Gmail/test/v1/labels.workflow.json']);

		it('should make the correct network calls', () => {
			gmailNock.done();
		});
	});

	describe('Drafts', () => {
		const gmailNock = nock('https://www.googleapis.com/gmail');

		beforeAll(() => {
			gmailNock
				.filteringRequestBody((body) => {
					try {
						const parsedBody = jsonParse<{ message: { raw: string; threadId: string } }>(body);
						const mail = Buffer.from(parsedBody.message.raw, 'base64').toString('utf-8');

						// Remove dynamic fields from mail
						parsedBody.message.raw = Buffer.from(
							mail
								.replace(/boundary=".*"/g, 'boundary="--test-boundary"')
								.replace(/----.*/g, '----test-boundary')
								.replace(/Message-ID:.*/g, 'Message-ID: test-message-id'),
							'utf-8',
						).toString('base64');

						return JSON.stringify(parsedBody);
					} catch (error) {
						return body;
					}
				})
				.post('/v1/users/me/drafts', {
					message: {
						raw: 'Q29udGVudC1UeXBlOiBtdWx0aXBhcnQvbWl4ZWQ7IGJvdW5kYXJ5PSItLXRlc3QtYm91bmRhcnkiDQpGcm9tOiB0ZXN0LWFsaWFzQG44bi5pbw0KVG86IHRlc3QtdG9AbjhuLmlvDQpDYzogdGVzdC1jY0BuOG4uaW8NCkJjYzogdGVzdC1iY2NAbjhuLmlvDQpSZXBseS1UbzogdGVzdC1yZXBseUBuOG4uaW8NClN1YmplY3Q6IFRlc3QgRHJhZnQgU3ViamVjdA0KTWVzc2FnZS1JRDogdGVzdC1tZXNzYWdlLWlkDQpEYXRlOiBNb24sIDE2IERlYyAyMDI0IDEyOjM0OjU2ICswMDAwDQpNSU1FLVZlcnNpb246IDEuMA0KDQotLS0tdGVzdC1ib3VuZGFyeQ0KQ29udGVudC1UeXBlOiB0ZXh0L3BsYWluOyBjaGFyc2V0PXV0Zi04DQpDb250ZW50LVRyYW5zZmVyLUVuY29kaW5nOiA3Yml0DQoNClRlc3QgRHJhZnQgTWVzc2FnZQ0KLS0tLXRlc3QtYm91bmRhcnkNCkNvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvbjsgbmFtZT1maWxlLmpzb24NCkNvbnRlbnQtVHJhbnNmZXItRW5jb2Rpbmc6IGJhc2U2NA0KQ29udGVudC1EaXNwb3NpdGlvbjogYXR0YWNobWVudDsgZmlsZW5hbWU9ZmlsZS5qc29uDQoNClczc2lZbWx1WVhKNUlqcDBjblZsZlYwPQ0KLS0tLXRlc3QtYm91bmRhcnkNCg==',
						threadId: 'test-thread-id',
					},
				})
				.query({ userId: 'me', uploadType: 'media' })
				.reply(200, messages[0]);
			gmailNock.delete('/v1/users/me/drafts/test-draft-id').reply(200, messages[0]);
			gmailNock
				.get('/v1/users/me/drafts/test-draft-id')
				.query({ format: 'raw' })
				.reply(200, {
					message: {
						...messages[0],
						raw: 'TUlNRS1WZXJzaW9uOiAxLjANCkRhdGU6IEZyaSwgMTMgRGVjIDIwMjQgMTE6MTU6MDEgKzAxMDANCk1lc3NhZ2UtSUQ6IDxDQUVHQVByb3d1ZEduS1h4cXJoTWpPdXhhbVRoN3lBcmp3UDdPRDlVQnEtSnBrYjBYOXdAbWFpbC5nbWFpbC5jb20-DQpTdWJqZWN0OiBUZXN0IGRyYWZ0DQpGcm9tOiBub2RlIHFhIDxub2RlOHFhQGdtYWlsLmNvbT4NClRvOiB0ZXN0QGdtYWlsLmNvbQ0KQ29udGVudC1UeXBlOiBtdWx0aXBhcnQvYWx0ZXJuYXRpdmU7IGJvdW5kYXJ5PSIwMDAwMDAwMDAwMDA5ZDU4YjYwNjI5MjQxYTIyIg0KDQotLTAwMDAwMDAwMDAwMDlkNThiNjA2MjkyNDFhMjINCkNvbnRlbnQtVHlwZTogdGV4dC9wbGFpbjsgY2hhcnNldD0iVVRGLTgiDQoNCmRyYWZ0IGJvZHkNCg0KLS0wMDAwMDAwMDAwMDA5ZDU4YjYwNjI5MjQxYTIyDQpDb250ZW50LVR5cGU6IHRleHQvaHRtbDsgY2hhcnNldD0iVVRGLTgiDQoNCjxkaXYgZGlyPSJsdHIiPmRyYWZ0IGJvZHk8YnI-PC9kaXY-DQoNCi0tMDAwMDAwMDAwMDAwOWQ1OGI2MDYyOTI0MWEyMi0t',
					},
				});
			gmailNock
				.get('/v1/users/me/drafts')
				.query({
					dataPropertyAttachmentsPrefixName: 'attachment_',
					downloadAttachments: true,
					includeSpamTrash: true,
					maxResults: 100,
				})
				.reply(200, { drafts: messages });
			gmailNock
				.get('/v1/users/me/drafts/a1b2c3d4e5f6g7h8')
				.query({
					dataPropertyAttachmentsPrefixName: 'attachment_',
					downloadAttachments: true,
					includeSpamTrash: true,
					maxResults: 100,
					format: 'raw',
				})
				.reply(200, {
					message: {
						...messages[0],
						raw: 'TUlNRS1WZXJzaW9uOiAxLjANCkRhdGU6IEZyaSwgMTMgRGVjIDIwMjQgMTE6MTU6MDEgKzAxMDANCk1lc3NhZ2UtSUQ6IDxDQUVHQVByb3d1ZEduS1h4cXJoTWpPdXhhbVRoN3lBcmp3UDdPRDlVQnEtSnBrYjBYOXdAbWFpbC5nbWFpbC5jb20-DQpTdWJqZWN0OiBUZXN0IGRyYWZ0DQpGcm9tOiBub2RlIHFhIDxub2RlOHFhQGdtYWlsLmNvbT4NClRvOiB0ZXN0QGdtYWlsLmNvbQ0KQ29udGVudC1UeXBlOiBtdWx0aXBhcnQvYWx0ZXJuYXRpdmU7IGJvdW5kYXJ5PSIwMDAwMDAwMDAwMDA5ZDU4YjYwNjI5MjQxYTIyIg0KDQotLTAwMDAwMDAwMDAwMDlkNThiNjA2MjkyNDFhMjINCkNvbnRlbnQtVHlwZTogdGV4dC9wbGFpbjsgY2hhcnNldD0iVVRGLTgiDQoNCmRyYWZ0IGJvZHkNCg0KLS0wMDAwMDAwMDAwMDA5ZDU4YjYwNjI5MjQxYTIyDQpDb250ZW50LVR5cGU6IHRleHQvaHRtbDsgY2hhcnNldD0iVVRGLTgiDQoNCjxkaXYgZGlyPSJsdHIiPmRyYWZ0IGJvZHk8YnI-PC9kaXY-DQoNCi0tMDAwMDAwMDAwMDAwOWQ1OGI2MDYyOTI0MWEyMi0t',
					},
				});
			gmailNock
				.get('/v1/users/me/drafts/z9y8x7w6v5u4t3s2')
				.query({
					dataPropertyAttachmentsPrefixName: 'attachment_',
					downloadAttachments: true,
					includeSpamTrash: true,
					maxResults: 100,
					format: 'raw',
				})
				.reply(200, {
					message: {
						...messages[1],
						raw: 'TUlNRS1WZXJzaW9uOiAxLjANCkRhdGU6IEZyaSwgMTMgRGVjIDIwMjQgMTE6MTU6MDEgKzAxMDANCk1lc3NhZ2UtSUQ6IDxDQUVHQVByb3d1ZEduS1h4cXJoTWpPdXhhbVRoN3lBcmp3UDdPRDlVQnEtSnBrYjBYOXdAbWFpbC5nbWFpbC5jb20-DQpTdWJqZWN0OiBUZXN0IGRyYWZ0DQpGcm9tOiBub2RlIHFhIDxub2RlOHFhQGdtYWlsLmNvbT4NClRvOiB0ZXN0QGdtYWlsLmNvbQ0KQ29udGVudC1UeXBlOiBtdWx0aXBhcnQvYWx0ZXJuYXRpdmU7IGJvdW5kYXJ5PSIwMDAwMDAwMDAwMDA5ZDU4YjYwNjI5MjQxYTIyIg0KDQotLTAwMDAwMDAwMDAwMDlkNThiNjA2MjkyNDFhMjINCkNvbnRlbnQtVHlwZTogdGV4dC9wbGFpbjsgY2hhcnNldD0iVVRGLTgiDQoNCmRyYWZ0IGJvZHkNCg0KLS0wMDAwMDAwMDAwMDA5ZDU4YjYwNjI5MjQxYTIyDQpDb250ZW50LVR5cGU6IHRleHQvaHRtbDsgY2hhcnNldD0iVVRGLTgiDQoNCjxkaXYgZGlyPSJsdHIiPmRyYWZ0IGJvZHk8YnI-PC9kaXY-DQoNCi0tMDAwMDAwMDAwMDAwOWQ1OGI2MDYyOTI0MWEyMi0t',
					},
				});
		});

		testWorkflows(['nodes/Google/Gmail/test/v1/drafts.workflow.json']);

		it('should make the correct network calls', () => {
			gmailNock.done();
		});
	});

	describe('loadOptions', () => {
		describe('getLabels', () => {
			it('should return a list of Gmail labels', async () => {
				const loadOptionsFunctions = mockDeep<ILoadOptionsFunctions>({
					getNode: jest.fn(() => mock<INode>()),
					helpers: mock<ILoadOptionsFunctions['helpers']>({
						requestWithAuthentication: jest
							.fn()
							// 2 pages of labels
							.mockImplementationOnce(async () => ({ labels, nextPageToken: 'nextPageToken' }))
							.mockImplementationOnce(async () => ({ labels })),
					}),
				});

				expect(await getLabels.call(loadOptionsFunctions)).toEqual([
					{ name: 'CHAT', value: 'CHAT' },
					{ name: 'CHAT', value: 'CHAT' },
					{ name: 'SENT', value: 'SENT' },
					{ name: 'SENT', value: 'SENT' },
				]);
			});
		});
	});
});
