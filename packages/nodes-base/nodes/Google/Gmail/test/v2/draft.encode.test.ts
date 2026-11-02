import type { IExecuteFunctions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { encodeEmail, googleApiRequest } from '../../GenericFunctions';
import type * as genericFunctionsModule from '../../GenericFunctions';
import type { IEmail } from '@utils/sendAndWait/interfaces';
import { addThreadHeadersToEmail } from '../../v2/utils/draft';

// Only googleApiRequest is mocked; encodeEmail runs for real so the assertions
// read the MIME message Gmail receives. The headers were set on an IEmail field
// encodeEmail never read, which no test at that layer could catch.
vi.mock('../../GenericFunctions', async () => ({
	...(await vi.importActual<typeof genericFunctionsModule>('../../GenericFunctions')),
	googleApiRequest: vi.fn(),
}));

const MESSAGE_ID = '<message-id@example.com>';

const thread = {
	messages: [
		{ payload: { headers: [{ name: 'Message-ID', value: '<older@example.com>' }] } },
		{ payload: { headers: [{ name: 'Message-ID', value: MESSAGE_ID }] } },
	],
};

// Unfold folded header lines before matching, as nodemailer wraps long headers.
const headerValue = (mime: string, name: string): string | undefined =>
	mime.replace(/\r?\n[ \t]+/g, ' ').match(new RegExp(`^${name}: (.+)$`, 'm'))?.[1];

describe('addThreadHeadersToEmail — real encodeEmail round-trip', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(googleApiRequest).mockResolvedValue(thread);
	});

	const encodeThreadedDraft = async () => {
		const email: IEmail = { subject: 'Re: Original', body: 'Reply body', to: 'to@example.com' };
		await addThreadHeadersToEmail.call(mock<IExecuteFunctions>(), email, 'thread123');
		return Buffer.from(await encodeEmail(email), 'base64').toString('utf8');
	};

	// Non-Gmail clients thread on these two headers, and References carries the
	// whole chain, so dropping it breaks threading everywhere except Gmail.
	it.each(['In-Reply-To', 'References'])('carries the %s header', async (name) => {
		expect(headerValue(await encodeThreadedDraft(), name)).toBe(MESSAGE_ID);
	});

	it('omits both headers when the thread has no messages', async () => {
		vi.mocked(googleApiRequest).mockResolvedValue({});

		const mime = await encodeThreadedDraft();

		expect(headerValue(mime, 'In-Reply-To')).toBeUndefined();
		expect(headerValue(mime, 'References')).toBeUndefined();
	});
});
