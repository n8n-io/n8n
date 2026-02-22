import { mock } from 'jest-mock-extended';
import { DateTime } from 'luxon';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import type { IEmail } from '@utils/sendAndWait/interfaces';

import * as GenericFunctions from '../../GenericFunctions';
import {
	parseRawEmail,
	prepareEmailBody,
	prepareEmailsInput,
	prepareTimestamp,
} from '../../GenericFunctions';
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

describe('prepareEmailsInput', () => {
	it('should handle a normal string email address', () => {
		const executionFunctions = mock<IExecuteFunctions>({
			getNode: jest.fn(() => mock<INode>()),
		});

		const result = prepareEmailsInput.call(
			executionFunctions,
			'test@example.com',
			'To',
			0,
		);
		expect(result).toBe('<test@example.com>, ');
	});

	it('should coerce a number to string and process it (will fail validation for non-email)', () => {
		const executionFunctions = mock<IExecuteFunctions>({
			getNode: jest.fn(() => mock<INode>()),
		});

		// A number without "@" should throw an "Invalid email address" error (not "trim is not a function")
		expect(() =>
			prepareEmailsInput.call(executionFunctions, 42 as unknown as string, 'To', 0),
		).toThrow('Invalid email address');
	});

	it('should coerce a number that looks like an email-containing value', () => {
		const executionFunctions = mock<IExecuteFunctions>({
			getNode: jest.fn(() => mock<INode>()),
		});

		// Ensure String() coercion is applied and does not throw "trim is not a function"
		expect(() =>
			prepareEmailsInput.call(executionFunctions, 123 as unknown as string, 'Message', 0),
		).toThrow('Invalid email address');
	});
});

describe('prepareEmailBody', () => {
	it('should handle a normal string message', () => {
		const executionFunctions = mock<IExecuteFunctions>({
			getNode: jest.fn(() => mock<INode>()),
			getNodeParameter: jest.fn((paramName: string) => {
				if (paramName === 'emailType') return 'text';
				if (paramName === 'message') return 'Hello World';
				return '';
			}),
		});

		const result = prepareEmailBody.call(executionFunctions, 0);
		expect(result.body).toBe('Hello World');
		expect(result.htmlBody).toBe('');
	});

	it('should coerce a numeric message to string without throwing "trim is not a function"', () => {
		const executionFunctions = mock<IExecuteFunctions>({
			getNode: jest.fn(() => mock<INode>()),
			getNodeParameter: jest.fn((paramName: string) => {
				if (paramName === 'emailType') return 'text';
				if (paramName === 'message') return 42; // numeric value from expression
				return '';
			}),
		});

		// Should not throw - numeric value gets coerced to string "42"
		const result = prepareEmailBody.call(executionFunctions, 0);
		expect(result.body).toBe('42');
		expect(result.htmlBody).toBe('');
	});

	it('should coerce null/undefined message to empty string', () => {
		const executionFunctions = mock<IExecuteFunctions>({
			getNode: jest.fn(() => mock<INode>()),
			getNodeParameter: jest.fn((paramName: string) => {
				if (paramName === 'emailType') return 'text';
				if (paramName === 'message') return null;
				return '';
			}),
		});

		const result = prepareEmailBody.call(executionFunctions, 0);
		expect(result.body).toBe('');
		expect(result.htmlBody).toBe('');
	});

	it('should handle html email type with numeric message', () => {
		const executionFunctions = mock<IExecuteFunctions>({
			getNode: jest.fn(() => mock<INode>()),
			getNodeParameter: jest.fn((paramName: string) => {
				if (paramName === 'emailType') return 'html';
				if (paramName === 'message') return 100;
				return '';
			}),
		});

		const result = prepareEmailBody.call(executionFunctions, 0);
		expect(result.htmlBody).toBe('100');
		expect(result.body).toBe('');
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
