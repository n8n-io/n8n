import * as mailparser from 'mailparser';
import nock from 'nock';

import { testPollingTriggerNode } from '@test/nodes/TriggerHelpers';

import { GmailTrigger } from '../GmailTrigger.node';
import type { Message, ListMessage, MessageListResponse } from '../types';

jest.mock('mailparser');

describe('GmailTrigger', () => {
	const baseUrl = 'https://www.googleapis.com';

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
		jest.spyOn(mailparser, 'simpleParser').mockResolvedValue({
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

		const { response } = await testPollingTriggerNode(GmailTrigger);

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
		nock(baseUrl)
			.get(new RegExp('/gmail/v1/users/me/messages/1?.*'))
			.reply(200, createMessage({ id: '1', internalDate: '1727777957863', date: undefined }));
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

		const { response } = await testPollingTriggerNode(GmailTrigger);

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

		const { response } = await testPollingTriggerNode(GmailTrigger);
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
		nock(baseUrl)
			.get(new RegExp('/gmail/v1/users/me/messages/1?.*'))
			.reply(200, createMessage({ id: '1', internalDate: timestamp }));
		nock(baseUrl)
			.get(new RegExp('/gmail/v1/users/me/messages/2?.*'))
			.reply(200, createMessage({ id: '2', internalDate: timestamp }));
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
});
