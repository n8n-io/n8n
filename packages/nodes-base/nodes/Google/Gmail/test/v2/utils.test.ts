import { mock } from 'jest-mock-extended';
import { DateTime } from 'luxon';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import type { IEmail } from '@utils/sendAndWait/interfaces';

import * as GenericFunctions from '../../GenericFunctions';
import { parseRawEmail, prepareQuery, prepareTimestamp } from '../../GenericFunctions';
import { addThreadHeadersToEmail } from '../../v2/utils/draft';

const node: INode = {
	id: '1',
	name: 'Gmail node',
	typeVersion: 2,
	type: 'n8n-nodes-base.gmail',
	position: [50, 50],
	parameters: {
		operation: 'getAll',
	},
};

describe('Google Gmail v2, prepareTimestamp', () => {
	it('should return a valid timestamp from ISO', () => {
		const dateInput = '2020-01-01T00:00:00.000Z';
		const timestampBefore = prepareTimestamp(node, 0, '', dateInput, 'before');
		const timestampAfter = prepareTimestamp(node, 0, '', dateInput, 'after');

		expect(timestampBefore).toBeDefined();
		expect(timestampBefore).toBe('before:1577836800');

		expect(timestampAfter).toBeDefined();
		expect(timestampAfter).toBe('after:1577836800');
	});

	it('should return a valid timestamp from integer in miliseconds', () => {
		const dateInput = 1577836800000;
		const timestampBefore = prepareTimestamp(node, 0, '', dateInput, 'before');
		const timestampAfter = prepareTimestamp(node, 0, '', dateInput, 'after');

		expect(timestampBefore).toBeDefined();
		expect(timestampBefore).toBe('before:1577836800');

		expect(timestampAfter).toBeDefined();
		expect(timestampAfter).toBe('after:1577836800');
	});

	it('should return a valid timestamp from integer in seconds', () => {
		const dateInput = 1577836800;
		const timestampBefore = prepareTimestamp(node, 0, '', dateInput, 'before');
		const timestampAfter = prepareTimestamp(node, 0, '', dateInput, 'after');

		expect(timestampBefore).toBeDefined();
		expect(timestampBefore).toBe('before:1577836800');

		expect(timestampAfter).toBeDefined();
		expect(timestampAfter).toBe('after:1577836800');
	});

	it('should return a valid timestamp from string in miliseconds', () => {
		const dateInput = '1577836800000';
		const timestampBefore = prepareTimestamp(node, 0, '', dateInput, 'before');
		const timestampAfter = prepareTimestamp(node, 0, '', dateInput, 'after');

		expect(timestampBefore).toBeDefined();
		expect(timestampBefore).toBe('before:1577836800');

		expect(timestampAfter).toBeDefined();
		expect(timestampAfter).toBe('after:1577836800');
	});

	it('should return a valid timestamp from string in seconds', () => {
		const dateInput = '1577836800';
		const timestampBefore = prepareTimestamp(node, 0, '', dateInput, 'before');
		const timestampAfter = prepareTimestamp(node, 0, '', dateInput, 'after');

		expect(timestampBefore).toBeDefined();
		expect(timestampBefore).toBe('before:1577836800');

		expect(timestampAfter).toBeDefined();
		expect(timestampAfter).toBe('after:1577836800');
	});

	it('should return a valid timestamp from luxon DateTime', () => {
		const dateInput = DateTime.fromISO('2020-01-01T00:00:00.000Z');
		const timestampBefore = prepareTimestamp(node, 0, '', dateInput, 'before');
		const timestampAfter = prepareTimestamp(node, 0, '', dateInput, 'after');

		expect(timestampBefore).toBeDefined();
		expect(timestampBefore).toBe('before:1577836800');

		expect(timestampAfter).toBeDefined();
		expect(timestampAfter).toBe('after:1577836800');
	});

	it('should return a valid timestamp from luxon DateTime ISO', () => {
		const dateInput = DateTime.fromISO('2020-01-01T00:00:00.000Z').toISO();
		const timestampBefore = prepareTimestamp(node, 0, '', dateInput, 'before');
		const timestampAfter = prepareTimestamp(node, 0, '', dateInput, 'after');

		expect(timestampBefore).toBeDefined();
		expect(timestampBefore).toBe('before:1577836800');

		expect(timestampAfter).toBeDefined();
		expect(timestampAfter).toBe('after:1577836800');
	});

	it('should throw error on invalid data', () => {
		const dateInput = 'invalid';
		expect(() => prepareTimestamp(node, 0, '', dateInput, 'before')).toThrow(
			"Invalid date/time in 'Received Before' field",
		);
		expect(() => prepareTimestamp(node, 0, '', dateInput, 'after')).toThrow(
			"Invalid date/time in 'Received After' field",
		);
	});
});

describe('parseRawEmail', () => {
	const logger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };

	it('should return a date string', async () => {
		// ARRANGE
		const executionFunctions = mock<IExecuteFunctions>({ logger });
		const rawEmail = 'Date: Wed, 28 Aug 2024 00:36:37 -0700'.replace(/\n/g, '\r\n');

		// ACT
		const { json } = await parseRawEmail.call(
			executionFunctions,
			{ raw: Buffer.from(rawEmail, 'utf8').toString('base64') },
			'attachment_',
		);

		// ASSERT
		expect(typeof json.date).toBe('string');
	});

	it('should include cc, bcc, replyTo, and sender in parsed output (mailparser shape)', async () => {
		const executionFunctions = mock<IExecuteFunctions>({ logger });
		const rawEmail = [
			'Date: Wed, 28 Aug 2024 00:36:37 -0700',
			'From: Alice <alice@example.com>',
			'To: Bob <bob@example.com>',
			'Cc: Carol <carol@example.com>',
			'Bcc: Dave <dave@example.com>',
			'Reply-To: reply@example.com',
			'Sender: sender@example.com',
			'Subject: Test',
			'Content-Type: text/plain',
			'',
			'Body',
		].join('\r\n');

		const { json } = await parseRawEmail.call(
			executionFunctions as IExecuteFunctions,
			{ raw: Buffer.from(rawEmail, 'utf8').toString('base64') },
			'attachment_',
		);

		const hasAddressShape = (obj: unknown) =>
			obj !== null &&
			typeof obj === 'object' &&
			'value' in obj &&
			Array.isArray((obj as { value: unknown }).value) &&
			'text' in obj &&
			'html' in obj;

		expect(hasAddressShape(json.from)).toBe(true);
		expect(hasAddressShape(json.to)).toBe(true);
		expect(hasAddressShape(json.cc)).toBe(true);
		expect(hasAddressShape(json.bcc)).toBe(true);
		expect(hasAddressShape(json.replyTo)).toBe(true);
		expect(hasAddressShape(json.sender)).toBe(true);

		expect((json.cc as { value: { address: string }[] }).value[0].address).toBe(
			'carol@example.com',
		);
		expect((json.bcc as { value: { address: string }[] }).value[0].address).toBe(
			'dave@example.com',
		);
		expect((json.replyTo as { value: { address: string }[] }).value[0].address).toBe(
			'reply@example.com',
		);
		expect((json.sender as { value: { address: string }[] }).value[0].address).toBe(
			'sender@example.com',
		);
	});

	it('should include binary data when downloadAttachments is true and message has attachments', async () => {
		const prepareBinaryData = jest.fn().mockResolvedValue({
			data: 'eA==',
			mimeType: 'application/octet-stream',
			fileName: 'file.bin',
		});
		const executionFunctions = mock<IExecuteFunctions>({
			logger,
			getNodeParameter: jest.fn((parameterName: string): string | boolean | undefined => {
				if (parameterName === 'options.downloadAttachments') return true;
				return undefined;
			}) as unknown as IExecuteFunctions['getNodeParameter'],
			helpers: {
				prepareBinaryData,
			},
		});
		// Minimal MIME with one attachment (content "x")
		const rawEmail = [
			'Date: Wed, 28 Aug 2024 00:36:37 -0700',
			'Content-Type: multipart/mixed; boundary=bound',
			'',
			'--bound',
			'Content-Type: text/plain',
			'',
			'hello',
			'--bound',
			'Content-Disposition: attachment; filename=file.bin',
			'Content-Type: application/octet-stream',
			'',
			'x',
			'--bound--',
		].join('\r\n');

		const result = await parseRawEmail.call(
			executionFunctions as IExecuteFunctions,
			{ id: '1', raw: Buffer.from(rawEmail, 'utf8').toString('base64') },
			'attachment_',
		);

		expect(result.binary).toBeDefined();
		expect(result.binary?.attachment_0).toBeDefined();
		expect(result.binary?.attachment_0?.fileName).toBe('file.bin');
		expect(prepareBinaryData).toHaveBeenCalledTimes(1);
	});
});

describe('prepareQuery', () => {
	const executionFunctions = mock<IExecuteFunctions>({
		getNode: jest.fn(() => node),
	});

	it('should convert sender filter to q parameter', () => {
		const result = prepareQuery.call(
			executionFunctions as IExecuteFunctions,
			{ sender: 'alice@example.com' },
			0,
		);

		expect(result.q).toBe('from:alice@example.com');
		expect(result).not.toHaveProperty('sender');
	});

	it('should append sender to existing q parameter', () => {
		const result = prepareQuery.call(
			executionFunctions,
			{ q: 'subject:hello', sender: 'alice@example.com' },
			0,
		);

		expect(result.q).toBe('subject:hello from:alice@example.com');
		expect(result).not.toHaveProperty('sender');
	});

	it('should convert readStatus to q parameter when not "both"', () => {
		const result = prepareQuery.call(executionFunctions, { readStatus: 'unread' }, 0);

		expect(result.q).toBe('is:unread');
		expect(result).not.toHaveProperty('readStatus');
	});

	it('should not modify q when readStatus is "both"', () => {
		const result = prepareQuery.call(executionFunctions, { readStatus: 'both' }, 0);

		expect(result).not.toHaveProperty('q');
	});

	it('should keep empty labelIds as-is when falsy', () => {
		const result = prepareQuery.call(executionFunctions, { labelIds: '' }, 0);

		expect(result.labelIds).toBe('');
	});

	it('should preserve non-empty labelIds', () => {
		const result = prepareQuery.call(executionFunctions, { labelIds: ['INBOX', 'CHAT'] }, 0);

		expect(result.labelIds).toEqual(['INBOX', 'CHAT']);
	});

	it('should pass through includeSpamTrash unchanged', () => {
		const result = prepareQuery.call(executionFunctions, { includeSpamTrash: true }, 0);

		expect(result.includeSpamTrash).toBe(true);
	});

	it('should combine multiple filters into a single q parameter', () => {
		const result = prepareQuery.call(
			executionFunctions,
			{
				q: 'test',
				sender: 'bob@example.com',
				readStatus: 'read',
			},
			0,
		);

		expect(result.q).toBe('test from:bob@example.com is:read');
		expect(result).not.toHaveProperty('sender');
		expect(result).not.toHaveProperty('readStatus');
	});
});

describe('addThreadHeadersToEmail', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should set inReplyTo and reference on the email object', async () => {
		const mockThreadId = 'thread123';
		const mockMessageId = '<message-id@example.com>';
		const mockThread = {
			messages: [
				{ payload: { headers: [{ name: 'Message-ID', value: '<old-id@example.com>' }] } },
				{ payload: { headers: [{ name: 'Message-ID', value: mockMessageId }] } },
			],
		};

		jest.spyOn(GenericFunctions, 'googleApiRequest').mockImplementation(async function () {
			return mockThread;
		});

		const email = mock<IEmail>({});

		const thisArg = mock<IExecuteFunctions>({});

		await addThreadHeadersToEmail.call(thisArg, email, mockThreadId);

		expect(email.inReplyTo).toBe(mockMessageId);
		expect(email.references).toBe(mockMessageId);
	});

	it('should set inReplyTo and reference on the email object even if the message has only one item', async () => {
		const mockThreadId = 'thread123';
		const mockMessageId = '<message-id@example.com>';
		const mockThread = {
			messages: [{ payload: { headers: [{ name: 'Message-ID', value: mockMessageId }] } }],
		};

		jest.spyOn(GenericFunctions, 'googleApiRequest').mockImplementation(async function () {
			return mockThread;
		});

		const email = mock<IEmail>({});

		const thisArg = mock<IExecuteFunctions>({});

		await addThreadHeadersToEmail.call(thisArg, email, mockThreadId);

		expect(email.inReplyTo).toBe(mockMessageId);
		expect(email.references).toBe(mockMessageId);
	});

	it('should not do anything if the thread has no messages', async () => {
		const mockThreadId = 'thread123';
		const mockThread = {};

		jest.spyOn(GenericFunctions, 'googleApiRequest').mockImplementation(async function () {
			return mockThread;
		});

		const email = mock<IEmail>({});

		const thisArg = mock<IExecuteFunctions>({});

		await addThreadHeadersToEmail.call(thisArg, email, mockThreadId);

		// We are using mock<IEmail>({}) which means the value of these will be a mock function
		expect(typeof email.inReplyTo).toBe('function');
		expect(typeof email.references).toBe('function');
	});
});
