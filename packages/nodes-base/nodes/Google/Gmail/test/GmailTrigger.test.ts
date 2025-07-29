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
});
