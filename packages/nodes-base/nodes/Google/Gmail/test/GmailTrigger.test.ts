import * as mailparser from 'mailparser';
import type { IDataObject } from 'n8n-workflow';
import nock from 'nock';

import { testPollingTriggerNode } from '@test/nodes/TriggerHelpers';

import { GmailTrigger, MAX_PENDING_FETCH_ATTEMPTS } from '../GmailTrigger.node';
import type { Message, ListMessage, MessageListResponse } from '../types';

vi.mock('mailparser');

describe('GmailTrigger', () => {
	const baseUrl = 'https://www.googleapis.com';

	// The duplicate pre-filter skips fetches for already-seen messages, so not every
	// registered interceptor is consumed — clean up to avoid bleed into the next test.
	afterEach(() => {
		nock.cleanAll();
	});

	function createMessage(message: Partial<Message> = {}): Message {
		const content = Buffer.from('test');
		const contentBase64 = content.toString('base64');
		const size = content.byteLength;

		return {
			historyId: 'testHistoryId',
			id: 'testId',
			internalDate: '1727777957863',
			raw: contentBase64,
			labelIds: ['testLabelId'],
			sizeEstimate: size,
			snippet: content.toString('utf-8'),
			threadId: 'testThreadId',
			payload: {
				body: { attachmentId: 'testAttachmentId', data: contentBase64, size },
				filename: 'foo.txt',
				headers: [{ name: 'testHeader', value: 'testHeaderValue' }],
				mimeType: 'text/plain',
				partId: 'testPartId',
				parts: [],
			},
			...message,
		};
	}

	function createListMessage(message: Partial<ListMessage> = {}): ListMessage {
		return { id: 'testId', threadId: 'testThreadId', ...message };
	}

	beforeAll(() => {
		vi.spyOn(mailparser, 'simpleParser').mockResolvedValue({
			headers: new Map([['headerKey', 'headerValue']]),
			attachments: [],
			headerLines: [{ key: 'headerKey', line: 'headerValue' }],
			html: '<p>test</p>',
			date: new Date('2024-08-31'),
			from: {
				text: 'from@example.com',
				value: [{ name: 'From', address: 'from@example.com' }],
				html: 'from@example.com',
			},
			to: {
				text: 'to@example.com',
				value: [{ name: 'To', address: 'to@example.com' }],
				html: 'to@example.com',
			},
		});
	});

	it('should return incoming emails', async () => {
		const messageListResponse: MessageListResponse = {
			messages: [createListMessage({ id: '1' }), createListMessage({ id: '2' })],
			resultSizeEstimate: 123,
		};
		nock(baseUrl)
			.get('/gmail/v1/users/me/labels')
			.reply(200, { labels: [{ id: 'testLabelId', name: 'Test Label Name' }] });
		nock(baseUrl).get(new RegExp('/gmail/v1/users/me/messages?.*')).reply(200, messageListResponse);
		nock(baseUrl)
			.get(new RegExp('/gmail/v1/users/me/messages/1?.*'))
			.reply(200, createMessage({ id: '1' }));
		nock(baseUrl)
			.get(new RegExp('/gmail/v1/users/me/messages/2?.*'))
			.reply(200, createMessage({ id: '2' }));

		const { response } = await testPollingTriggerNode(GmailTrigger, {});

		expect(response).toEqual([
			[
				{
					json: {
						date: '2024-08-31T00:00:00.000Z',
						from: {
							html: 'from@example.com',
							text: 'from@example.com',
							value: [{ address: 'from@example.com', name: 'From' }],
						},
						headers: { headerKey: 'headerValue' },
						html: '<p>test</p>',
						id: '1',
						labelIds: ['testLabelId'],
						sizeEstimate: 4,
						threadId: 'testThreadId',
						to: {
							html: 'to@example.com',
							text: 'to@example.com',
							value: [{ address: 'to@example.com', name: 'To' }],
						},
					},
				},
				{
					json: {
						date: '2024-08-31T00:00:00.000Z',
						from: {
							html: 'from@example.com',
							text: 'from@example.com',
							value: [{ address: 'from@example.com', name: 'From' }],
						},
						headers: { headerKey: 'headerValue' },
						html: '<p>test</p>',
						id: '2',
						labelIds: ['testLabelId'],
						sizeEstimate: 4,
						threadId: 'testThreadId',
						to: {
							html: 'to@example.com',
							text: 'to@example.com',
							value: [{ address: 'to@example.com', name: 'To' }],
						},
					},
				},
			],
		]);
	});

	it('should simplify output when enabled', async () => {
		const messageListResponse: MessageListResponse = {
			messages: [createListMessage({ id: '1' }), createListMessage({ id: '2' })],
			resultSizeEstimate: 123,
		};
		nock(baseUrl)
			.get('/gmail/v1/users/me/labels')
			.reply(200, { labels: [{ id: 'testLabelId', name: 'Test Label Name' }] });
		nock(baseUrl).get(new RegExp('/gmail/v1/users/me/messages?.*')).reply(200, messageListResponse);
		nock(baseUrl)
			.get(new RegExp('/gmail/v1/users/me/messages/1?.*'))
			.reply(200, createMessage({ id: '1' }));
		nock(baseUrl)
			.get(new RegExp('/gmail/v1/users/me/messages/2?.*'))
			.reply(200, createMessage({ id: '2' }));

		const { response } = await testPollingTriggerNode(GmailTrigger, {
			node: { parameters: { simple: true } },
		});

		expect(response).toEqual([
			[
				{
					json: {
						historyId: 'testHistoryId',
						id: '1',
						internalDate: '1727777957863',
						labels: [{ id: 'testLabelId', name: 'Test Label Name' }],
						payload: {
							body: { attachmentId: 'testAttachmentId', data: 'dGVzdA==', size: 4 },
							filename: 'foo.txt',
							mimeType: 'text/plain',
							partId: 'testPartId',
							parts: [],
						},
						raw: 'dGVzdA==',
						sizeEstimate: 4,
						snippet: 'test',
						testHeader: 'testHeaderValue',
						threadId: 'testThreadId',
					},
				},
				{
					json: {
						historyId: 'testHistoryId',
						id: '2',
						internalDate: '1727777957863',
						labels: [{ id: 'testLabelId', name: 'Test Label Name' }],
						payload: {
							body: { attachmentId: 'testAttachmentId', data: 'dGVzdA==', size: 4 },
							filename: 'foo.txt',
							mimeType: 'text/plain',
							partId: 'testPartId',
							parts: [],
						},
						raw: 'dGVzdA==',
						sizeEstimate: 4,
						snippet: 'test',
						testHeader: 'testHeaderValue',
						threadId: 'testThreadId',
					},
				},
			],
		]);
	});

	it('should filter out emails that were already processed', async () => {
		const messageListResponse: MessageListResponse = {
			messages: [],
			resultSizeEstimate: 0,
		};
		nock(baseUrl)
			.get('/gmail/v1/users/me/labels')
			.reply(200, { labels: [{ id: 'testLabelId', name: 'Test Label Name' }] });
		nock(baseUrl).get(new RegExp('/gmail/v1/users/me/messages?.*')).reply(200, messageListResponse);

		const { response } = await testPollingTriggerNode(GmailTrigger, {
			node: { parameters: { simple: true } },
			workflowStaticData: {
				'Gmail Trigger': { lastTimeChecked: new Date('2024-10-31').getTime() / 1000 },
			},
		});

		expect(response).toEqual(null);
	});

	it('should migrate v1 root-level static data under the node name', async () => {
		const messageListResponse: MessageListResponse = {
			messages: [createListMessage({ id: '1' }), createListMessage({ id: '2' })],
			resultSizeEstimate: 2,
		};
		nock(baseUrl)
			.get('/gmail/v1/users/me/labels')
			.reply(200, { labels: [{ id: 'testLabelId', name: 'Test Label Name' }] });
		nock(baseUrl).get(new RegExp('/gmail/v1/users/me/messages?.*')).reply(200, messageListResponse);
		// Message 1 is a known duplicate from the migrated state and is filtered before fetching
		nock(baseUrl)
			.get(new RegExp('/gmail/v1/users/me/messages/2?.*'))
			.reply(200, createMessage({ id: '2', internalDate: '2000000000000' }));

		// v1 stored state flat at the root instead of keyed by node name
		const workflowStaticData: IDataObject = {
			lastTimeChecked: 1000000,
			possibleDuplicates: ['1'],
		};

		const { response } = await testPollingTriggerNode(GmailTrigger, {
			node: { parameters: { simple: true } },
			workflowStaticData,
		});

		expect(response?.[0]).toHaveLength(1);
		expect(response?.[0]?.[0]?.json?.id).toBe('2');
		expect(workflowStaticData.lastTimeChecked).toBeUndefined();
		expect(workflowStaticData.possibleDuplicates).toBeUndefined();
		expect(workflowStaticData['Gmail Trigger']).toEqual({
			lastTimeChecked: 2000000000,
			possibleDuplicates: ['2'],
			pendingMessageIds: [],
		});
	});

	it('should reject node names that clash with built-in object properties', async () => {
		await expect(
			testPollingTriggerNode(GmailTrigger, {
				node: { name: '__proto__', parameters: { simple: true } },
			}),
		).rejects.toThrow("The node name '__proto__' is reserved, please rename the node");
	});

	it('should migrate and store state as an own property for a node name inherited from Object.prototype', async () => {
		const messageListResponse: MessageListResponse = {
			messages: [createListMessage({ id: '1' })],
			resultSizeEstimate: 1,
		};
		nock(baseUrl)
			.get('/gmail/v1/users/me/labels')
			.reply(200, { labels: [{ id: 'testLabelId', name: 'Test Label Name' }] });
		nock(baseUrl).get(new RegExp('/gmail/v1/users/me/messages?.*')).reply(200, messageListResponse);
		nock(baseUrl)
			.get(new RegExp('/gmail/v1/users/me/messages/1?.*'))
			.reply(200, createMessage({ id: '1', internalDate: '2000000000000' }));

		const workflowStaticData: IDataObject = { lastTimeChecked: 1000000 };

		const { response } = await testPollingTriggerNode(GmailTrigger, {
			node: { name: 'toString', parameters: { simple: true } },
			workflowStaticData,
		});

		expect(response?.[0]).toHaveLength(1);
		expect(workflowStaticData.lastTimeChecked).toBeUndefined();
		expect(Object.hasOwn(workflowStaticData, 'toString')).toBe(true);
		expect(Object.getOwnPropertyDescriptor(workflowStaticData, 'toString')?.value).toEqual({
			lastTimeChecked: 2000000000,
			possibleDuplicates: ['1'],
			pendingMessageIds: [],
		});
		expect(Object.prototype.toString).not.toHaveProperty('lastTimeChecked');
	});

	it('should handle duplicates and different date fields', async () => {
		const messageListResponse: MessageListResponse = {
			messages: [
				createListMessage({ id: '1' }),
				createListMessage({ id: '2' }),
				createListMessage({ id: '3' }),
				createListMessage({ id: '4' }),
				createListMessage({ id: '5' }),
			],
			resultSizeEstimate: 123,
		};

		nock(baseUrl)
			.get('/gmail/v1/users/me/labels')
			.reply(200, { labels: [{ id: 'testLabelId', name: 'Test Label Name' }] });
		nock(baseUrl).get(new RegExp('/gmail/v1/users/me/messages?.*')).reply(200, messageListResponse);
		// Message 1 is a known duplicate and is filtered before fetching
		nock(baseUrl)
			.get(new RegExp('/gmail/v1/users/me/messages/2?.*'))
			.reply(200, createMessage({ id: '2', internalDate: undefined, date: '1727777957863' }));
		nock(baseUrl)
			.get(new RegExp('/gmail/v1/users/me/messages/3?.*'))
			.reply(
				200,
				createMessage({
					id: '3',
					internalDate: undefined,
					date: undefined,
					headers: { date: 'Thu, 5 Dec 2024 08:30:00 -0800' },
				}),
			);
		nock(baseUrl)
			.get(new RegExp('/gmail/v1/users/me/messages/4?.*'))
			.reply(
				200,
				createMessage({
					id: '4',
					internalDate: undefined,
					date: undefined,
					headers: undefined,
				}),
			);
		nock(baseUrl).get(new RegExp('/gmail/v1/users/me/messages/5?.*')).reply(200, {});

		const { response } = await testPollingTriggerNode(GmailTrigger, {
			node: { parameters: { simple: true } },
			workflowStaticData: {
				'Gmail Trigger': {
					lastTimeChecked: new Date('2024-10-31').getTime() / 1000,
					possibleDuplicates: ['1'],
				},
			},
		});

		expect(response).toMatchSnapshot();
	});

	it('should skip DRAFTS when option is set', async () => {
		const messageListResponse: MessageListResponse = {
			messages: [createListMessage({ id: '1' }), createListMessage({ id: '2' })],
			resultSizeEstimate: 2,
		};
		nock(baseUrl)
			.get('/gmail/v1/users/me/labels')
			.reply(200, {
				labels: [
					{ id: 'INBOX', name: 'INBOX' },
					{ id: 'DRAFT', name: 'DRAFT' },
				],
			});
		nock(baseUrl).get(new RegExp('/gmail/v1/users/me/messages?.*')).reply(200, messageListResponse);
		nock(baseUrl)
			.get(new RegExp('/gmail/v1/users/me/messages/1?.*'))
			.reply(200, createMessage({ id: '1', labelIds: ['DRAFT'] }));
		nock(baseUrl)
			.get(new RegExp('/gmail/v1/users/me/messages/2?.*'))
			.reply(200, createMessage({ id: '2', labelIds: ['INBOX'] }));

		const { response } = await testPollingTriggerNode(GmailTrigger, {
			node: { parameters: { filters: { includeDrafts: false } } },
		});

		expect(response).toEqual([
			[
				{
					binary: undefined,
					json: {
						attachements: undefined,
						date: '2024-08-31T00:00:00.000Z',
						from: {
							html: 'from@example.com',
							text: 'from@example.com',
							value: [{ address: 'from@example.com', name: 'From' }],
						},
						headerlines: undefined,
						headers: { headerKey: 'headerValue' },
						html: '<p>test</p>',
						id: '2',
						labelIds: ['INBOX'],
						sizeEstimate: 4,
						threadId: 'testThreadId',
						to: {
							html: 'to@example.com',
							text: 'to@example.com',
							value: [{ address: 'to@example.com', name: 'To' }],
						},
					},
				},
			],
		]);
	});

	it('should skip emails with SENT label', async () => {
		const messageListResponse: MessageListResponse = {
			messages: [createListMessage({ id: '1' }), createListMessage({ id: '2' })],
			resultSizeEstimate: 2,
		};
		nock(baseUrl)
			.get('/gmail/v1/users/me/labels')
			.reply(200, {
				labels: [
					{ id: 'INBOX', name: 'INBOX' },
					{ id: 'SENT', name: 'SENT' },
				],
			});
		nock(baseUrl).get(new RegExp('/gmail/v1/users/me/messages?.*')).reply(200, messageListResponse);
		nock(baseUrl)
			.get(new RegExp('/gmail/v1/users/me/messages/1?.*'))
			.reply(200, createMessage({ id: '1', labelIds: ['INBOX'] }));
		nock(baseUrl)
			.get(new RegExp('/gmail/v1/users/me/messages/2?.*'))
			.reply(200, createMessage({ id: '2', labelIds: ['SENT'] }));

		const { response } = await testPollingTriggerNode(GmailTrigger, {});

		expect(response).toEqual([
			[
				{
					binary: undefined,
					json: {
						attachements: undefined,
						date: '2024-08-31T00:00:00.000Z',
						from: {
							html: 'from@example.com',
							text: 'from@example.com',
							value: [{ address: 'from@example.com', name: 'From' }],
						},
						headerlines: undefined,
						headers: { headerKey: 'headerValue' },
						html: '<p>test</p>',
						id: '1',
						labelIds: ['INBOX'],
						sizeEstimate: 4,
						threadId: 'testThreadId',
						to: {
							html: 'to@example.com',
							text: 'to@example.com',
							value: [{ address: 'to@example.com', name: 'To' }],
						},
					},
				},
			],
		]);
	});

	it('should not skip emails that were sent to own account', async () => {
		const messageListResponse: MessageListResponse = {
			messages: [createListMessage({ id: '1' }), createListMessage({ id: '2' })],
			resultSizeEstimate: 2,
		};
		nock(baseUrl)
			.get('/gmail/v1/users/me/labels')
			.reply(200, {
				labels: [
					{ id: 'INBOX', name: 'INBOX' },
					{ id: 'SENT', name: 'SENT' },
				],
			});
		nock(baseUrl).get(new RegExp('/gmail/v1/users/me/messages?.*')).reply(200, messageListResponse);
		nock(baseUrl)
			.get(new RegExp('/gmail/v1/users/me/messages/1?.*'))
			.reply(200, createMessage({ id: '1', labelIds: ['INBOX', 'SENT'] }));
		nock(baseUrl)
			.get(new RegExp('/gmail/v1/users/me/messages/2?.*'))
			.reply(200, createMessage({ id: '2', labelIds: ['SENT'] }));

		const { response } = await testPollingTriggerNode(GmailTrigger, {});
		expect(response).toEqual([
			[
				{
					binary: undefined,
					json: {
						attachements: undefined,
						date: '2024-08-31T00:00:00.000Z',
						from: {
							html: 'from@example.com',
							text: 'from@example.com',
							value: [{ address: 'from@example.com', name: 'From' }],
						},
						headerlines: undefined,
						headers: { headerKey: 'headerValue' },
						html: '<p>test</p>',
						id: '1',
						labelIds: ['INBOX', 'SENT'],
						sizeEstimate: 4,
						threadId: 'testThreadId',
						to: {
							html: 'to@example.com',
							text: 'to@example.com',
							value: [{ address: 'to@example.com', name: 'To' }],
						},
					},
				},
			],
		]);
	});

	it('should exclude scheduled emails from query', async () => {
		const messageListResponse: MessageListResponse = {
			messages: [createListMessage({ id: '1' })],
			resultSizeEstimate: 1,
		};
		nock(baseUrl)
			.get('/gmail/v1/users/me/labels')
			.reply(200, {
				labels: [
					{ id: 'INBOX', name: 'INBOX' },
					{ id: 'SCHEDULED', name: 'SCHEDULED' },
				],
			});
		nock(baseUrl)
			.get('/gmail/v1/users/me/messages')
			.query((q) => (q.q as string).includes('-in:scheduled'))
			.reply(200, messageListResponse);
		nock(baseUrl)
			.get(new RegExp('/gmail/v1/users/me/messages/1?.*'))
			.reply(200, createMessage({ id: '1', labelIds: ['INBOX'] }));

		const { response } = await testPollingTriggerNode(GmailTrigger, {
			node: { parameters: { simple: true } },
		});

		expect(response).toEqual([[{ json: expect.objectContaining({ id: '1' }) }]]);
	});

	it('should handle multiple emails with the same timestamp', async () => {
		const timestamp = '1727777957000';
		const messageListResponse: MessageListResponse = {
			messages: [
				createListMessage({ id: '1' }),
				createListMessage({ id: '2' }),
				createListMessage({ id: '3' }),
			],
			resultSizeEstimate: 3,
		};
		nock(baseUrl)
			.get('/gmail/v1/users/me/labels')
			.reply(200, { labels: [{ id: 'testLabelId', name: 'Test Label Name' }] });
		nock(baseUrl).get(new RegExp('/gmail/v1/users/me/messages?.*')).reply(200, messageListResponse);
		// Messages 1 and 2 are known duplicates and are filtered before fetching
		nock(baseUrl)
			.get(new RegExp('/gmail/v1/users/me/messages/3?.*'))
			.reply(200, createMessage({ id: '3', internalDate: timestamp }));

		const { response } = await testPollingTriggerNode(GmailTrigger, {
			node: { parameters: { simple: true } },
			workflowStaticData: {
				'Gmail Trigger': {
					lastTimeChecked: Number(timestamp) / 1000,
					possibleDuplicates: ['1', '2'],
				},
			},
		});

		expect(response).toEqual([[{ json: expect.objectContaining({ id: '3' }) }]]);
	});

	it('should not skip emails when no messages are found', async () => {
		const initialTimestamp = 1727777957;
		const emailTimestamp = String((initialTimestamp + 1) * 1000);
		const messageListResponse: MessageListResponse = {
			messages: [createListMessage({ id: '1' })],
			resultSizeEstimate: 1,
		};
		nock(baseUrl)
			.get('/gmail/v1/users/me/labels')
			.reply(200, { labels: [{ id: 'testLabelId', name: 'Test Label Name' }] });
		nock(baseUrl).get(new RegExp('/gmail/v1/users/me/messages?.*')).reply(200, messageListResponse);
		nock(baseUrl)
			.get(new RegExp('/gmail/v1/users/me/messages/1?.*'))
			.reply(200, createMessage({ id: '1', internalDate: emailTimestamp }));

		const { response } = await testPollingTriggerNode(GmailTrigger, {
			node: { parameters: { simple: true } },
			workflowStaticData: {
				'Gmail Trigger': { lastTimeChecked: initialTimestamp },
			},
		});

		expect(response).toEqual([[{ json: expect.objectContaining({ id: '1' }) }]]);
	});

	it('should update timestamp even when all emails are filtered (prevents infinite re-fetch)', async () => {
		const initialTimestamp = 1727777957;
		const draftEmailTimestamp = String((initialTimestamp + 1) * 1000);
		const messageListResponse: MessageListResponse = {
			messages: [createListMessage({ id: 'draft-1' })],
			resultSizeEstimate: 1,
		};
		nock(baseUrl)
			.get('/gmail/v1/users/me/labels')
			.reply(200, {
				labels: [
					{ id: 'INBOX', name: 'INBOX' },
					{ id: 'DRAFT', name: 'DRAFT' },
				],
			});
		nock(baseUrl).get(new RegExp('/gmail/v1/users/me/messages?.*')).reply(200, messageListResponse);
		nock(baseUrl)
			.get(new RegExp('/gmail/v1/users/me/messages/draft-1?.*'))
			.reply(
				200,
				createMessage({ id: 'draft-1', internalDate: draftEmailTimestamp, labelIds: ['DRAFT'] }),
			);

		const { response } = await testPollingTriggerNode(GmailTrigger, {
			node: { parameters: { filters: { includeDrafts: false } } },
			workflowStaticData: {
				'Gmail Trigger': { lastTimeChecked: initialTimestamp },
			},
		});

		expect(response).toBeNull();
	});

	it('should handle emails with invalid dates by using startDate fallback', async () => {
		const initialTimestamp = 1727777957;
		const messageListResponse: MessageListResponse = {
			messages: [createListMessage({ id: '1' })],
			resultSizeEstimate: 1,
		};
		nock(baseUrl)
			.get('/gmail/v1/users/me/labels')
			.reply(200, { labels: [{ id: 'testLabelId', name: 'Test Label Name' }] });
		nock(baseUrl).get(new RegExp('/gmail/v1/users/me/messages?.*')).reply(200, messageListResponse);
		// Email without any date fields - should be treated as invalid
		nock(baseUrl)
			.get(new RegExp('/gmail/v1/users/me/messages/1?.*'))
			.reply(200, createMessage({ id: '1', internalDate: undefined }));

		const { response } = await testPollingTriggerNode(GmailTrigger, {
			node: { parameters: { simple: true } },
			workflowStaticData: {
				'Gmail Trigger': { lastTimeChecked: initialTimestamp },
			},
		});

		// Should still return the email even though it has invalid date
		expect(response).toHaveLength(1);
		expect(response?.[0]?.[0]?.json?.id).toBe('1');
	});

	it('should handle mixed valid and filtered emails with same timestamp', async () => {
		const timestamp = '1727777957000';
		const messageListResponse: MessageListResponse = {
			messages: [
				createListMessage({ id: '1' }),
				createListMessage({ id: '2' }),
				createListMessage({ id: '3' }),
			],
			resultSizeEstimate: 3,
		};
		nock(baseUrl)
			.get('/gmail/v1/users/me/labels')
			.reply(200, {
				labels: [
					{ id: 'INBOX', name: 'INBOX' },
					{ id: 'DRAFT', name: 'DRAFT' },
				],
			});
		nock(baseUrl).get(new RegExp('/gmail/v1/users/me/messages?.*')).reply(200, messageListResponse);
		nock(baseUrl)
			.get(new RegExp('/gmail/v1/users/me/messages/1?.*'))
			.reply(200, createMessage({ id: '1', internalDate: timestamp, labelIds: ['INBOX'] }));
		nock(baseUrl)
			.get(new RegExp('/gmail/v1/users/me/messages/2?.*'))
			.reply(200, createMessage({ id: '2', internalDate: timestamp, labelIds: ['DRAFT'] }));
		nock(baseUrl)
			.get(new RegExp('/gmail/v1/users/me/messages/3?.*'))
			.reply(200, createMessage({ id: '3', internalDate: timestamp, labelIds: ['INBOX'] }));

		const { response } = await testPollingTriggerNode(GmailTrigger, {
			node: { parameters: { filters: { includeDrafts: false } } },
			workflowStaticData: {
				'Gmail Trigger': {
					lastTimeChecked: Number(timestamp) / 1000 - 1,
				},
			},
		});

		// Should return 2 emails (1 and 3), filtering out the draft (2)
		expect(response).toHaveLength(1);
		expect(response?.[0]).toHaveLength(2);
		expect(response?.[0]?.[0]?.json?.id).toBe('1');
		expect(response?.[0]?.[1]?.json?.id).toBe('3');
	});

	describe('maxResults limit', () => {
		it('should fetch only maxResults messages from a larger list', async () => {
			// Gmail list returns 3 IDs, but maxResults=2 so only 2 full messages are fetched
			const messageListResponse: MessageListResponse = {
				messages: [
					createListMessage({ id: '3' }),
					createListMessage({ id: '2' }),
					createListMessage({ id: '1' }),
				],
				resultSizeEstimate: 3,
			};

			nock(baseUrl)
				.get('/gmail/v1/users/me/labels')
				.reply(200, { labels: [{ id: 'testLabelId', name: 'Test Label Name' }] });
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages?.*'))
				.reply(200, messageListResponse);
			// Only first 2 messages are fetched (3 and 2)
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/3?.*'))
				.reply(200, createMessage({ id: '3', internalDate: '3000000000000' }));
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/2?.*'))
				.reply(200, createMessage({ id: '2', internalDate: '2000000000000' }));

			const { response } = await testPollingTriggerNode(GmailTrigger, {
				node: { parameters: { simple: true, maxResults: 2 } },
			});

			expect(response).toHaveLength(1);
			expect(response?.[0]).toHaveLength(2);
			expect(response?.[0]?.[0]?.json?.id).toBe('3');
			expect(response?.[0]?.[1]?.json?.id).toBe('2');
		});

		it('should store pending IDs and advance lastTimeChecked when more messages remain', async () => {
			const initialTimestamp = 1000000;
			const messageListResponse: MessageListResponse = {
				messages: [
					createListMessage({ id: '3' }),
					createListMessage({ id: '2' }),
					createListMessage({ id: '1' }),
				],
				resultSizeEstimate: 3,
			};

			nock(baseUrl)
				.get('/gmail/v1/users/me/labels')
				.reply(200, { labels: [{ id: 'testLabelId', name: 'Test Label Name' }] });
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages?.*'))
				.reply(200, messageListResponse);
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/3?.*'))
				.reply(200, createMessage({ id: '3', internalDate: '3000000000000' }));
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/2?.*'))
				.reply(200, createMessage({ id: '2', internalDate: '2000000000000' }));

			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': { lastTimeChecked: initialTimestamp },
			};

			await testPollingTriggerNode(GmailTrigger, {
				node: { parameters: { simple: true, maxResults: 2 } },
				workflowStaticData,
			});

			// lastTimeChecked advances to the max date of fetched messages
			expect(workflowStaticData['Gmail Trigger'].lastTimeChecked).toBe(3000000000);
			// Remaining unfetched message ID stored as pending
			expect(workflowStaticData['Gmail Trigger'].pendingMessageIds).toEqual(['1']);
		});

		it('should pick up pending messages on subsequent poll', async () => {
			// Simulates poll 2: pending IDs from previous poll are fetched directly,
			// then new messages are listed.
			const newMessageListResponse: MessageListResponse = {
				messages: [],
				resultSizeEstimate: 0,
			};

			nock(baseUrl)
				.get('/gmail/v1/users/me/labels')
				.reply(200, { labels: [{ id: 'testLabelId', name: 'Test Label Name' }] });
			// Pending message fetched by ID
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/1?.*'))
				.reply(200, createMessage({ id: '1', internalDate: '1000000000000' }));
			// Then list for new messages (returns nothing)
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages?.*'))
				.reply(200, newMessageListResponse);

			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': {
					lastTimeChecked: 3000000000,
					pendingMessageIds: ['1'],
				},
			};

			const { response } = await testPollingTriggerNode(GmailTrigger, {
				node: { parameters: { simple: true, maxResults: 2 } },
				workflowStaticData,
			});

			expect(response).toHaveLength(1);
			expect(response?.[0]).toHaveLength(1);
			expect(response?.[0]?.[0]?.json?.id).toBe('1');
			// Pending cleared
			expect(workflowStaticData['Gmail Trigger'].pendingMessageIds).toEqual([]);
			// lastTimeChecked must NOT regress — pending message 1 has an older date (1s)
			// than the already-advanced lastTimeChecked (3s) from poll 1
			expect(workflowStaticData['Gmail Trigger'].lastTimeChecked).toBe(3000000000);
		});

		it('should process pending and new messages in one poll when budget allows', async () => {
			const newMessageListResponse: MessageListResponse = {
				messages: [createListMessage({ id: '4' })],
				resultSizeEstimate: 1,
			};

			nock(baseUrl)
				.get('/gmail/v1/users/me/labels')
				.reply(200, { labels: [{ id: 'testLabelId', name: 'Test Label Name' }] });
			// Pending message fetched by ID
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/1?.*'))
				.reply(200, createMessage({ id: '1', internalDate: '1000000000000' }));
			// New messages listed
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages?.*'))
				.reply(200, newMessageListResponse);
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/4?.*'))
				.reply(200, createMessage({ id: '4', internalDate: '4000000000000' }));

			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': {
					lastTimeChecked: 3000000000,
					pendingMessageIds: ['1'],
				},
			};

			const { response } = await testPollingTriggerNode(GmailTrigger, {
				node: { parameters: { simple: true, maxResults: 5 } },
				workflowStaticData,
			});

			expect(response).toHaveLength(1);
			expect(response?.[0]).toHaveLength(2);
			expect(response?.[0]?.[0]?.json?.id).toBe('1');
			expect(response?.[0]?.[1]?.json?.id).toBe('4');
			// lastTimeChecked advances to newest message
			expect(workflowStaticData['Gmail Trigger'].lastTimeChecked).toBe(4000000000);
			expect(workflowStaticData['Gmail Trigger'].pendingMessageIds).toEqual([]);
		});

		it('should advance lastTimeChecked when all messages fit within limit', async () => {
			const initialTimestamp = 1000000;
			const messageListResponse: MessageListResponse = {
				messages: [createListMessage({ id: '1' })],
				resultSizeEstimate: 1,
			};

			nock(baseUrl)
				.get('/gmail/v1/users/me/labels')
				.reply(200, { labels: [{ id: 'testLabelId', name: 'Test Label Name' }] });
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages?.*'))
				.reply(200, messageListResponse);
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/1?.*'))
				.reply(200, createMessage({ id: '1', internalDate: '2000000000000' }));

			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': { lastTimeChecked: initialTimestamp },
			};

			await testPollingTriggerNode(GmailTrigger, {
				node: { parameters: { simple: true, maxResults: 5 } },
				workflowStaticData,
			});

			// 1 message with maxResults=5, all fetched — advance normally
			expect(workflowStaticData['Gmail Trigger'].lastTimeChecked).toBe(2000000000);
			expect(workflowStaticData['Gmail Trigger'].pendingMessageIds ?? []).toEqual([]);
		});

		it('should not produce duplicates across a 3-poll pending drain cycle', async () => {
			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': { lastTimeChecked: 1000000 },
			};

			// Poll 1: 3 messages arrive, maxResults=2 → fetch 3,2; pending=['1']
			nock(baseUrl)
				.get('/gmail/v1/users/me/labels')
				.reply(200, { labels: [{ id: 'testLabelId', name: 'Test Label Name' }] });
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages?.*'))
				.reply(200, {
					messages: [
						createListMessage({ id: '3' }),
						createListMessage({ id: '2' }),
						createListMessage({ id: '1' }),
					],
					resultSizeEstimate: 3,
				} satisfies MessageListResponse);
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/3?.*'))
				.reply(200, createMessage({ id: '3', internalDate: '3000000000000' }));
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/2?.*'))
				.reply(200, createMessage({ id: '2', internalDate: '2000000000000' }));

			const poll1 = await testPollingTriggerNode(GmailTrigger, {
				node: { parameters: { simple: true, maxResults: 2 } },
				workflowStaticData,
			});

			expect(poll1.response?.[0]).toHaveLength(2);
			expect(poll1.response?.[0]?.[0]?.json?.id).toBe('3');
			expect(poll1.response?.[0]?.[1]?.json?.id).toBe('2');
			expect(workflowStaticData['Gmail Trigger'].pendingMessageIds).toEqual(['1']);

			// Poll 2: drain pending msg 1, no new messages
			nock(baseUrl)
				.get('/gmail/v1/users/me/labels')
				.reply(200, { labels: [{ id: 'testLabelId', name: 'Test Label Name' }] });
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/1?.*'))
				.reply(200, createMessage({ id: '1', internalDate: '1000000000000' }));
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages?.*'))
				.reply(200, { messages: [], resultSizeEstimate: 0 } satisfies MessageListResponse);

			const poll2 = await testPollingTriggerNode(GmailTrigger, {
				node: { parameters: { simple: true, maxResults: 2 } },
				workflowStaticData,
			});

			expect(poll2.response?.[0]).toHaveLength(1);
			expect(poll2.response?.[0]?.[0]?.json?.id).toBe('1');
			expect(workflowStaticData['Gmail Trigger'].lastTimeChecked).toBe(3000000000);

			// Poll 3: Gmail returns msg 3 again (boundary inclusive) → should be filtered
			nock(baseUrl)
				.get('/gmail/v1/users/me/labels')
				.reply(200, { labels: [{ id: 'testLabelId', name: 'Test Label Name' }] });
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages?.*'))
				.reply(200, {
					messages: [createListMessage({ id: '3' })],
					resultSizeEstimate: 1,
				} satisfies MessageListResponse);
			// No fetch mock for msg 3 — it's filtered at ID level by possibleDuplicates

			const poll3 = await testPollingTriggerNode(GmailTrigger, {
				node: { parameters: { simple: true, maxResults: 2 } },
				workflowStaticData,
			});

			// No duplicates — msg 3 was already returned in poll 1
			expect(poll3.response).toBeNull();
		});

		it('should reset possibleDuplicates when lastTimeChecked advances after a merge', async () => {
			// Verifies that the possibleDuplicates merge from pending drain is temporary —
			// once a newer message arrives and advances lastTimeChecked, duplicates reset.
			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': { lastTimeChecked: 1000000 },
			};

			// Poll 1: 3 messages, maxResults=2 → fetch 3,2; pending=['1']
			nock(baseUrl)
				.get('/gmail/v1/users/me/labels')
				.reply(200, { labels: [{ id: 'testLabelId', name: 'Test Label Name' }] });
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages?.*'))
				.reply(200, {
					messages: [
						createListMessage({ id: '3' }),
						createListMessage({ id: '2' }),
						createListMessage({ id: '1' }),
					],
					resultSizeEstimate: 3,
				} satisfies MessageListResponse);
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/3?.*'))
				.reply(200, createMessage({ id: '3', internalDate: '3000000000000' }));
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/2?.*'))
				.reply(200, createMessage({ id: '2', internalDate: '2000000000000' }));

			await testPollingTriggerNode(GmailTrigger, {
				node: { parameters: { simple: true, maxResults: 2 } },
				workflowStaticData,
			});

			// Poll 2: drain pending msg 1, no new messages → merge happens
			nock(baseUrl)
				.get('/gmail/v1/users/me/labels')
				.reply(200, { labels: [{ id: 'testLabelId', name: 'Test Label Name' }] });
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/1?.*'))
				.reply(200, createMessage({ id: '1', internalDate: '1000000000000' }));
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages?.*'))
				.reply(200, { messages: [], resultSizeEstimate: 0 } satisfies MessageListResponse);

			await testPollingTriggerNode(GmailTrigger, {
				node: { parameters: { simple: true, maxResults: 2 } },
				workflowStaticData,
			});

			// After merge: possibleDuplicates should include all three
			expect(workflowStaticData['Gmail Trigger'].possibleDuplicates).toEqual(
				expect.arrayContaining(['1', '2', '3']),
			);

			// Poll 3: new message 4 at a newer timestamp → lastTimeChecked advances
			nock(baseUrl)
				.get('/gmail/v1/users/me/labels')
				.reply(200, { labels: [{ id: 'testLabelId', name: 'Test Label Name' }] });
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages?.*'))
				.reply(200, {
					messages: [createListMessage({ id: '4' })],
					resultSizeEstimate: 1,
				} satisfies MessageListResponse);
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/4?.*'))
				.reply(200, createMessage({ id: '4', internalDate: '5000000000000' }));

			const poll3 = await testPollingTriggerNode(GmailTrigger, {
				node: { parameters: { simple: true, maxResults: 2 } },
				workflowStaticData,
			});

			expect(poll3.response?.[0]).toHaveLength(1);
			expect(poll3.response?.[0]?.[0]?.json?.id).toBe('4');
			// possibleDuplicates reset to only msg 4 — old IDs purged
			expect(workflowStaticData['Gmail Trigger'].possibleDuplicates).toEqual(['4']);
			expect(workflowStaticData['Gmail Trigger'].lastTimeChecked).toBe(5000000000);
		});

		it('should not re-emit a drained pending message when a newer message arrived in the same poll', async () => {
			// Reviewer's scenario from PR #28470:
			//   Poll 1: msgs 1,2,3 exist → fetch [3,2], pending=['1']
			//   Between polls: msg 4 arrives
			//   Poll 2: drain pending 1 + fetch new 4 → output [1,4], pending=[]
			//   Poll 3: no new mail → must be null (msg 1 must NOT reappear)
			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': { lastTimeChecked: 1000000 },
			};

			// Poll 1 — msgs 1,2,3 present, maxResults=2 → keep [3,2], pending=['1']
			nock(baseUrl)
				.get('/gmail/v1/users/me/labels')
				.reply(200, { labels: [{ id: 'testLabelId', name: 'Test Label Name' }] });
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages?.*'))
				.reply(200, {
					messages: [
						createListMessage({ id: '3' }),
						createListMessage({ id: '2' }),
						createListMessage({ id: '1' }),
					],
					resultSizeEstimate: 3,
				} satisfies MessageListResponse);
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/3?.*'))
				.reply(200, createMessage({ id: '3', internalDate: '3000000000000' }));
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/2?.*'))
				.reply(200, createMessage({ id: '2', internalDate: '2000000000000' }));

			const poll1 = await testPollingTriggerNode(GmailTrigger, {
				node: { parameters: { simple: true, maxResults: 2 } },
				workflowStaticData,
			});

			expect(poll1.response?.[0]).toHaveLength(2);
			expect(poll1.response?.[0]?.[0]?.json?.id).toBe('3');
			expect(poll1.response?.[0]?.[1]?.json?.id).toBe('2');
			expect(workflowStaticData['Gmail Trigger'].pendingMessageIds).toEqual(['1']);
			expect(workflowStaticData['Gmail Trigger'].lastTimeChecked).toBe(3000000000);

			// Poll 2 — drain pending 1, list also returns new msg 4 (+ msg 3 at inclusive boundary)
			nock(baseUrl)
				.get('/gmail/v1/users/me/labels')
				.reply(200, { labels: [{ id: 'testLabelId', name: 'Test Label Name' }] });
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/1?.*'))
				.reply(200, createMessage({ id: '1', internalDate: '1000000000000' }));
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages?.*'))
				.reply(200, {
					messages: [createListMessage({ id: '4' }), createListMessage({ id: '3' })],
					resultSizeEstimate: 2,
				} satisfies MessageListResponse);
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/4?.*'))
				.reply(200, createMessage({ id: '4', internalDate: '4000000000000' }));

			const poll2 = await testPollingTriggerNode(GmailTrigger, {
				node: { parameters: { simple: true, maxResults: 2 } },
				workflowStaticData,
			});

			expect(poll2.response?.[0]).toHaveLength(2);
			expect(poll2.response?.[0]?.[0]?.json?.id).toBe('1');
			expect(poll2.response?.[0]?.[1]?.json?.id).toBe('4');
			expect(workflowStaticData['Gmail Trigger'].pendingMessageIds ?? []).toEqual([]);
			expect(workflowStaticData['Gmail Trigger'].lastTimeChecked).toBe(4000000000);

			// Poll 3 — no new mail; Gmail returns msg 4 again (inclusive boundary)
			// Intentionally NO fetch mock for msg 1 — if code re-fetches it,
			// nock will throw an unmatched-request error, pinpointing the bug.
			nock(baseUrl)
				.get('/gmail/v1/users/me/labels')
				.reply(200, { labels: [{ id: 'testLabelId', name: 'Test Label Name' }] });
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages?.*'))
				.reply(200, {
					messages: [createListMessage({ id: '4' })],
					resultSizeEstimate: 1,
				} satisfies MessageListResponse);

			const poll3 = await testPollingTriggerNode(GmailTrigger, {
				node: { parameters: { simple: true, maxResults: 2 } },
				workflowStaticData,
			});

			expect(poll3.response).toBeNull();
			expect(workflowStaticData['Gmail Trigger'].lastTimeChecked).toBe(4000000000);
		});

		it('should not re-emit a drained pending message when a newer message arrived in the same poll (simple=false)', async () => {
			// Same reviewer scenario as above, but with simple=false (raw format).
			// parseRawEmail path + mailparser may produce a different output shape,
			// but the dedupe state machine should still prevent re-emitting msg 1 on poll 3.
			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': { lastTimeChecked: 1000000 },
			};

			// Poll 1
			nock(baseUrl)
				.get('/gmail/v1/users/me/labels')
				.reply(200, { labels: [{ id: 'testLabelId', name: 'Test Label Name' }] });
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages?.*'))
				.reply(200, {
					messages: [
						createListMessage({ id: '3' }),
						createListMessage({ id: '2' }),
						createListMessage({ id: '1' }),
					],
					resultSizeEstimate: 3,
				} satisfies MessageListResponse);
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/3?.*'))
				.reply(200, createMessage({ id: '3', internalDate: '3000000000000' }));
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/2?.*'))
				.reply(200, createMessage({ id: '2', internalDate: '2000000000000' }));

			const poll1 = await testPollingTriggerNode(GmailTrigger, {
				node: { parameters: { simple: false, maxResults: 2 } },
				workflowStaticData,
			});

			expect(poll1.response?.[0]).toHaveLength(2);
			expect(poll1.response?.[0]?.[0]?.json?.id).toBe('3');
			expect(poll1.response?.[0]?.[1]?.json?.id).toBe('2');
			expect(workflowStaticData['Gmail Trigger'].pendingMessageIds).toEqual(['1']);
			expect(workflowStaticData['Gmail Trigger'].lastTimeChecked).toBe(3000000000);

			// Poll 2 — drain pending 1 + new msg 4 (list also returns msg 3 at boundary)
			nock(baseUrl)
				.get('/gmail/v1/users/me/labels')
				.reply(200, { labels: [{ id: 'testLabelId', name: 'Test Label Name' }] });
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/1?.*'))
				.reply(200, createMessage({ id: '1', internalDate: '1000000000000' }));
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages?.*'))
				.reply(200, {
					messages: [createListMessage({ id: '4' }), createListMessage({ id: '3' })],
					resultSizeEstimate: 2,
				} satisfies MessageListResponse);
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/4?.*'))
				.reply(200, createMessage({ id: '4', internalDate: '4000000000000' }));

			const poll2 = await testPollingTriggerNode(GmailTrigger, {
				node: { parameters: { simple: false, maxResults: 2 } },
				workflowStaticData,
			});

			expect(poll2.response?.[0]).toHaveLength(2);
			expect(poll2.response?.[0]?.[0]?.json?.id).toBe('1');
			expect(poll2.response?.[0]?.[1]?.json?.id).toBe('4');
			expect(workflowStaticData['Gmail Trigger'].pendingMessageIds ?? []).toEqual([]);
			expect(workflowStaticData['Gmail Trigger'].lastTimeChecked).toBe(4000000000);

			// Poll 3 — no new mail; deliberately no /messages/1 fetch mock
			nock(baseUrl)
				.get('/gmail/v1/users/me/labels')
				.reply(200, { labels: [{ id: 'testLabelId', name: 'Test Label Name' }] });
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages?.*'))
				.reply(200, {
					messages: [createListMessage({ id: '4' })],
					resultSizeEstimate: 1,
				} satisfies MessageListResponse);

			const poll3 = await testPollingTriggerNode(GmailTrigger, {
				node: { parameters: { simple: false, maxResults: 2 } },
				workflowStaticData,
			});

			expect(poll3.response).toBeNull();
			expect(workflowStaticData['Gmail Trigger'].lastTimeChecked).toBe(4000000000);
		});

		it('should handle same-timestamp messages split across pending boundary', async () => {
			// 3 messages all at t=3000s, maxResults=2 → fetch 2, pending 1.
			// After drain, all 3 should be in possibleDuplicates.
			const ts = '3000000000000';
			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': { lastTimeChecked: 1000000 },
			};

			// Poll 1: fetch msgs A and B, pending=['C']
			nock(baseUrl)
				.get('/gmail/v1/users/me/labels')
				.reply(200, { labels: [{ id: 'testLabelId', name: 'Test Label Name' }] });
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages?.*'))
				.reply(200, {
					messages: [
						createListMessage({ id: 'A' }),
						createListMessage({ id: 'B' }),
						createListMessage({ id: 'C' }),
					],
					resultSizeEstimate: 3,
				} satisfies MessageListResponse);
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/A?.*'))
				.reply(200, createMessage({ id: 'A', internalDate: ts }));
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/B?.*'))
				.reply(200, createMessage({ id: 'B', internalDate: ts }));

			await testPollingTriggerNode(GmailTrigger, {
				node: { parameters: { simple: true, maxResults: 2 } },
				workflowStaticData,
			});

			expect(workflowStaticData['Gmail Trigger'].possibleDuplicates).toEqual(
				expect.arrayContaining(['A', 'B']),
			);

			// Poll 2: drain pending C, no new messages
			nock(baseUrl)
				.get('/gmail/v1/users/me/labels')
				.reply(200, { labels: [{ id: 'testLabelId', name: 'Test Label Name' }] });
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/C?.*'))
				.reply(200, createMessage({ id: 'C', internalDate: ts }));
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages?.*'))
				.reply(200, { messages: [], resultSizeEstimate: 0 } satisfies MessageListResponse);

			const poll2 = await testPollingTriggerNode(GmailTrigger, {
				node: { parameters: { simple: true, maxResults: 2 } },
				workflowStaticData,
			});

			expect(poll2.response?.[0]).toHaveLength(1);
			expect(poll2.response?.[0]?.[0]?.json?.id).toBe('C');
			// All three same-timestamp messages tracked as possible duplicates
			expect(workflowStaticData['Gmail Trigger'].possibleDuplicates).toEqual(
				expect.arrayContaining(['A', 'B', 'C']),
			);
			expect(workflowStaticData['Gmail Trigger'].lastTimeChecked).toBe(3000000000);
		});

		it('should advance lastTimeChecked when all fetched messages are filtered as drafts', async () => {
			const initialTimestamp = 1000000;
			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': { lastTimeChecked: initialTimestamp },
			};

			nock(baseUrl)
				.get('/gmail/v1/users/me/labels')
				.reply(200, { labels: [{ id: 'DRAFT', name: 'DRAFT' }] });
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages?.*'))
				.reply(200, {
					messages: [createListMessage({ id: '1' }), createListMessage({ id: '2' })],
					resultSizeEstimate: 2,
				} satisfies MessageListResponse);
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/1?.*'))
				.reply(200, createMessage({ id: '1', internalDate: '5000000000000', labelIds: ['DRAFT'] }));
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/2?.*'))
				.reply(200, createMessage({ id: '2', internalDate: '4000000000000', labelIds: ['DRAFT'] }));

			const { response } = await testPollingTriggerNode(GmailTrigger, {
				node: {
					parameters: { simple: true, maxResults: 5, filters: { includeDrafts: false } },
				},
				workflowStaticData,
			});

			// No output — both messages are drafts
			expect(response).toBeNull();
			// But lastTimeChecked still advances (prevents infinite re-fetch)
			expect(workflowStaticData['Gmail Trigger'].lastTimeChecked).toBe(5000000000);
		});

		it('should pick up new messages in the same poll after draining pending', async () => {
			// Poll 1: 5 messages, maxResults=2 → fetch [5,4], pending=[3,2,1]
			// Poll 2: drain [3,2], pending=[1], early return (budget exhausted)
			// Poll 3: drain [1], budget left=1, list returns new msg 6 → fetch it
			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': { lastTimeChecked: 1000000 },
			};

			// Poll 1
			nock(baseUrl)
				.get('/gmail/v1/users/me/labels')
				.reply(200, { labels: [{ id: 'testLabelId', name: 'Test Label Name' }] });
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages?.*'))
				.reply(200, {
					messages: [
						createListMessage({ id: '5' }),
						createListMessage({ id: '4' }),
						createListMessage({ id: '3' }),
						createListMessage({ id: '2' }),
						createListMessage({ id: '1' }),
					],
					resultSizeEstimate: 5,
				} satisfies MessageListResponse);
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/5?.*'))
				.reply(200, createMessage({ id: '5', internalDate: '5000000000000' }));
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/4?.*'))
				.reply(200, createMessage({ id: '4', internalDate: '4000000000000' }));

			await testPollingTriggerNode(GmailTrigger, {
				node: { parameters: { simple: true, maxResults: 2 } },
				workflowStaticData,
			});

			expect(workflowStaticData['Gmail Trigger'].pendingMessageIds).toEqual(['3', '2', '1']);

			// Poll 2: drain [3,2], budget exhausted, pending=[1], early return
			nock(baseUrl)
				.get('/gmail/v1/users/me/labels')
				.reply(200, { labels: [{ id: 'testLabelId', name: 'Test Label Name' }] });
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/3?.*'))
				.reply(200, createMessage({ id: '3', internalDate: '3000000000000' }));
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/2?.*'))
				.reply(200, createMessage({ id: '2', internalDate: '2000000000000' }));

			const poll2 = await testPollingTriggerNode(GmailTrigger, {
				node: { parameters: { simple: true, maxResults: 2 } },
				workflowStaticData,
			});

			expect(poll2.response?.[0]).toHaveLength(2);
			expect(workflowStaticData['Gmail Trigger'].pendingMessageIds).toEqual(['1']);

			// Poll 3: drain [1] (budget=2, uses 1), then list returns new msg 6
			nock(baseUrl)
				.get('/gmail/v1/users/me/labels')
				.reply(200, { labels: [{ id: 'testLabelId', name: 'Test Label Name' }] });
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/1?.*'))
				.reply(200, createMessage({ id: '1', internalDate: '1000000000000' }));
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages?.*'))
				.reply(200, {
					messages: [createListMessage({ id: '6' })],
					resultSizeEstimate: 1,
				} satisfies MessageListResponse);
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/6?.*'))
				.reply(200, createMessage({ id: '6', internalDate: '6000000000000' }));

			const poll3 = await testPollingTriggerNode(GmailTrigger, {
				node: { parameters: { simple: true, maxResults: 2 } },
				workflowStaticData,
			});

			// Both pending msg 1 and new msg 6 returned in one poll
			expect(poll3.response?.[0]).toHaveLength(2);
			expect(poll3.response?.[0]?.[0]?.json?.id).toBe('1');
			expect(poll3.response?.[0]?.[1]?.json?.id).toBe('6');
			expect(workflowStaticData['Gmail Trigger'].lastTimeChecked).toBe(6000000000);
			expect(workflowStaticData['Gmail Trigger'].pendingMessageIds).toEqual([]);
		});

		it('should early-return when budget is fully consumed by pending messages', async () => {
			// maxResults=2, pending has 3 IDs → fetch 2, keep 1 pending, no scan
			nock(baseUrl)
				.get('/gmail/v1/users/me/labels')
				.reply(200, { labels: [{ id: 'testLabelId', name: 'Test Label Name' }] });
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/A?.*'))
				.reply(200, createMessage({ id: 'A', internalDate: '1000000000000' }));
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/B?.*'))
				.reply(200, createMessage({ id: 'B', internalDate: '2000000000000' }));
			// No list mock — scan should NOT happen because budget is exhausted

			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': {
					lastTimeChecked: 5000000000,
					pendingMessageIds: ['A', 'B', 'C'],
					possibleDuplicates: ['X', 'Y'],
				},
			};

			const { response } = await testPollingTriggerNode(GmailTrigger, {
				node: { parameters: { simple: true, maxResults: 2 } },
				workflowStaticData,
			});

			expect(response?.[0]).toHaveLength(2);
			expect(response?.[0]?.[0]?.json?.id).toBe('A');
			expect(response?.[0]?.[1]?.json?.id).toBe('B');
			// This path returns before the end of poll(), so it needs its own
			// simplify step — raw labelIds here would mean unsimplified output.
			expect(response?.[0]?.[0]?.json.labels).toEqual([
				{ id: 'testLabelId', name: 'Test Label Name' },
			]);
			// One pending ID remains
			expect(workflowStaticData['Gmail Trigger'].pendingMessageIds).toEqual(['C']);
			// possibleDuplicates includes the pre-existing entries plus drained IDs so
			// the next poll's boundary-inclusive `after:` list can't re-queue A or B.
			expect(workflowStaticData['Gmail Trigger'].possibleDuplicates).toEqual(['X', 'Y', 'A', 'B']);
			expect(workflowStaticData['Gmail Trigger'].lastTimeChecked).toBe(5000000000);
		});

		it('should not re-overflow a drained pending message sharing a same-second boundary', async () => {
			// Reproduces Roman's duplicate-emission observation when messages sent in
			// rapid succession share an integer-second floor.
			//
			// Setup: emails 1, 2, 3 all arrive within the same floor-second
			// (e.g. 3000000000.050s / .100s / .500s), maxResults=2.
			//
			// Poll 1: list [3,2,1] → emit [3,2], pending=['1'], lastTimeChecked=3000000000.
			// Poll 2: drain '1', then list after:3000000000 is boundary-inclusive and
			//   returns [4,3,2,1]. The pre-fetch filter only
			//   knows about possibleDuplicates={3,2}, so '1' falls through to overflow
			//   and is re-added to pendingMessageIds — even though '1' was just drained.
			// Poll 3 would then drain '1' again → the observed duplicate.
			//
			// The critical assertion is AFTER poll 2: pendingMessageIds must not contain
			// a message we already emitted this poll.
			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': { lastTimeChecked: 1000000 },
			};

			// --- Poll 1: msgs 1/2/3 all in same integer-second ---
			nock(baseUrl)
				.get('/gmail/v1/users/me/labels')
				.reply(200, { labels: [{ id: 'testLabelId', name: 'Test Label Name' }] });
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages?.*'))
				.reply(200, {
					messages: [
						createListMessage({ id: '3' }),
						createListMessage({ id: '2' }),
						createListMessage({ id: '1' }),
					],
					resultSizeEstimate: 3,
				} satisfies MessageListResponse);
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/3?.*'))
				.reply(200, createMessage({ id: '3', internalDate: '3000000000500' }));
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/2?.*'))
				.reply(200, createMessage({ id: '2', internalDate: '3000000000100' }));

			const poll1 = await testPollingTriggerNode(GmailTrigger, {
				node: { parameters: { simple: true, maxResults: 2 } },
				workflowStaticData,
			});
			expect(poll1.response?.[0]).toHaveLength(2);
			expect(workflowStaticData['Gmail Trigger'].pendingMessageIds).toEqual(['1']);
			expect(workflowStaticData['Gmail Trigger'].lastTimeChecked).toBe(3000000000);

			// --- Poll 2: msg 4 arrives, drain '1' + list returns all 4 at boundary ---
			nock(baseUrl)
				.get('/gmail/v1/users/me/labels')
				.reply(200, { labels: [{ id: 'testLabelId', name: 'Test Label Name' }] });
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/1?.*'))
				.reply(200, createMessage({ id: '1', internalDate: '3000000000050' }));
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages?.*'))
				.reply(200, {
					// Gmail's `after:3000000000` is inclusive at the second boundary, so all
					// three same-second msgs come back alongside the new msg 4.
					messages: [
						createListMessage({ id: '4' }),
						createListMessage({ id: '3' }),
						createListMessage({ id: '2' }),
						createListMessage({ id: '1' }),
					],
					resultSizeEstimate: 4,
				} satisfies MessageListResponse);
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/4?.*'))
				.reply(200, createMessage({ id: '4', internalDate: '4000000000000' }));

			const poll2 = await testPollingTriggerNode(GmailTrigger, {
				node: { parameters: { simple: true, maxResults: 2 } },
				workflowStaticData,
			});

			expect(poll2.response?.[0]).toHaveLength(2);
			const poll2Ids = (poll2.response?.[0] ?? []).map((item) => item.json?.id);
			expect(poll2Ids).toEqual(['1', '4']);
			// Msg 1 was just drained this poll — it must not be queued again as pending.
			// The pre-fetch filter must include IDs drained during the current poll.
			expect(workflowStaticData['Gmail Trigger'].pendingMessageIds ?? []).toEqual([]);
			expect(workflowStaticData['Gmail Trigger'].lastTimeChecked).toBe(4000000000);
		});

		it('should not re-emit pending messages drained during an early-return poll', async () => {
			// Alternative failure path: with maxResults=1 and several same-second msgs,
			// poll 2 takes the early return because the queue is still non-empty. That
			// path skips the state update at the end of poll(), so
			// possibleDuplicates never records emails drained in poll 2. Poll 3's list
			// call then finds those same-second emails unchanged in possibleDuplicates
			// and they get re-queued as pending — causing duplicate emission later.
			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': { lastTimeChecked: 1000000 },
			};

			// --- Poll 1: emit '3', pending=['2','1'] ---
			nock(baseUrl)
				.get('/gmail/v1/users/me/labels')
				.reply(200, { labels: [{ id: 'testLabelId', name: 'Test Label Name' }] });
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages?.*'))
				.reply(200, {
					messages: [
						createListMessage({ id: '3' }),
						createListMessage({ id: '2' }),
						createListMessage({ id: '1' }),
					],
					resultSizeEstimate: 3,
				} satisfies MessageListResponse);
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/3?.*'))
				.reply(200, createMessage({ id: '3', internalDate: '3000000000500' }));

			const poll1 = await testPollingTriggerNode(GmailTrigger, {
				node: { parameters: { simple: true, maxResults: 1 } },
				workflowStaticData,
			});
			expect(poll1.response?.[0]).toHaveLength(1);
			expect(workflowStaticData['Gmail Trigger'].pendingMessageIds).toEqual(['2', '1']);
			expect(workflowStaticData['Gmail Trigger'].lastTimeChecked).toBe(3000000000);

			// --- Poll 2: drain '2', pending=['1'] still non-empty → early return ---
			nock(baseUrl)
				.get('/gmail/v1/users/me/labels')
				.reply(200, { labels: [{ id: 'testLabelId', name: 'Test Label Name' }] });
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/2?.*'))
				.reply(200, createMessage({ id: '2', internalDate: '3000000000100' }));

			const poll2 = await testPollingTriggerNode(GmailTrigger, {
				node: { parameters: { simple: true, maxResults: 1 } },
				workflowStaticData,
			});
			expect(poll2.response?.[0]).toHaveLength(1);
			expect(poll2.response?.[0]?.[0]?.json?.id).toBe('2');
			expect(workflowStaticData['Gmail Trigger'].pendingMessageIds).toEqual(['1']);

			// --- Poll 3: drain '1', pending=[], then list after:3000000000 boundary-returns
			// all 3 same-second msgs. Pre-fetch filter knows only {3}. Msgs [2,1] remain.
			// Budget=0 → messagesToProcess=[], but pendingMessageIds=['2','1'] (BUG: '2'
			// was already emitted in poll 2, and '1' was just drained this poll).
			nock(baseUrl)
				.get('/gmail/v1/users/me/labels')
				.reply(200, { labels: [{ id: 'testLabelId', name: 'Test Label Name' }] });
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/1?.*'))
				.reply(200, createMessage({ id: '1', internalDate: '3000000000050' }));
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages?.*'))
				.reply(200, {
					messages: [
						createListMessage({ id: '3' }),
						createListMessage({ id: '2' }),
						createListMessage({ id: '1' }),
					],
					resultSizeEstimate: 3,
				} satisfies MessageListResponse);

			const poll3 = await testPollingTriggerNode(GmailTrigger, {
				node: { parameters: { simple: true, maxResults: 1 } },
				workflowStaticData,
			});
			expect(poll3.response?.[0]).toHaveLength(1);
			expect(poll3.response?.[0]?.[0]?.json?.id).toBe('1');

			// After poll 3, pendingMessageIds must not contain IDs already emitted:
			// '2' was emitted in poll 2 and '1' in this poll.
			const pending = (workflowStaticData['Gmail Trigger'].pendingMessageIds ?? []) as string[];
			expect(pending).not.toContain('2');
			expect(pending).not.toContain('1');
		});

		it('should not apply limit in manual mode', async () => {
			const messageListResponse: MessageListResponse = {
				messages: [createListMessage({ id: '1' })],
				resultSizeEstimate: 1,
			};

			nock(baseUrl)
				.get('/gmail/v1/users/me/labels')
				.reply(200, { labels: [{ id: 'testLabelId', name: 'Test Label Name' }] });
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages?.*'))
				.reply(200, messageListResponse);
			nock(baseUrl)
				.get(new RegExp('/gmail/v1/users/me/messages/1?.*'))
				.reply(200, createMessage({ id: '1' }));

			const { response } = await testPollingTriggerNode(GmailTrigger, {
				mode: 'manual',
				node: { parameters: { simple: true, maxResults: 2 } },
			});

			expect(response).toHaveLength(1);
			expect(response?.[0]?.[0]?.json?.id).toBe('1');
		});
	});

	describe('v1.4 - backlog scan, drain and retry', () => {
		// Contract under test: the scan follows nextPageToken up to MAX_SCAN_PAGES.
		// lastTimeChecked advances when the scan exhausted the token, or when a
		// give-up valve fires: no progress past the cap, or MAX_TRACKED_BACKLOG_IDS
		// ids already stored. Otherwise the cursor holds, so mail the poll never
		// scanned stays reachable.
		const listPage = (ids: string[], nextPageToken?: string): MessageListResponse => ({
			messages: ids.map((id) => createListMessage({ id })),
			resultSizeEstimate: ids.length,
			...(nextPageToken ? { nextPageToken } : {}),
		});

		const mockLabels = () =>
			nock(baseUrl)
				.get('/gmail/v1/users/me/labels')
				.reply(200, { labels: [{ id: 'testLabelId', name: 'Test Label Name' }] });

		const mockList = (page: MessageListResponse, expectedPageToken?: string) =>
			nock(baseUrl)
				.get('/gmail/v1/users/me/messages')
				.query((q) =>
					expectedPageToken === undefined
						? q.pageToken === undefined
						: q.pageToken === expectedPageToken,
				)
				.reply(200, page);

		const mockGet = (id: string, internalDateMs: number) =>
			nock(baseUrl)
				.get(`/gmail/v1/users/me/messages/${id}`)
				.query(true)
				.reply(200, createMessage({ id, internalDate: String(internalDateMs) }));

		const mockGetError = (id: string) =>
			nock(baseUrl)
				.get(`/gmail/v1/users/me/messages/${id}`)
				.query(true)
				.reply(500, { error: 'transient' });

		// Several tests here prove a request did NOT happen, so their unconsumed
		// interceptors must not leak into the next test's requests.
		afterEach(() => {
			nock.cleanAll();
		});

		it('should follow nextPageToken and deliver messages from all pages', async () => {
			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': { lastTimeChecked: 1000000 },
			};

			mockLabels();
			mockList(listPage(['6', '5', '4'], 'token-1'));
			mockList(listPage(['3', '2', '1']), 'token-1');
			mockGet('6', 6_000_000_000_000);
			mockGet('5', 5_000_000_000_000);
			mockGet('4', 4_000_000_000_000);
			mockGet('3', 3_000_000_000_000);
			mockGet('2', 2_000_000_000_000);
			mockGet('1', 1_000_000_000_000);

			const { response } = await testPollingTriggerNode(GmailTrigger, {
				node: { typeVersion: 1.4, parameters: { simple: true, maxResults: 10 } },
				workflowStaticData,
			});

			expect(response?.[0]).toHaveLength(6);
			expect(response?.[0]?.map((item) => item.json.id)).toEqual(['6', '5', '4', '3', '2', '1']);
			expect(workflowStaticData['Gmail Trigger'].lastTimeChecked).toBe(6_000_000_000);
			expect(workflowStaticData['Gmail Trigger'].pendingMessageIds ?? []).toEqual([]);
		});

		it('should park later pages as pending and still advance when the token was exhausted', async () => {
			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': { lastTimeChecked: 1000000 },
			};

			mockLabels();
			mockList(listPage(['6', '5', '4'], 'token-1'));
			mockList(listPage(['3', '2', '1']), 'token-1');
			mockGet('6', 6_000_000_000_000);
			mockGet('5', 5_000_000_000_000);

			const { response } = await testPollingTriggerNode(GmailTrigger, {
				node: { typeVersion: 1.4, parameters: { simple: true, maxResults: 2 } },
				workflowStaticData,
			});

			expect(response?.[0]).toHaveLength(2);
			// The scan reached the whole window, so every unfetched id is tracked by id and
			// advancing cannot lose anything.
			expect(workflowStaticData['Gmail Trigger'].pendingMessageIds).toEqual(['4', '3', '2', '1']);
			expect(workflowStaticData['Gmail Trigger'].lastTimeChecked).toBe(6_000_000_000);
		});

		it('should hold lastTimeChecked when the page cap is hit with a token remaining', async () => {
			const initialTimestamp = 1000000;
			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': { lastTimeChecked: initialTimestamp },
			};

			mockLabels();
			// 20 pages, every one of them with a continuation token. Page 21 is not
			// mocked: a loop that overruns the cap hits an unmatched request, poll()
			// swallows the error and returns null, and the assertions below fail.
			const pages = Array.from({ length: 20 }, (_, page) => [`p${page}a`, `p${page}b`]);
			const allIds = pages.flat();
			pages.forEach((ids, page) =>
				mockList(listPage(ids, `token-${page + 1}`), page === 0 ? undefined : `token-${page}`),
			);
			mockGet('p0a', 6_000_000_000_000);
			mockGet('p0b', 5_000_000_000_000);

			const { response } = await testPollingTriggerNode(GmailTrigger, {
				node: { typeVersion: 1.4, parameters: { simple: true, maxResults: 2 } },
				workflowStaticData,
			});

			expect(response?.[0]).toHaveLength(2);
			// The scan did NOT reach the whole window: older mail exists beyond the
			// cap, so the cursor must hold to keep it reachable.
			expect(workflowStaticData['Gmail Trigger'].lastTimeChecked).toBe(initialTimestamp);
			expect(workflowStaticData['Gmail Trigger'].pendingMessageIds).toEqual(allIds.slice(2));
			// Fetched ids join the boundary set so a re-scan under the held cursor skips them.
			expect(workflowStaticData['Gmail Trigger'].possibleDuplicates).toEqual(
				expect.arrayContaining(['p0a', 'p0b']),
			);
		});

		it('should resume a held backlog and advance once the scan reaches the whole window', async () => {
			// Mid-backlog state: cursor held, one id pending, one handled id at the
			// boundary. The re-scan must skip the handled id, and the exhausted token
			// must let the cursor advance again.
			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': {
					lastTimeChecked: 1000000,
					pendingMessageIds: ['B'],
					possibleDuplicates: ['A'],
				},
			};

			mockLabels();
			mockGet('B', 2_000_000_000_000);
			mockList(listPage(['A', 'C']));
			mockGet('C', 3_000_000_000_000);

			const { response } = await testPollingTriggerNode(GmailTrigger, {
				node: { typeVersion: 1.4, parameters: { simple: true, maxResults: 5 } },
				workflowStaticData,
			});

			expect(response?.[0]?.map((item) => item.json.id)).toEqual(['B', 'C']);
			expect(workflowStaticData['Gmail Trigger'].lastTimeChecked).toBe(3_000_000_000);
			expect(workflowStaticData['Gmail Trigger'].pendingMessageIds ?? []).toEqual([]);
		});

		it('should hold the cursor when the scan fails mid-pagination', async () => {
			// A transient error on page 2 means the window was NOT fully scanned.
			// Advancing anyway would skip everything the failed pages never showed —
			// silently, without even the valve's warning.
			const initialTimestamp = 1000000;
			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': {
					lastTimeChecked: initialTimestamp,
					pendingMessageIds: ['P1'],
					possibleDuplicates: ['X'],
				},
			};

			mockLabels();
			// The pending drain succeeds and populates the fetched set...
			mockGet('P1', 5_000_000_000_000);
			// ...then scan resumes: page 1 succeeds with a token, page 2 blows up.
			mockList(listPage(['L1', 'L2'], 'token-1'));
			nock(baseUrl)
				.get('/gmail/v1/users/me/messages')
				.query((q) => q.pageToken === 'token-1')
				.reply(500, { error: 'transient' });

			const { response } = await testPollingTriggerNode(GmailTrigger, {
				node: { typeVersion: 1.4, parameters: { simple: true, maxResults: 5 } },
				workflowStaticData,
			});

			// The drained pending message is still delivered...
			expect(response?.[0]?.map((item) => item.json.id)).toEqual(['P1']);
			// ...but the cursor must hold: P1's date (5000s) must not become the new
			// boundary while page 1's ids were never persisted anywhere.
			expect(workflowStaticData['Gmail Trigger'].lastTimeChecked).toBe(initialTimestamp);
			expect(workflowStaticData['Gmail Trigger'].possibleDuplicates).toEqual(
				expect.arrayContaining(['X', 'P1']),
			);
		});

		it('should simplify output when a fetch fails mid-poll', async () => {
			// A swallowed fetch error must not change the shape of what is
			// delivered: with Simplify on, the messages fetched before the error
			// must still come out simplified, not in the raw format.
			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': { lastTimeChecked: 1000000 },
			};

			mockLabels();
			mockList(listPage(['1', '2']));
			mockGet('1', 4_000_000_000_000);
			mockGetError('2');

			const { response } = await testPollingTriggerNode(GmailTrigger, {
				node: { typeVersion: 1.4, parameters: { simple: true, maxResults: 5 } },
				workflowStaticData,
			});

			expect(response?.[0]?.map((item) => item.json.id)).toEqual(['1']);
			expect(response?.[0]?.[0]?.json.labels).toEqual([
				{ id: 'testLabelId', name: 'Test Label Name' },
			]);
			expect(response?.[0]?.[0]?.json.labelIds).toBeUndefined();
		});

		it('should keep unfetched new-message ids when a fetch fails after the scan', async () => {
			// Same rule as the queue drain, on the newly scanned side. The scan
			// reached the whole window, so the cursor advances past every id it
			// found: an id that is in no stored state would sit behind the new
			// cursor and be lost. A failed id goes to the set-aside list, and the
			// ids the budget could not reach stay queued.
			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': { lastTimeChecked: 1000000 },
			};

			mockLabels();
			mockList(listPage(['1', '2', '3', '4']));
			mockGet('1', 4_000_000_000_000);
			mockGetError('2');
			mockGet('3', 3_000_000_000_000);
			// No mock for '4': it is beyond the budget, so this poll must not fetch it.

			const { response } = await testPollingTriggerNode(GmailTrigger, {
				node: { typeVersion: 1.4, parameters: { simple: true, maxResults: 3 } },
				workflowStaticData,
			});

			// The failure costs only its own message.
			expect(response?.[0]?.map((item) => item.json.id)).toEqual(['1', '3']);
			expect(workflowStaticData['Gmail Trigger'].failedFetches).toEqual([['2', 1]]);
			// The beyond-budget tail stays queued.
			expect(workflowStaticData['Gmail Trigger'].pendingMessageIds).toEqual(['4']);
			expect(workflowStaticData['Gmail Trigger'].possibleDuplicates).toEqual(
				expect.arrayContaining(['1', '3']),
			);
		});

		it('should keep holding the cursor when a drain fetch fails during a held backlog', async () => {
			// The cursor was held by a previous capped tick, so unscanned older mail
			// exists beyond the boundary. A drain fetch failing must not let the
			// drained messages' newer dates advance the cursor past that remainder.
			const initialTimestamp = 1000000;
			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': {
					lastTimeChecked: initialTimestamp,
					pendingMessageIds: ['P1', 'P2', 'P3'],
					possibleDuplicates: ['X'],
				},
			};

			mockLabels();
			mockGet('P1', 5_000_000_000_000);
			mockGetError('P2');
			mockGet('P3', 4_000_000_000_000);
			// No scan mocks: the scan cannot complete, so nothing proves the
			// window was fully scanned.

			const { response } = await testPollingTriggerNode(GmailTrigger, {
				node: { typeVersion: 1.4, parameters: { simple: true, maxResults: 5 } },
				workflowStaticData,
			});

			// The failure costs only its own message: the ids around it are drained.
			expect(response?.[0]?.map((item) => item.json.id)).toEqual(['P1', 'P3']);
			expect(workflowStaticData['Gmail Trigger'].failedFetches).toEqual([['P2', 1]]);
			// The cursor must keep holding: P1's date (5e9 s, far past the 1e6
			// boundary) must not become the new cursor while the window was never
			// scanned.
			expect(workflowStaticData['Gmail Trigger'].lastTimeChecked).toBe(initialTimestamp);
			expect(workflowStaticData['Gmail Trigger'].pendingMessageIds).toEqual([]);
			expect(workflowStaticData['Gmail Trigger'].possibleDuplicates).toEqual(
				expect.arrayContaining(['X', 'P1', 'P3']),
			);
		});

		it('should set aside a failed id and keep draining the rest of the queue', async () => {
			// A failed fetch must not stop the tick: the id moves aside, the other
			// queued ids are still fetched, and the scan still runs so new mail
			// keeps arriving.
			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': {
					lastTimeChecked: 1000000,
					pendingMessageIds: ['BAD', 'OK1'],
				},
			};

			mockLabels();
			mockGetError('BAD');
			mockGet('OK1', 2_000_000_000_000);
			mockList(listPage(['NEW']));
			mockGet('NEW', 3_000_000_000_000);

			const { response } = await testPollingTriggerNode(GmailTrigger, {
				node: { typeVersion: 1.4, parameters: { simple: true, maxResults: 5 } },
				workflowStaticData,
			});

			expect(response?.[0]?.map((item) => item.json.id)).toEqual(['OK1', 'NEW']);
			expect(workflowStaticData['Gmail Trigger'].pendingMessageIds).toEqual([]);
			// The failed id is tracked on its own, with one attempt against it.
			expect(workflowStaticData['Gmail Trigger'].failedFetches).toEqual([['BAD', 1]]);
		});

		it('should retry a set-aside id before the queue and deliver it on success', async () => {
			// One message fits in this poll, and the set-aside id has waited longest,
			// so it goes first and spends that one unit of budget. The queued id has
			// to wait for the next poll — its fetch is not mocked, so a poll that
			// spent no budget on the retry would fail here.
			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': {
					lastTimeChecked: 1000000,
					pendingMessageIds: ['P1'],
					failedFetches: [['RECOVERED', 2]],
				},
			};

			mockLabels();
			mockGet('RECOVERED', 2_000_000_000_000);

			const { response } = await testPollingTriggerNode(GmailTrigger, {
				node: { typeVersion: 1.4, parameters: { simple: true, maxResults: 1 } },
				workflowStaticData,
			});

			expect(response?.[0]?.map((item) => item.json.id)).toEqual(['RECOVERED']);
			expect(workflowStaticData['Gmail Trigger'].failedFetches).toEqual([]);
			expect(workflowStaticData['Gmail Trigger'].pendingMessageIds).toEqual(['P1']);
		});

		it('should not deliver a recovered id twice when the scan re-scans it', async () => {
			// A set-aside id is still inside the query window, so a held cursor
			// re-scans it. Once its retry succeeds it must join the boundary set
			// before the scan runs, or the same tick delivers it twice.
			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': {
					lastTimeChecked: 1000000,
					failedFetches: [['Q1', 1]],
				},
			};

			mockLabels();
			mockGet('Q1', 2_000_000_000_000);
			mockGet('Q1', 2_000_000_000_000);
			mockList(listPage(['NEW', 'Q1']));
			mockGet('NEW', 3_000_000_000_000);

			const { response } = await testPollingTriggerNode(GmailTrigger, {
				node: { typeVersion: 1.4, parameters: { simple: true, maxResults: 5 } },
				workflowStaticData,
			});

			expect(response?.[0]?.map((item) => item.json.id)).toEqual(['Q1', 'NEW']);
		});

		it('should stop looking for an id it gave up on', async () => {
			// Giving up has to outlast the poll. An id that is only removed from the
			// set-aside list is in no stored state at all, so the next scan finds it
			// again and the whole round of attempts starts over. Putting it at the
			// boundary keeps the scan from picking it up while the cursor is held.
			const initialTimestamp = 1000000;
			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': {
					lastTimeChecked: initialTimestamp,
					failedFetches: [['GONE', MAX_PENDING_FETCH_ATTEMPTS - 1]],
				},
			};

			mockLabels();
			mockGetError('GONE');
			// The message is still in the mailbox, so the scan returns it again.
			mockList(listPage(['GONE']));

			const { response } = await testPollingTriggerNode(GmailTrigger, {
				node: { typeVersion: 1.4, parameters: { simple: true, maxResults: 5 } },
				workflowStaticData,
			});

			expect(response).toBeNull();
			// The id stays in the list with no attempts left, which is what the scan
			// skips — so it is not queued for a fetch either.
			expect(workflowStaticData['Gmail Trigger'].failedFetches).toEqual([
				['GONE', MAX_PENDING_FETCH_ATTEMPTS],
			]);
			expect(workflowStaticData['Gmail Trigger'].pendingMessageIds ?? []).toEqual([]);
		});

		it('should keep remembering a given-up id after the cursor moves on', async () => {
			// The boundary set is replaced whenever the cursor advances, so it cannot
			// carry a give-up. The message was never fetched, so its date is unknown
			// and "until the cursor passes it" is not something the poll can decide.
			// The set-aside list keeps the id instead, which is what the scan skips.
			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': {
					lastTimeChecked: 1000000,
					failedFetches: [['GONE', MAX_PENDING_FETCH_ATTEMPTS - 1]],
				},
			};

			mockLabels();
			mockGetError('GONE');
			// A deliverable message in the same scan moves the cursor forward.
			mockList(listPage(['OK']));
			mockGet('OK', 2_000_000_000_000);

			const first = await testPollingTriggerNode(GmailTrigger, {
				node: { typeVersion: 1.4, parameters: { simple: true, maxResults: 5 } },
				workflowStaticData,
			});

			expect(first.response?.[0]?.map((item) => item.json.id)).toEqual(['OK']);
			expect(workflowStaticData['Gmail Trigger'].lastTimeChecked).toBe(2_000_000_000);
			// The id is still remembered, with no attempts left.
			expect(workflowStaticData['Gmail Trigger'].failedFetches).toEqual([
				['GONE', MAX_PENDING_FETCH_ATTEMPTS],
			]);

			// Second poll: the scan finds the message again, and the poll must neither
			// fetch it nor start its attempts over. Its fetch is not mocked.
			mockLabels();
			mockList(listPage(['GONE']));

			const second = await testPollingTriggerNode(GmailTrigger, {
				node: { typeVersion: 1.4, parameters: { simple: true, maxResults: 5 } },
				workflowStaticData,
			});

			expect(second.response).toBeNull();
			expect(workflowStaticData['Gmail Trigger'].failedFetches).toEqual([
				['GONE', MAX_PENDING_FETCH_ATTEMPTS],
			]);
			expect(workflowStaticData['Gmail Trigger'].pendingMessageIds ?? []).toEqual([]);
		});

		it('should count attempts per id so a fresh failure is not dropped early', async () => {
			// One id is on its last attempt while another fails for the first time.
			// Only the first may be dropped, or the second loses its retries.
			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': {
					lastTimeChecked: 1000000,
					pendingMessageIds: ['FRESH'],
					failedFetches: [['OLD', MAX_PENDING_FETCH_ATTEMPTS - 1]],
				},
			};

			mockLabels();
			mockGetError('OLD');
			mockGetError('FRESH');
			mockList(listPage([]));

			await testPollingTriggerNode(GmailTrigger, {
				node: { typeVersion: 1.4, parameters: { simple: true, maxResults: 5 } },
				workflowStaticData,
			});

			// OLD used up its attempts and is kept with none left; FRESH keeps its own.
			expect(workflowStaticData['Gmail Trigger'].failedFetches).toEqual([
				['OLD', MAX_PENDING_FETCH_ATTEMPTS],
				['FRESH', 1],
			]);
		});

		it('should not spend the delivery budget on failed fetches', async () => {
			// A failed fetch carries no message, so it must not count against
			// maxResults — the healthy queued ids still fit in this tick.
			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': {
					lastTimeChecked: 1000000,
					pendingMessageIds: ['BAD', 'OK1', 'OK2'],
				},
			};

			mockLabels();
			mockGetError('BAD');
			mockGet('OK1', 2_000_000_000_000);
			mockGet('OK2', 3_000_000_000_000);
			mockList(listPage([]));

			const { response } = await testPollingTriggerNode(GmailTrigger, {
				node: { typeVersion: 1.4, parameters: { simple: true, maxResults: 2 } },
				workflowStaticData,
			});

			expect(response?.[0]?.map((item) => item.json.id)).toEqual(['OK1', 'OK2']);
		});

		it('should count set-aside ids towards the stored-id bound', async () => {
			// Set-aside ids are stored state like the queue is, so they must not let a
			// held cursor grow that state past the bound unnoticed. One retry succeeds
			// (so the poll reaches its cursor decision) and one stays set aside: 4999
			// boundary ids plus that one id is exactly the bound, while the boundary
			// ids alone are not.
			const initialTimestamp = 1000000;
			const handled = Array.from({ length: 4999 }, (_, i) => `dup${i}`);
			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': {
					lastTimeChecked: initialTimestamp,
					possibleDuplicates: handled,
					failedFetches: [
						['Q1', 1],
						['Q2', 1],
					],
				},
			};

			mockLabels();
			mockGet('Q1', 6_000_000_000_000);
			mockGetError('Q2');
			// The scan cannot finish, because page two is not mocked, so nothing proves
			// the window complete and the cursor would otherwise hold.
			mockList(listPage(['n0'], 'token-1'));

			const { response } = await testPollingTriggerNode(GmailTrigger, {
				node: { typeVersion: 1.4, parameters: { simple: true, maxResults: 5 } },
				workflowStaticData,
			});

			expect(response?.[0]?.map((item) => item.json.id)).toEqual(['Q1']);
			// Past the bound, so the poll gives up holding instead of tracking more.
			expect(workflowStaticData['Gmail Trigger'].lastTimeChecked as number).toBeGreaterThan(
				initialTimestamp,
			);
		});

		it('should not queue a set-aside id that the scan returns again', async () => {
			// The set-aside list already owns that id and retries it every poll. Also
			// putting it in the queue would have both lists fetch it, and one poll
			// could deliver it twice.
			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': {
					lastTimeChecked: 1000000,
					failedFetches: [['X', 1]],
				},
			};

			mockLabels();
			mockGetError('X');
			mockList(listPage(['A', 'X']));
			mockGet('A', 2_000_000_000_000);

			const { response } = await testPollingTriggerNode(GmailTrigger, {
				node: { typeVersion: 1.4, parameters: { simple: true, maxResults: 1 } },
				workflowStaticData,
			});

			expect(response?.[0]?.map((item) => item.json.id)).toEqual(['A']);
			expect(workflowStaticData['Gmail Trigger'].pendingMessageIds).toEqual([]);
			expect(workflowStaticData['Gmail Trigger'].failedFetches).toEqual([['X', 2]]);
		});

		it('should deliver the raw shape when the labels lookup for simplifying fails', async () => {
			// Simplifying needs a labels request of its own. A failure there is
			// swallowed like any other poll error and the items go out unsimplified,
			// which is what the node did before. Delivering nothing instead would
			// change what a workflow receives and needs a new node version.
			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': { lastTimeChecked: 1000000 },
			};

			nock(baseUrl).get('/gmail/v1/users/me/labels').reply(500, { error: 'transient' });
			mockList(listPage(['1']));
			mockGet('1', 2_000_000_000_000);

			const { response } = await testPollingTriggerNode(GmailTrigger, {
				node: { typeVersion: 1.4, parameters: { simple: true, maxResults: 5 } },
				workflowStaticData,
			});

			expect(response?.[0]?.map((item) => item.json.id)).toEqual(['1']);
			// Raw labelIds survive, because simplifying failed.
			expect(response?.[0]?.[0]?.json.labelIds).toEqual(['testLabelId']);
			expect(workflowStaticData['Gmail Trigger'].lastTimeChecked).toBe(2_000_000_000);
		});

		it('should keep fetching the rest of a scanned batch when one fetch fails', async () => {
			// The scan found several messages. One failing fetch must not cost the
			// poll the messages behind it, and that failure must count as an attempt
			// like every other one, so the id does not get a free try.
			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': { lastTimeChecked: 1000000 },
			};

			mockLabels();
			mockList(listPage(['A', 'B']));
			mockGetError('A');
			mockGet('B', 2_000_000_000_000);

			const { response } = await testPollingTriggerNode(GmailTrigger, {
				node: { typeVersion: 1.4, parameters: { simple: true, maxResults: 5 } },
				workflowStaticData,
			});

			expect(response?.[0]?.map((item) => item.json.id)).toEqual(['B']);
			expect(workflowStaticData['Gmail Trigger'].failedFetches).toEqual([['A', 1]]);
			expect(workflowStaticData['Gmail Trigger'].pendingMessageIds).toEqual([]);
		});

		it('should not scan for new messages while the queue still holds ids', async () => {
			// The queue write after a scan replaces the whole queue, so scanning while
			// ids are still queued would drop the ones this poll could not reach.
			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': {
					lastTimeChecked: 1000000,
					pendingMessageIds: ['P1', 'P2'],
				},
			};

			mockLabels();
			mockGet('P1', 2_000_000_000_000);
			const scanScope = mockList(listPage(['NEW']));

			const { response } = await testPollingTriggerNode(GmailTrigger, {
				node: { typeVersion: 1.4, parameters: { simple: true, maxResults: 1 } },
				workflowStaticData,
			});

			expect(response?.[0]?.map((item) => item.json.id)).toEqual(['P1']);
			// No scan request went out, and the undrained id survives.
			expect(scanScope.isDone()).toBe(false);
			expect(workflowStaticData['Gmail Trigger'].pendingMessageIds).toEqual(['P2']);
		});

		it('should stop draining once a poll has spent its attempts on failures', async () => {
			// Failures cost no budget, so only their own count stops the drain. Without
			// that stop, one poll would work through a queue full of failures.
			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': {
					lastTimeChecked: 1000000,
					pendingMessageIds: ['F1', 'F2', 'F3'],
				},
			};

			mockLabels();
			mockGetError('F1');
			mockGetError('F2');
			// No mock for 'F3': this poll has used up its attempts before reaching it.

			const { response } = await testPollingTriggerNode(GmailTrigger, {
				node: { typeVersion: 1.4, parameters: { simple: true, maxResults: 2 } },
				workflowStaticData,
			});

			expect(response).toBeNull();
			expect(workflowStaticData['Gmail Trigger'].pendingMessageIds).toEqual(['F3']);
			expect(workflowStaticData['Gmail Trigger'].failedFetches).toEqual([
				['F1', 1],
				['F2', 1],
			]);
		});

		it('should retry only as many set-aside ids as one poll allows', async () => {
			// The list can grow past what a poll should spend on requests, so each
			// poll takes a slice and moves the rest to the front for the next one.
			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': {
					lastTimeChecked: 1000000,
					failedFetches: [
						['Q1', 1],
						['Q2', 1],
						['Q3', 1],
					],
				},
			};

			mockLabels();
			mockGetError('Q1');
			mockGetError('Q2');
			// No mock for 'Q3': it must not be requested in this poll.
			mockList(listPage([]));

			await testPollingTriggerNode(GmailTrigger, {
				node: { typeVersion: 1.4, parameters: { simple: true, maxResults: 2 } },
				workflowStaticData,
			});

			// Q3 waits with its count untouched and goes first next poll.
			expect(workflowStaticData['Gmail Trigger'].failedFetches).toEqual([
				['Q3', 1],
				['Q1', 2],
				['Q2', 2],
			]);
		});

		it('should emit a message only once when pages return an overlapping id', async () => {
			// Gmail pagination can repeat an id across pages when the mailbox shifts
			// between page fetches. The accumulated list must be deduplicated.
			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': { lastTimeChecked: 1000000 },
			};

			mockLabels();
			mockList(listPage(['A', 'B'], 'token-1'));
			mockList(listPage(['A', 'C']), 'token-1');
			// Two interceptors for A: if the code fetches it twice, both are consumed
			// and the duplicate shows up in the output.
			mockGet('A', 4_000_000_000_000);
			mockGet('A', 4_000_000_000_000);
			mockGet('B', 3_000_000_000_000);
			mockGet('C', 2_000_000_000_000);

			const { response } = await testPollingTriggerNode(GmailTrigger, {
				node: { typeVersion: 1.4, parameters: { simple: true, maxResults: 4 } },
				workflowStaticData,
			});

			expect(response?.[0]?.map((item) => item.json.id)).toEqual(['A', 'B', 'C']);
			expect(workflowStaticData['Gmail Trigger'].pendingMessageIds ?? []).toEqual([]);
			expect(workflowStaticData['Gmail Trigger'].lastTimeChecked).toBe(4_000_000_000);
		});

		it('should not park an already-fetched id as pending when pages overlap', async () => {
			// Same overlap, tighter budget: the repeated id must not land in the
			// fetched batch AND next tick's pending queue — that is a cross-tick
			// duplicate delivery.
			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': { lastTimeChecked: 1000000 },
			};

			mockLabels();
			mockList(listPage(['A', 'B'], 'token-1'));
			mockList(listPage(['A', 'C']), 'token-1');
			mockGet('A', 4_000_000_000_000);
			mockGet('B', 3_000_000_000_000);

			const { response } = await testPollingTriggerNode(GmailTrigger, {
				node: { typeVersion: 1.4, parameters: { simple: true, maxResults: 2 } },
				workflowStaticData,
			});

			expect(response?.[0]?.map((item) => item.json.id)).toEqual(['A', 'B']);
			expect(workflowStaticData['Gmail Trigger'].pendingMessageIds).toEqual(['C']);
		});

		it('should give up holding when a capped window makes no progress', async () => {
			// Every id the cap can reach is already tracked, so re-scanning the same
			// pages can never progress past them. Holding again would repeat this
			// tick forever: no backlog progress, no new mail, no warning. The poll
			// must give up instead — advance and start fresh.
			const initialTimestamp = 1000000;
			const pages = Array.from({ length: 20 }, (_, page) => [`h${page}a`, `h${page}b`]);
			const handledIds = pages.flat();
			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': {
					lastTimeChecked: initialTimestamp,
					possibleDuplicates: handledIds,
				},
			};

			mockLabels();
			pages.forEach((ids, page) =>
				mockList(listPage(ids, `token-${page + 1}`), page === 0 ? undefined : `token-${page}`),
			);
			// No message GET mocks: everything listed is filtered as already handled.

			const { response } = await testPollingTriggerNode(GmailTrigger, {
				node: { typeVersion: 1.4, parameters: { simple: true, maxResults: 2 } },
				workflowStaticData,
			});

			expect(response).toBeNull();
			// The cursor must move off the wedged window instead of holding forever.
			expect(workflowStaticData['Gmail Trigger'].lastTimeChecked as number).toBeGreaterThan(
				initialTimestamp,
			);
			// A fresh boundary has no handled ids to remember.
			expect(workflowStaticData['Gmail Trigger'].possibleDuplicates).toEqual([]);
		});

		it('should keep the beyond-budget remainder when a drain exactly consumed the budget', async () => {
			// The drain empties the queue, so there is no early return, but it also
			// leaves no budget: the fetch loop never runs, and only the pre-fetch
			// queue write can save what the scan found.
			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': {
					lastTimeChecked: 1000000,
					pendingMessageIds: ['P1', 'P2'],
				},
			};

			mockLabels();
			mockGet('P1', 2_000_000_000_000);
			mockGet('P2', 2_000_000_000_000);
			mockList(listPage(['1', '2']));

			const { response } = await testPollingTriggerNode(GmailTrigger, {
				node: { typeVersion: 1.4, parameters: { simple: true, maxResults: 2 } },
				workflowStaticData,
			});

			expect(response?.[0]?.map((item) => item.json.id)).toEqual(['P1', 'P2']);
			expect(workflowStaticData['Gmail Trigger'].pendingMessageIds).toEqual(['1', '2']);
		});

		it('should give up holding and advance when the tracked-id bound is exceeded', async () => {
			const initialTimestamp = 1000000;
			// The boundary set already holds MAX_TRACKED_BACKLOG_IDS ids, so the valve
			// must fire: advance instead of holding again.
			const hugeDuplicates = Array.from({ length: 5000 }, (_, i) => `dup${i}`);
			const workflowStaticData: Record<string, Record<string, unknown>> = {
				'Gmail Trigger': {
					lastTimeChecked: initialTimestamp,
					possibleDuplicates: hugeDuplicates,
				},
			};

			mockLabels();
			const pages = Array.from({ length: 20 }, (_, page) => [`n${page}a`, `n${page}b`]);
			const allIds = pages.flat();
			pages.forEach((ids, page) =>
				mockList(listPage(ids, `token-${page + 1}`), page === 0 ? undefined : `token-${page}`),
			);
			mockGet('n0a', 6_000_000_000_000);
			mockGet('n0b', 5_000_000_000_000);

			const { response } = await testPollingTriggerNode(GmailTrigger, {
				node: { typeVersion: 1.4, parameters: { simple: true, maxResults: 2 } },
				workflowStaticData,
			});

			expect(response?.[0]).toHaveLength(2);
			// Cap was hit (20 pages listed, token remaining) but the valve fires:
			// advance instead of holding.
			expect(workflowStaticData['Gmail Trigger'].lastTimeChecked).toBe(6_000_000_000);
			// The valve skips only unscanned mail; scanned-but-unfetched ids stay tracked.
			expect(workflowStaticData['Gmail Trigger'].pendingMessageIds).toEqual(allIds.slice(2));
		});
	});
});
