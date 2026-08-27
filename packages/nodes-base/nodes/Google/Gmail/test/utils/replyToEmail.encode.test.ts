import type { IExecuteFunctions } from 'n8n-workflow';
import addressparser from 'nodemailer/lib/addressparser';
import { mock } from 'vitest-mock-extended';

import { googleApiRequest } from '../../GenericFunctions';
import type * as genericFunctionsModule from '../../GenericFunctions';
import type { GmailMessage, GmailMessageMetadata, GmailUserProfile } from '../../types';
import { replyToEmail } from '../../utils/replyToEmail';

// Only googleApiRequest is mocked here; encodeEmail runs for real so the derived
// recipient string is exercised through nodemailer's MailComposer — the layer
// where the multi-address Reply-To bug actually manifested.
vi.mock('../../GenericFunctions', async () => ({
	...(await vi.importActual<typeof genericFunctionsModule>('../../GenericFunctions')),
	googleApiRequest: vi.fn(),
}));

const mockedGoogleApiRequest = vi.mocked(googleApiRequest);

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
	snippet: '',
	historyId: 'history124',
	sizeEstimate: 1000,
	raw: '',
	payload: {
		partId: '',
		mimeType: 'text/plain',
		filename: '',
		headers: [],
		body: { attachmentId: '', size: 0, data: '' },
		parts: [],
	},
};

const buildMetadata = (replyTo: string): GmailMessageMetadata => ({
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
			{ name: 'To', value: 'recipient@example.com' },
			{ name: 'Reply-To', value: replyTo },
		],
		body: { attachmentId: '', size: 0, data: '' },
		parts: [],
	},
});

// Decode the base64url `raw` payload and unfold folded header lines.
const decodeToHeader = (raw: string): string => {
	const mime = Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
		.toString('utf8')
		.replace(/\r?\n[ \t]+/g, ' ');
	return mime.match(/^To: (.+)$/m)?.[1] ?? '';
};

describe('replyToEmail — real encodeEmail round-trip', () => {
	let mockExecuteFunctions: IExecuteFunctions;

	beforeEach(() => {
		mockExecuteFunctions = mock<IExecuteFunctions>();
		vi.clearAllMocks();
	});

	test.each([
		{
			name: 'plain comma-separated addresses',
			replyTo: 'jacob@example.com, charles@example.com',
			expectedRecipients: ['jacob@example.com', 'charles@example.com'],
		},
		{
			name: 'display name containing a comma',
			replyTo: '"Doe, Jacob" <jacob@example.com>, charles@example.com',
			expectedRecipients: ['jacob@example.com', 'charles@example.com'],
		},
	])(
		'produces a valid multi-recipient To header: $name',
		async ({ replyTo, expectedRecipients }) => {
			mockedGoogleApiRequest
				.mockResolvedValueOnce(buildMetadata(replyTo))
				.mockResolvedValueOnce(mockUserProfile)
				.mockResolvedValueOnce(mockSentMessage);

			await replyToEmail.call(
				mockExecuteFunctions,
				'message123',
				{ replyToSenderOnly: true },
				0,
				2.2,
			);

			const sendCall = mockedGoogleApiRequest.mock.calls.find(
				(call) => call[1] === '/gmail/v1/users/me/messages/send',
			);
			const body = sendCall?.[2] as { raw: string };
			const toHeader = decodeToHeader(body.raw);

			// The two addresses must survive as distinct recipients, not a single
			// malformed `"a, b"@domain` address (the reported bug).
			expect(addressparser(toHeader, { flatten: true }).map((a) => a.address)).toEqual(
				expectedRecipients,
			);
		},
	);
});
