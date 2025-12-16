import { mock } from 'jest-mock-extended';
import { DateTime } from 'luxon';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import type { IEmail } from '@utils/sendAndWait/interfaces';

import * as GenericFunctions from '../../GenericFunctions';
import { parseRawEmail, prepareTimestamp } from '../../GenericFunctions';
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
	it('should return a date string', async () => {
		// ARRANGE
		const executionFunctions = mock<IExecuteFunctions>();
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
