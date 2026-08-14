import { mock } from 'vitest-mock-extended';
import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import {
	encodeEmail,
	googleApiRequest,
	prepareEmailAttachments,
	prepareEmailBody,
	prepareEmailsInput,
} from '../../GenericFunctions';
import type { GmailMessage, GmailMessageMetadata, GmailUserProfile } from '../../types';
import { replyToEmail } from '../../utils/replyToEmail';
import type * as _importType0 from '../../GenericFunctions';

vi.mock('../../GenericFunctions', async () => ({
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	...(await vi.importActual<typeof _importType0>('../../GenericFunctions')),
	googleApiRequest: vi.fn(),
	prepareEmailsInput: vi.fn(),
	prepareEmailAttachments: vi.fn(),
	prepareEmailBody: vi.fn(),
	encodeEmail: vi.fn(),
}));

const mockedGoogleApiRequest = vi.mocked(googleApiRequest);
const mockedPrepareEmailsInput = vi.mocked(prepareEmailsInput);
const mockedPrepareEmailAttachments = vi.mocked(prepareEmailAttachments);
const mockedPrepareEmailBody = vi.mocked(prepareEmailBody);
const mockedEncodeEmail = vi.mocked(encodeEmail);

describe('replyToEmail', () => {
	let mockExecuteFunctions: IExecuteFunctions;

	beforeEach(() => {
		mockExecuteFunctions = mock<IExecuteFunctions>();
		vi.clearAllMocks();

		mockedPrepareEmailsInput.mockReturnValue('test@example.com, ');
		mockedPrepareEmailAttachments.mockResolvedValue([]);
		mockedPrepareEmailBody.mockReturnValue({
			body: 'Test message body',
			htmlBody: '',
		});
		mockedEncodeEmail.mockResolvedValue('rawString');
	});

	const mockMessageMetadata: GmailMessageMetadata = {
		id: 'message123',
		threadId: 'thread123',
		labelIds: ['INBOX'],
		payload: {
			partId: '',
			mimeType: 'text/plain',
			filename: '',
			headers: [
				{ name: 'Subject', value: 'Original Subject' },
				{ name: 'Message-ID', value: '<original@example.com>' },
				{ name: 'From', value: 'John Doe <john@example.com>' },
				{ name: 'To', value: 'recipient1@example.com,recipient2@example.com' },
			],
			body: { attachmentId: '', size: 0, data: '' },
			parts: [],
		},
	};

	const mockUserProfile: GmailUserProfile = {
		emailAddress: 'user@gmail.com',
		messagesTotal: 100,
		threadsTotal: 50,
		historyId: 'history123',
	};

	const mockSentMessage: GmailMessage = {
		id: 'sent123',
		threadId: 'thread123',
		labelIds: ['SENT'],
		snippet: 'Reply message...',
		historyId: 'history124',
		sizeEstimate: 1000,
		raw: 'encoded-email-content',
		payload: mockMessageMetadata.payload,
	};

	test('should reply to email with basic options', async () => {
		mockedGoogleApiRequest
			.mockResolvedValueOnce(mockMessageMetadata) // GET message metadata
			.mockResolvedValueOnce(mockUserProfile) // GET user profile
			.mockResolvedValueOnce(mockSentMessage); // POST send message

		const options: IDataObject = {};
		const result = await replyToEmail.call(mockExecuteFunctions, 'message123', options, 0, 2.2);

		expect(mockedGoogleApiRequest).toHaveBeenNthCalledWith(
			1,
			'GET',
			'/gmail/v1/users/me/messages/message123',
			{},
			{ format: 'metadata' },
		);
		expect(mockedGoogleApiRequest).toHaveBeenNthCalledWith(2, 'GET', '/gmail/v1/users/me/profile');

		expect(mockedGoogleApiRequest).toHaveBeenNthCalledWith(
			3,
			'POST',
			'/gmail/v1/users/me/messages/send',
			expect.objectContaining({
				threadId: 'thread123',
				raw: expect.any(String),
			}),
			{ format: 'metadata' },
		);

		expect(mockedEncodeEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				from: '',
				to: 'John Doe <john@example.com>, <recipient1@example.com>, <recipient2@example.com>',
				cc: '',
				bcc: '',
				subject: 'Original Subject',
				attachments: [],
				inReplyTo: '<original@example.com>',
				reference: '<original@example.com>',
				body: 'Test message body',
				htmlBody: '',
			}),
		);

		expect(result).toEqual(mockSentMessage);
	});

	test('should handle CC list when provided', async () => {
		mockedGoogleApiRequest
			.mockResolvedValueOnce(mockMessageMetadata)
			.mockResolvedValueOnce(mockUserProfile)
			.mockResolvedValueOnce(mockSentMessage);

		mockedPrepareEmailsInput.mockReturnValue('cc@example.com, ');

		const options: IDataObject = {
			ccList: 'cc@example.com',
		};

		await replyToEmail.call(mockExecuteFunctions, 'message123', options, 0, 2.2);

		expect(mockedPrepareEmailsInput).toHaveBeenCalledWith('cc@example.com', 'CC', 0);

		// Verify encodeEmail was called with CC list
		expect(mockedEncodeEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				cc: 'cc@example.com, ',
				bcc: '',
			}),
		);
	});

	test('should handle BCC list when provided', async () => {
		mockedGoogleApiRequest
			.mockResolvedValueOnce(mockMessageMetadata)
			.mockResolvedValueOnce(mockUserProfile)
			.mockResolvedValueOnce(mockSentMessage);

		mockedPrepareEmailsInput.mockReturnValue('bcc@example.com, ');

		const options: IDataObject = {
			bccList: 'bcc@example.com',
		};

		await replyToEmail.call(mockExecuteFunctions, 'message123', options, 0, 2.2);

		expect(mockedPrepareEmailsInput).toHaveBeenCalledWith('bcc@example.com', 'BCC', 0);

		// Verify encodeEmail was called with BCC list
		expect(mockedEncodeEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				cc: '',
				bcc: 'bcc@example.com, ',
			}),
		);
	});

	test('should handle attachments when provided', async () => {
		const mockAttachments = [
			{ name: 'file1.txt', content: Buffer.from('content'), type: 'text/plain' },
			{ name: 'file2.pdf', content: Buffer.from('pdf content'), type: 'application/pdf' },
		];

		mockedGoogleApiRequest
			.mockResolvedValueOnce(mockMessageMetadata)
			.mockResolvedValueOnce(mockUserProfile)
			.mockResolvedValueOnce(mockSentMessage);

		mockedPrepareEmailAttachments.mockResolvedValue(mockAttachments);

		const options: IDataObject = {
			attachmentsUi: {
				attachmentsBinary: [{ property: 'attachment1' }, { property: 'attachment2' }],
			},
		};

		await replyToEmail.call(mockExecuteFunctions, 'message123', options, 0, 2.2);

		expect(mockedPrepareEmailAttachments).toHaveBeenCalledWith(options.attachmentsUi, 0);

		// Should use upload media endpoint when attachments are present
		expect(mockedGoogleApiRequest).toHaveBeenNthCalledWith(
			3,
			'POST',
			'/gmail/v1/users/me/messages/send',
			expect.anything(),
			expect.objectContaining({
				userId: 'me',
				uploadType: 'media',
				format: 'metadata',
			}),
		);

		// Verify encodeEmail was called with attachments
		expect(mockedEncodeEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				attachments: mockAttachments,
			}),
		);
	});

	test('should reply to sender only when replyToSenderOnly is true', async () => {
		const messageWithMultipleRecipients = {
			...mockMessageMetadata,
			payload: {
				...mockMessageMetadata.payload,
				headers: [
					{ name: 'Subject', value: 'Original Subject' },
					{ name: 'Message-ID', value: '<original@example.com>' },
					{ name: 'From', value: 'John Doe <john@example.com>' },
					{ name: 'To', value: 'recipient1@example.com, recipient2@example.com, user@gmail.com' },
					{ name: 'Cc', value: 'cc1@example.com, cc2@example.com' },
				],
			},
		};

		mockedGoogleApiRequest
			.mockResolvedValueOnce(messageWithMultipleRecipients)
			.mockResolvedValueOnce(mockUserProfile)
			.mockResolvedValueOnce(mockSentMessage);

		const options: IDataObject = {
			replyToSenderOnly: true,
		};

		await replyToEmail.call(mockExecuteFunctions, 'message123', options, 0, 2.2);

		// Verify that only the sender is included in the "To" field
		expect(mockedEncodeEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				from: '',
				to: 'John Doe <john@example.com>',
				cc: '',
				bcc: '',
				subject: 'Original Subject',
				inReplyTo: '<original@example.com>',
				reference: '<original@example.com>',
			}),
		);
	});

	test('should reply to recipients only when replyToRecipientsOnly is true', async () => {
		const messageWithUserInTo = {
			...mockMessageMetadata,
			payload: {
				...mockMessageMetadata.payload,
				headers: [
					{ name: 'Subject', value: 'Original Subject' },
					{ name: 'Message-ID', value: '<original@example.com>' },
					{ name: 'From', value: '<john@example.com>' },
					{ name: 'To', value: 'recipient1@example.com,user@gmail.com,recipient2@example.com' },
				],
			},
		};

		mockedGoogleApiRequest
			.mockResolvedValueOnce(messageWithUserInTo)
			.mockResolvedValueOnce(mockUserProfile)
			.mockResolvedValueOnce(mockSentMessage);

		const options: IDataObject = {
			replyToRecipientsOnly: true,
		};

		await replyToEmail.call(mockExecuteFunctions, 'message123', options, 0, 2.2);

		// Should filter out the current user's email from recipients and exclude sender
		expect(mockedEncodeEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				from: '',
				// Should include sender and original recipients but filter out current user
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				to: expect.stringContaining('<recipient1@example.com>'),
				subject: 'Original Subject',
				inReplyTo: '<original@example.com>',
				reference: '<original@example.com>',
			}),
		);

		// Should not include the current user's email address
		expect(mockedEncodeEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: '<recipient1@example.com>, <recipient2@example.com>',
			}),
		);
	});

	test('should use custom sender name when provided', async () => {
		mockedGoogleApiRequest
			.mockResolvedValueOnce(mockMessageMetadata)
			.mockResolvedValueOnce(mockUserProfile)
			.mockResolvedValueOnce(mockSentMessage);

		const options: IDataObject = {
			senderName: 'Custom Sender Name',
		};

		await replyToEmail.call(mockExecuteFunctions, 'message123', options, 0, 2.2);

		expect(mockedEncodeEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				from: 'Custom Sender Name <user@gmail.com>',
			}),
		);
	});

	test('should handle emails with angle brackets correctly', async () => {
		const messageWithBrackets = {
			...mockMessageMetadata,
			payload: {
				...mockMessageMetadata.payload,
				headers: [
					{ name: 'Subject', value: 'Original Subject' },
					{ name: 'Message-ID', value: '<original@example.com>' },
					{ name: 'From', value: 'John Doe <john@example.com>' },
					{ name: 'To', value: 'Regular Email <regular@example.com>, plain@example.com' },
				],
			},
		};

		mockedGoogleApiRequest
			.mockResolvedValueOnce(messageWithBrackets)
			.mockResolvedValueOnce(mockUserProfile)
			.mockResolvedValueOnce(mockSentMessage);

		const options: IDataObject = {};

		await replyToEmail.call(mockExecuteFunctions, 'message123', options, 0, 2.2);

		// Should handle both formats correctly
		expect(mockedGoogleApiRequest).toHaveBeenNthCalledWith(
			3,
			'POST',
			'/gmail/v1/users/me/messages/send',
			expect.objectContaining({
				threadId: 'thread123',
			}),
			{ format: 'metadata' },
		);
	});

	test('should filter out current user email from recipients', async () => {
		const messageWithUserEmail = {
			...mockMessageMetadata,
			payload: {
				...mockMessageMetadata.payload,
				headers: [
					{ name: 'Subject', value: 'Original Subject' },
					{ name: 'Message-ID', value: '<original@example.com>' },
					// user@gmail.com - current user, user_from@gmail.com - sender that should be excluded
					{ name: 'From', value: '<user_from@gmail.com>' },
					{ name: 'To', value: 'recipient@example.com,user@gmail.com' },
				],
			},
		};

		mockedGoogleApiRequest
			.mockResolvedValueOnce(messageWithUserEmail)
			.mockResolvedValueOnce(mockUserProfile)
			.mockResolvedValueOnce(mockSentMessage);

		const options: IDataObject = {};

		await replyToEmail.call(mockExecuteFunctions, 'message123', options, 0, 2.2);

		expect(mockedGoogleApiRequest).toHaveBeenCalledTimes(3);

		expect(mockedEncodeEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: '<user_from@gmail.com>, <recipient@example.com>',
			}),
		);
	});

	test('should handle missing subject header', async () => {
		const messageWithoutSubject = {
			...mockMessageMetadata,
			payload: {
				...mockMessageMetadata.payload,
				headers: [
					{ name: 'Message-ID', value: '<original@example.com>' },
					{ name: 'From', value: 'John Doe <john@example.com>' },
					{ name: 'To', value: 'recipient@example.com' },
				],
			},
		};

		mockedGoogleApiRequest
			.mockResolvedValueOnce(messageWithoutSubject)
			.mockResolvedValueOnce(mockUserProfile)
			.mockResolvedValueOnce(mockSentMessage);

		const options: IDataObject = {};

		await replyToEmail.call(mockExecuteFunctions, 'message123', options, 0, 2.2);

		// Should handle missing subject gracefully (empty string)
		expect(mockedGoogleApiRequest).toHaveBeenCalledTimes(3);
	});

	test('should handle missing message ID header', async () => {
		const messageWithoutMessageId = {
			...mockMessageMetadata,
			payload: {
				...mockMessageMetadata.payload,
				headers: [
					{ name: 'Subject', value: 'Original Subject' },
					{ name: 'From', value: 'John Doe <john@example.com>' },
					{ name: 'To', value: 'recipient@example.com' },
				],
			},
		};

		mockedGoogleApiRequest
			.mockResolvedValueOnce(messageWithoutMessageId)
			.mockResolvedValueOnce(mockUserProfile)
			.mockResolvedValueOnce(mockSentMessage);

		const options: IDataObject = {};

		await replyToEmail.call(mockExecuteFunctions, 'message123', options, 0, 2.2);

		// Should handle missing message ID gracefully (empty string)
		expect(mockedGoogleApiRequest).toHaveBeenCalledTimes(3);
	});

	test('should use prepareEmailBody for message content', async () => {
		mockedGoogleApiRequest
			.mockResolvedValueOnce(mockMessageMetadata)
			.mockResolvedValueOnce(mockUserProfile)
			.mockResolvedValueOnce(mockSentMessage);

		mockedPrepareEmailBody.mockReturnValue({
			body: 'Custom message content',
			htmlBody: '<p>Custom HTML content</p>',
		});

		const options: IDataObject = {};

		await replyToEmail.call(mockExecuteFunctions, 'message123', options, 0, 2.2);

		expect(mockedPrepareEmailBody).toHaveBeenCalledWith(0);
	});

	test('should encode email with proper structure including all required fields', async () => {
		mockedGoogleApiRequest
			.mockResolvedValueOnce(mockMessageMetadata)
			.mockResolvedValueOnce(mockUserProfile)
			.mockResolvedValueOnce(mockSentMessage);

		mockedPrepareEmailBody.mockReturnValue({
			body: 'Reply message body',
			htmlBody: '<p>Reply HTML body</p>',
		});

		const options: IDataObject = {
			ccList: 'cc@example.com',
			bccList: 'bcc@example.com',
			senderName: 'Test Sender',
		};

		mockedPrepareEmailsInput
			.mockReturnValueOnce('cc@example.com, ')
			.mockReturnValueOnce('bcc@example.com, ');

		await replyToEmail.call(mockExecuteFunctions, 'message123', options, 0, 2.2);

		expect(mockedEncodeEmail).toHaveBeenCalledWith({
			from: 'Test Sender <user@gmail.com>',
			to: 'John Doe <john@example.com>, <recipient1@example.com>, <recipient2@example.com>',
			cc: 'cc@example.com, ',
			bcc: 'bcc@example.com, ',
			subject: 'Original Subject',
			attachments: [],
			inReplyTo: '<original@example.com>',
			reference: '<original@example.com>',
			body: 'Reply message body',
			htmlBody: '<p>Reply HTML body</p>',
		});
	});

	test('should handle missing headers gracefully in encodeEmail', async () => {
		const messageWithoutHeaders = {
			...mockMessageMetadata,
			payload: {
				...mockMessageMetadata.payload,
				headers: [
					{ name: 'From', value: 'sender@example.com' },
					// Missing Subject and Message-ID headers
				],
			},
		};

		mockedGoogleApiRequest
			.mockResolvedValueOnce(messageWithoutHeaders)
			.mockResolvedValueOnce(mockUserProfile)
			.mockResolvedValueOnce(mockSentMessage);

		const options: IDataObject = {};

		await replyToEmail.call(mockExecuteFunctions, 'message123', options, 0, 2.2);

		// Should handle missing headers with empty strings
		expect(mockedEncodeEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				subject: '', // Empty when header is missing
				inReplyTo: '', // Empty when header is missing
				reference: '', // Empty when header is missing
				to: '<sender@example.com>',
			}),
		);
	});

	test('should properly format email addresses with and without angle brackets', async () => {
		const messageWithMixedEmailFormats = {
			...mockMessageMetadata,
			payload: {
				...mockMessageMetadata.payload,
				headers: [
					{ name: 'Subject', value: 'Test Subject' },
					{ name: 'Message-ID', value: '<test@example.com>' },
					{ name: 'From', value: 'plain@example.com' }, // Without brackets
					{ name: 'To', value: 'Name <with@brackets.com>, plain2@example.com' },
				],
			},
		};

		mockedGoogleApiRequest
			.mockResolvedValueOnce(messageWithMixedEmailFormats)
			.mockResolvedValueOnce(mockUserProfile)
			.mockResolvedValueOnce(mockSentMessage);

		const options: IDataObject = {};

		await replyToEmail.call(mockExecuteFunctions, 'message123', options, 0, 2.2);

		// Should properly format emails with brackets
		expect(mockedEncodeEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				to: expect.stringContaining('<plain@example.com>'), // Should add brackets
			}),
		);
		expect(mockedEncodeEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				to: expect.stringContaining('Name <with@brackets.com>'), // Should keep existing brackets
			}),
		);
	});

	test('should use ignore Reply-To header, when Reply-To header is provided for version < 2.2', async () => {
		const messageWithReplyToHeader = {
			...mockMessageMetadata,
			payload: {
				...mockMessageMetadata.payload,
				headers: [
					...mockMessageMetadata.payload.headers,
					{ name: 'Reply-To', value: 'reply-to@example.com' },
				],
			},
		};

		mockedGoogleApiRequest
			.mockResolvedValueOnce(messageWithReplyToHeader)
			.mockResolvedValueOnce(mockUserProfile)
			.mockResolvedValueOnce(mockSentMessage);

		const options: IDataObject = {};

		await replyToEmail.call(mockExecuteFunctions, 'message123', options, 0, 2.1);

		expect(mockedEncodeEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				to: expect.stringContaining('<john@example.com>'),
			}),
		);
	});

	test('should use Reply-To header instead of From, when Reply-To header is provided for version >= 2.2', async () => {
		const messageWithReplyToHeader = {
			...mockMessageMetadata,
			payload: {
				...mockMessageMetadata.payload,
				headers: [
					...mockMessageMetadata.payload.headers,
					{ name: 'Reply-To', value: 'reply-to@example.com' },
				],
			},
		};

		mockedGoogleApiRequest
			.mockResolvedValueOnce(messageWithReplyToHeader)
			.mockResolvedValueOnce(mockUserProfile)
			.mockResolvedValueOnce(mockSentMessage);

		const options: IDataObject = {};

		await replyToEmail.call(mockExecuteFunctions, 'message123', options, 0, 2.2);

		expect(mockedEncodeEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				to: expect.stringContaining('<reply-to@example.com>'),
			}),
		);
	});

	const buildHeaders = ({
		from = 'John Doe <john@example.com>',
		to = 'recipient@example.com',
		replyTo,
	}: {
		from?: string;
		to?: string;
		replyTo?: string;
	}) => {
		const headers = [
			{ name: 'Subject', value: 'Original Subject' },
			{ name: 'Message-ID', value: '<original@example.com>' },
			{ name: 'From', value: from },
			{ name: 'To', value: to },
		];
		if (replyTo !== undefined) headers.push({ name: 'Reply-To', value: replyTo });
		return headers;
	};

	const runReply = async (
		headers: Array<{ name: string; value: string }>,
		options: IDataObject,
	) => {
		mockedGoogleApiRequest
			.mockResolvedValueOnce({
				...mockMessageMetadata,
				payload: { ...mockMessageMetadata.payload, headers },
			})
			.mockResolvedValueOnce(mockUserProfile)
			.mockResolvedValueOnce(mockSentMessage);
		await replyToEmail.call(mockExecuteFunctions, 'message123', options, 0, 2.2);
	};

	// Address-list parsing for the derived recipient (`to`) string. The reply-to
	// header is parsed per-address, so no case produces a malformed `<a, b>`
	// recipient. `replyToSenderOnly` off appends the original To recipient, which
	// is processed before Reply-To.
	test.each([
		{
			name: 'single Reply-To, sender-only on',
			headers: buildHeaders({ replyTo: 'jacob@example.com' }),
			options: { replyToSenderOnly: true },
			expectedTo: '<jacob@example.com>',
		},
		{
			name: 'single Reply-To, sender-only off',
			headers: buildHeaders({ replyTo: 'jacob@example.com' }),
			options: {},
			expectedTo: '<recipient@example.com>, <jacob@example.com>',
		},
		{
			name: 'two Reply-To addresses, sender-only on',
			headers: buildHeaders({ replyTo: 'jacob@example.com, charles@example.com' }),
			options: { replyToSenderOnly: true },
			expectedTo: '<jacob@example.com>, <charles@example.com>',
		},
		{
			name: 'two Reply-To addresses, sender-only off',
			headers: buildHeaders({ replyTo: 'jacob@example.com, charles@example.com' }),
			options: {},
			expectedTo: '<recipient@example.com>, <jacob@example.com>, <charles@example.com>',
		},
		{
			name: 'comma-separated multi-address From (no Reply-To)',
			headers: buildHeaders({ from: 'jacob@example.com, charles@example.com' }),
			options: { replyToSenderOnly: true },
			expectedTo: '<jacob@example.com>, <charles@example.com>',
		},
		{
			name: 'display name containing a comma',
			headers: buildHeaders({ replyTo: '"Doe, Jacob" <jacob@example.com>, charles@example.com' }),
			options: { replyToSenderOnly: true },
			expectedTo: '"Doe, Jacob" <jacob@example.com>, <charles@example.com>',
		},
		{
			name: 'trailing comma',
			headers: buildHeaders({ replyTo: 'jacob@example.com,' }),
			options: { replyToSenderOnly: true },
			expectedTo: '<jacob@example.com>',
		},
		{
			name: 'mixed bracketed and plain addresses',
			headers: buildHeaders({ replyTo: 'Jacob <jacob@example.com>, plain@example.com' }),
			options: { replyToSenderOnly: true },
			expectedTo: 'Jacob <jacob@example.com>, <plain@example.com>',
		},
		{
			name: 'empty Reply-To',
			headers: buildHeaders({ replyTo: '' }),
			options: {},
			expectedTo: '<recipient@example.com>',
		},
		{
			name: 'whitespace-only Reply-To',
			headers: buildHeaders({ replyTo: '   ' }),
			options: {},
			expectedTo: '<recipient@example.com>',
		},
		{
			name: 'name-only Reply-To (no address)',
			headers: buildHeaders({ replyTo: '"No Address Here"' }),
			options: {},
			expectedTo: '<recipient@example.com>',
		},
		{
			// Thread replies share this util and expose `replyToRecipientsOnly`.
			name: 'replyToRecipientsOnly splits the To header (thread path)',
			headers: buildHeaders({
				to: '"Doe, Jane" <jane@example.com>, bob@example.com',
				replyTo: undefined,
			}),
			options: { replyToRecipientsOnly: true },
			expectedTo: '"Doe, Jane" <jane@example.com>, <bob@example.com>',
		},
		{
			name: 'group-syntax address header',
			headers: buildHeaders({ replyTo: 'Team:a@example.com,b@example.com;' }),
			options: { replyToSenderOnly: true },
			expectedTo: '<a@example.com>, <b@example.com>',
		},
		{
			// mockUserProfile.emailAddress is user@gmail.com. Self-reply keeps the
			// sender rather than filtering it out (no empty recipient).
			name: 'own address in Reply-To is kept on self-reply',
			headers: buildHeaders({ replyTo: 'user@gmail.com' }),
			options: { replyToSenderOnly: true },
			expectedTo: '<user@gmail.com>',
		},
		{
			name: 'own address in To is filtered case-insensitively',
			headers: buildHeaders({
				from: 'sender@example.com',
				to: 'User@Gmail.com, other@example.com',
			}),
			options: { replyToRecipientsOnly: true },
			expectedTo: '<other@example.com>',
		},
		{
			name: 'display name with embedded quotes is escaped',
			headers: buildHeaders({ replyTo: '"Jacob \\"J\\" Doe" <jacob@example.com>' }),
			options: { replyToSenderOnly: true },
			expectedTo: '"Jacob \\"J\\" Doe" <jacob@example.com>',
		},
		{
			// Degenerate: sender-only skips the To header, so a Reply-To that parses
			// to no address leaves an empty recipient list.
			name: 'empty Reply-To with sender-only yields no recipient',
			headers: buildHeaders({ replyTo: '' }),
			options: { replyToSenderOnly: true },
			expectedTo: '',
		},
	])('should build a clean recipient list: $name', async ({ headers, options, expectedTo }) => {
		await runReply(headers, options);

		expect(mockedEncodeEmail).toHaveBeenCalledWith(expect.objectContaining({ to: expectedTo }));
	});
});
