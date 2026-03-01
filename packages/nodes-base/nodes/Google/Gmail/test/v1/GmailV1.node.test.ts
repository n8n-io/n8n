import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { jsonParse } from 'n8n-workflow';
import nock from 'nock';

import labels from '../fixtures/labels.json';
import messages from '../fixtures/messages.json';

function normalizeDraftMail(mail: string) {
	let normalizedMail = mail.replace(/\r\n/g, '\n');
	normalizedMail = normalizedMail
		.replace(/boundary=\".*\"/g, 'boundary="--test-boundary"')
		.replace(/----.*/g, '----test-boundary')
		.replace(/^From:.*$/gm, '')
		.replace(/Message-ID:.*/g, 'Message-ID: test-message-id');

	const parts = normalizedMail.split(/\n\n/);
	if (parts.length > 1) {
		const headerBlock = parts[0];
		const bodyBlock = parts.slice(1).join('\n\n');
		const headers = headerBlock.split(/\n/).filter(Boolean);
		const map = new Map<string, string>();
		headers.forEach((line) => {
			const idx = line.indexOf(':');
			if (idx > -1) map.set(line.slice(0, idx), line);
		});
		const ordered = ['Content-Type', 'Cc', 'Bcc', 'Subject', 'Message-ID', 'Date', 'MIME-Version']
			.map((k) => map.get(k))
			.filter(Boolean) as string[];
		normalizedMail = `${ordered.join('\n')}\n\n${bodyBlock}`;
	}

	return normalizedMail;
}

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

						const normalizedMail = normalizeDraftMail(mail);
						parsedBody.message.raw = Buffer.from(normalizedMail, 'utf-8').toString('base64');

						return JSON.stringify(parsedBody);
					} catch (error) {
						return body;
					}
				})
				.post('/v1/users/me/drafts', (reqBody) => {
					try {
						const b = typeof reqBody === 'string' ? JSON.parse(reqBody) : reqBody;
						const raw = b?.message?.raw as string;
						if (typeof raw !== 'string') return false;
						const mail = Buffer.from(raw, 'base64').toString('utf-8');
						const normalized = normalizeDraftMail(mail);
						const expectedNormalized = [
							'Content-Type: multipart/mixed; boundary="--test-boundary"',
							'Cc: test_cc@n8n.io',
							'Bcc: test_bcc@n8n.io',
							'Subject: Test Subject',
							'Message-ID: test-message-id',
							'Date: Mon, 16 Dec 2024 12:34:56 +0000',
							'MIME-Version: 1.0',
							'',
							'----test-boundary',
							'Content-Type: text/plain; charset=utf-8',
							'Content-Transfer-Encoding: 7bit',
							'',
							'Test Message',
							'----test-boundary',
							'Content-Type: application/json; name=file.json',
							'Content-Transfer-Encoding: base64',
							'Content-Disposition: attachment; filename=file.json',
							'',
							'W3siYXR0YWNobWVudCI6dHJ1ZX1d',
							'----test-boundary',
						].join('\n');
						// eslint-disable-next-line no-console
						console.log('Normalized (v1) actual:', normalized);
						return normalized.trimEnd() === expectedNormalized.trimEnd();
					} catch {
						return false;
					}
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
