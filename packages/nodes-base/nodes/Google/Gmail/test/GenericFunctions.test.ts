import { encodeEmail } from '../GenericFunctions';

const { mailComposerOptions } = vi.hoisted(() => ({
	mailComposerOptions: vi.fn(),
}));

vi.mock('nodemailer/lib/mail-composer', () => ({
	default: class MailComposer {
		constructor(options: unknown) {
			mailComposerOptions(options);
		}

		compile() {
			return {
				keepBcc: false,
				build: vi.fn().mockResolvedValue(Buffer.from('email')),
			};
		}
	},
}));

describe('Gmail email encoding', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('applies content access restrictions to generated emails', async () => {
		await encodeEmail({
			subject: 'Test subject',
			body: 'Test body',
		});

		expect(mailComposerOptions).toHaveBeenCalledWith(
			expect.objectContaining({
				disableFileAccess: true,
				disableUrlAccess: true,
			}),
		);
	});
});
