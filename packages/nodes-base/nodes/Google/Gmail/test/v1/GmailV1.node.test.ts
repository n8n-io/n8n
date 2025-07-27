import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { jsonParse } from 'n8n-workflow';
import nock from 'nock';

import labels from '../fixtures/labels.json';
import messages from '../fixtures/messages.json';

describe('Test Gmail Node v1', () => {
	beforeAll(() => {
		jest
			.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] })
			.setSystemTime(new Date('2024-12-16 12:34:56.789Z'));
	});

	afterAll(() => {
		jest.resetAllMocks();
	});

	describe('Messages', () => {
		const gmailNock = nock('https://www.googleapis.com/gmail');

		beforeAll(() => {
			gmailNock
				.get('/v1/users/me/messages')
				.query({
					includeSpamTrash: 'true',
					dataPropertyAttachmentsPrefixName: 'custom_attachment_',
					maxResults: '2',
				})
				.reply(200, { messages });
			gmailNock
				.get('/v1/users/me/messages/a1b2c3d4e5f6g7h8')
				.query({
					includeSpamTrash: 'true',
					dataPropertyAttachmentsPrefixName: 'custom_attachment_',
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
					dataPropertyAttachmentsPrefixName: 'custom_attachment_',
					maxResults: '2',
					format: 'raw',
				})
				.reply(200, {
					...messages[1],
					raw: 'TUlNRS1WZXJzaW9uOiAxLjANCkRhdGU6IEZyaSwgMTMgRGVjIDIwMjQgMTE6MTU6MDEgKzAxMDANCk1lc3NhZ2UtSUQ6IDxDQUVHQVByb3d1ZEduS1h4cXJoTWpPdXhhbVRoN3lBcmp3UDdPRDlVQnEtSnBrYjBYOXdAbWFpbC5nbWFpbC5jb20-DQpTdWJqZWN0OiBUZXN0IGRyYWZ0DQpGcm9tOiBub2RlIHFhIDxub2RlOHFhQGdtYWlsLmNvbT4NClRvOiB0ZXN0QGdtYWlsLmNvbQ0KQ29udGVudC1UeXBlOiBtdWx0aXBhcnQvYWx0ZXJuYXRpdmU7IGJvdW5kYXJ5PSIwMDAwMDAwMDAwMDA5ZDU4YjYwNjI5MjQxYTIyIg0KDQotLTAwMDAwMDAwMDAwMDlkNThiNjA2MjkyNDFhMjINCkNvbnRlbnQtVHlwZTogdGV4dC9wbGFpbjsgY2hhcnNldD0iVVRGLTgiDQoNCmRyYWZ0IGJvZHkNCg0KLS0wMDAwMDAwMDAwMDA5ZDU4YjYwNjI5MjQxYTIyDQpDb250ZW50LVR5cGU6IHRleHQvaHRtbDsgY2hhcnNldD0iVVRGLTgiDQoNCjxkaXYgZGlyPSJsdHIiPmRyYWZ0IGJvZHk8YnI-PC9kaXY-DQoNCi0tMDAwMDAwMDAwMDAwOWQ1OGI2MDYyOTI0MWEyMi0t',
				});
			gmailNock.delete('/v1/users/me/messages/test').reply(200, messages[0]);
			gmailNock
				.get('/v1/users/me/messages/test')
				.query({ format: 'raw' })
				.reply(200, {
					...messages[1],
					raw: 'TUlNRS1WZXJzaW9uOiAxLjANCkRhdGU6IEZyaSwgMTMgRGVjIDIwMjQgMTE6MTU6MDEgKzAxMDANCk1lc3NhZ2UtSUQ6IDxDQUVHQVByb3d1ZEduS1h4cXJoTWpPdXhhbVRoN3lBcmp3UDdPRDlVQnEtSnBrYjBYOXdAbWFpbC5nbWFpbC5jb20-DQpTdWJqZWN0OiBUZXN0IGRyYWZ0DQpGcm9tOiBub2RlIHFhIDxub2RlOHFhQGdtYWlsLmNvbT4NClRvOiB0ZXN0QGdtYWlsLmNvbQ0KQ29udGVudC1UeXBlOiBtdWx0aXBhcnQvYWx0ZXJuYXRpdmU7IGJvdW5kYXJ5PSIwMDAwMDAwMDAwMDA5ZDU4YjYwNjI5MjQxYTIyIg0KDQotLTAwMDAwMDAwMDAwMDlkNThiNjA2MjkyNDFhMjINCkNvbnRlbnQtVHlwZTogdGV4dC9wbGFpbjsgY2hhcnNldD0iVVRGLTgiDQoNCmRyYWZ0IGJvZHkNCg0KLS0wMDAwMDAwMDAwMDA5ZDU4YjYwNjI5MjQxYTIyDQpDb250ZW50LVR5cGU6IHRleHQvaHRtbDsgY2hhcnNldD0iVVRGLTgiDQoNCjxkaXYgZGlyPSJsdHIiPmRyYWZ0IGJvZHk8YnI-PC9kaXY-DQoNCi0tMDAwMDAwMDAwMDAwOWQ1OGI2MDYyOTI0MWEyMi0t',
				});

			gmailNock
				.post('/v1/users/me/messages/send')
				.query({ userId: 'me', uploadType: 'media' })
				.reply(200, messages[0]);
		});

		afterAll(() => gmailNock.done());

		new NodeTestHarness().setupTests({
			workflowFiles: ['messages.workflow.json'],
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

		afterAll(() => gmailNock.done());

		new NodeTestHarness().setupTests({
			workflowFiles: ['labels.workflow.json'],
		});
	});

	describe('Message Labels', () => {
		const gmailNock = nock('https://www.googleapis.com/gmail');

		beforeAll(() => {
			gmailNock
				.post('/v1/users/me/messages/test/modify', (body) => 'addLabelIds' in body)
				.reply(200, messages[0]);
			gmailNock
				.post('/v1/users/me/messages/test/modify', (body) => 'removeLabelIds' in body)
				.reply(200, messages[0]);
		});

		afterAll(() => gmailNock.done());

		new NodeTestHarness().setupTests({
			workflowFiles: ['message-labels.workflow.json'],
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
						raw: 'Q29udGVudC1UeXBlOiBtdWx0aXBhcnQvbWl4ZWQ7IGJvdW5kYXJ5PSItLXRlc3QtYm91bmRhcnkiDQpDYzogdGVzdF9jY0BuOG4uaW8NCkJjYzogdGVzdF9iY2NAbjhuLmlvDQpTdWJqZWN0OiBUZXN0IFN1YmplY3QNCk1lc3NhZ2UtSUQ6IHRlc3QtbWVzc2FnZS1pZA0KRGF0ZTogTW9uLCAxNiBEZWMgMjAyNCAxMjozNDo1NiArMDAwMA0KTUlNRS1WZXJzaW9uOiAxLjANCg0KLS0tLXRlc3QtYm91bmRhcnkNCkNvbnRlbnQtVHlwZTogdGV4dC9wbGFpbjsgY2hhcnNldD11dGYtOA0KQ29udGVudC1UcmFuc2Zlci1FbmNvZGluZzogN2JpdA0KDQpUZXN0IE1lc3NhZ2UNCi0tLS10ZXN0LWJvdW5kYXJ5DQpDb250ZW50LVR5cGU6IGFwcGxpY2F0aW9uL2pzb247IG5hbWU9ZmlsZS5qc29uDQpDb250ZW50LVRyYW5zZmVyLUVuY29kaW5nOiBiYXNlNjQNCkNvbnRlbnQtRGlzcG9zaXRpb246IGF0dGFjaG1lbnQ7IGZpbGVuYW1lPWZpbGUuanNvbg0KDQpXM3NpWVhSMFlXTm9iV1Z1ZENJNmRISjFaWDFkDQotLS0tdGVzdC1ib3VuZGFyeQ0K',
					},
				})
				.query({ userId: 'me', uploadType: 'media' })
				.reply(200, messages[0]);
			gmailNock.delete('/v1/users/me/drafts/test').reply(200, messages[0]);
			gmailNock
				.get('/v1/users/me/drafts/test')
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
					maxResults: 2,
				})
				.reply(200, { drafts: messages });
			gmailNock
				.get('/v1/users/me/drafts/a1b2c3d4e5f6g7h8')
				.query({
					maxResults: 2,
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
					maxResults: 2,
					format: 'raw',
				})
				.reply(200, {
					message: {
						...messages[1],
						raw: 'TUlNRS1WZXJzaW9uOiAxLjANCkRhdGU6IEZyaSwgMTMgRGVjIDIwMjQgMTE6MTU6MDEgKzAxMDANCk1lc3NhZ2UtSUQ6IDxDQUVHQVByb3d1ZEduS1h4cXJoTWpPdXhhbVRoN3lBcmp3UDdPRDlVQnEtSnBrYjBYOXdAbWFpbC5nbWFpbC5jb20-DQpTdWJqZWN0OiBUZXN0IGRyYWZ0DQpGcm9tOiBub2RlIHFhIDxub2RlOHFhQGdtYWlsLmNvbT4NClRvOiB0ZXN0QGdtYWlsLmNvbQ0KQ29udGVudC1UeXBlOiBtdWx0aXBhcnQvYWx0ZXJuYXRpdmU7IGJvdW5kYXJ5PSIwMDAwMDAwMDAwMDA5ZDU4YjYwNjI5MjQxYTIyIg0KDQotLTAwMDAwMDAwMDAwMDlkNThiNjA2MjkyNDFhMjINCkNvbnRlbnQtVHlwZTogdGV4dC9wbGFpbjsgY2hhcnNldD0iVVRGLTgiDQoNCmRyYWZ0IGJvZHkNCg0KLS0wMDAwMDAwMDAwMDA5ZDU4YjYwNjI5MjQxYTIyDQpDb250ZW50LVR5cGU6IHRleHQvaHRtbDsgY2hhcnNldD0iVVRGLTgiDQoNCjxkaXYgZGlyPSJsdHIiPmRyYWZ0IGJvZHk8YnI-PC9kaXY-DQoNCi0tMDAwMDAwMDAwMDAwOWQ1OGI2MDYyOTI0MWEyMi0t',
					},
				});
		});

		afterAll(() => gmailNock.done());

		new NodeTestHarness().setupTests({
			workflowFiles: ['drafts.workflow.json'],
		});
	});
});
