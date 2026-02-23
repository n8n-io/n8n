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
	it('should handle a string email address correctly', () => {
		const executionFunctions = mock<IExecuteFunctions>({
			getNode: () => node,
		});

		const result = prepareEmailsInput.call(
			executionFunctions,
			'test@example.com',
			'To',
			0,
		);

		expect(result).toContain('test@example.com');
	});

	it('should convert a number to string and throw for invalid email (no @)', () => {
		// A number like 1 becomes "1" which has no @, so it should throw
		const executionFunctions = mock<IExecuteFunctions>({
			getNode: () => node,
		});

		expect(() =>
			prepareEmailsInput.call(executionFunctions, 1 as unknown as string, 'To', 0),
		).toThrow('Invalid email address');
	});

	it('should not throw when given a valid email string even if it came from an expression returning a string', () => {
		const executionFunctions = mock<IExecuteFunctions>({
			getNode: () => node,
		});

		const result = prepareEmailsInput.call(
			executionFunctions,
			'user@example.com',
			'To',
			0,
		);

		expect(result).toBe('<user@example.com>, ');
	});

	it('should handle multiple comma-separated email addresses', () => {
		const executionFunctions = mock<IExecuteFunctions>({
			getNode: () => node,
		});

		const result = prepareEmailsInput.call(
			executionFunctions,
			'a@example.com, b@example.com',
			'To',
			0,
		);

		expect(result).toContain('a@example.com');
		expect(result).toContain('b@example.com');
	});
});

describe('prepareEmailBody', () => {
	it('should handle a non-string message value (number) without throwing', () => {
		// This simulates the case where an expression returns a number (e.g. $json.code = 1)
		const executionFunctions = mock<IExecuteFunctions>({
			getNode: () => node,
			getNodeParameter: (parameterName: string) => {
				if (parameterName === 'emailType') return 'text';
				if (parameterName === 'message') return 42; // number, not a string
				return '';
			},
		});

		let result: ReturnType<typeof prepareEmailBody>;
		expect(() => {
			result = prepareEmailBody.call(executionFunctions, 0);
		}).not.toThrow();

		expect(result!.body).toBe('42');
	});

	it('should handle a string message value correctly', () => {
		const executionFunctions = mock<IExecuteFunctions>({
			getNode: () => node,
			getNodeParameter: (parameterName: string) => {
				if (parameterName === 'emailType') return 'text';
				if (parameterName === 'message') return 'Hello World';
				return '';
			},
		});

		const result = prepareEmailBody.call(executionFunctions, 0);

		expect(result.body).toBe('Hello World');
	});

	it('should handle an object/null message value without throwing', () => {
		const executionFunctions = mock<IExecuteFunctions>({
			getNode: () => node,
			getNodeParameter: (parameterName: string) => {
				if (parameterName === 'emailType') return 'text';
				if (parameterName === 'message') return null;
				return '';
			},
		});

		let result: ReturnType<typeof prepareEmailBody>;
		expect(() => {
			result = prepareEmailBody.call(executionFunctions, 0);
		}).not.toThrow();

		expect(result!.body).toBe('null');
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
