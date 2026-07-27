import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { type MockProxy, mock } from 'vitest-mock-extended';

import * as genericFunctions from '../../GenericFunctions';
import type * as genericFunctionsType from '../../GenericFunctions';
import { createSendAndWaitEmail } from '../../v2/hitl/email';

vi.mock('../../GenericFunctions', async () => {
	const originalModule =
		await vi.importActual<typeof genericFunctionsType>('../../GenericFunctions');
	return {
		...originalModule,
		googleApiRequest: vi.fn(),
	};
});

describe('Gmail sendAndWait email builder', () => {
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;

	const setupParameters = (overrides: Record<string, unknown> = {}) => {
		const params: Record<string, unknown> = {
			sendTo: 'to@example.com',
			message: 'my message',
			subject: 'my subject',
			'approvalOptions.values': {},
			options: {},
			responseType: 'approval',
			advancedEmail: true,
			advancedEmailOptions: {},
			...overrides,
		};
		mockExecuteFunctions.getNodeParameter.mockImplementation(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(parameterName: string, _itemIndex?: unknown, fallback?: any) =>
				params[parameterName] ?? fallback,
		);
	};

	beforeEach(() => {
		mockExecuteFunctions = mock<IExecuteFunctions>();
		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 2.2 }));
		mockExecuteFunctions.getInstanceId.mockReturnValue('instanceId');
		mockExecuteFunctions.getSignedResumeUrl.mockReturnValue(
			'http://localhost/waiting-webhook/nodeID?approved=true&signature=abc',
		);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should delegate to the shared email builder when the advanced section is off', async () => {
		setupParameters({ advancedEmail: false });

		const { email, threadId } = await createSendAndWaitEmail(mockExecuteFunctions);

		expect(threadId).toBeUndefined();
		expect(email).toEqual({
			to: 'to@example.com',
			subject: 'my subject',
			body: '',
			htmlBody: expect.stringContaining('my message'),
		});
	});

	it('should reject multiple recipients when the advanced section is off', async () => {
		setupParameters({ advancedEmail: false, sendTo: 'a@example.com, b@example.com' });

		await expect(createSendAndWaitEmail(mockExecuteFunctions)).rejects.toThrow(NodeOperationError);
	});

	it('should accept multiple recipients when the advanced section is on', async () => {
		setupParameters({ sendTo: 'a@example.com, b@example.com' });

		const { email } = await createSendAndWaitEmail(mockExecuteFunctions);

		expect(email.to).toContain('a@example.com');
		expect(email.to).toContain('b@example.com');
	});

	it('should apply the CC list', async () => {
		setupParameters({ advancedEmailOptions: { ccList: 'cc@example.com' } });

		const { email } = await createSendAndWaitEmail(mockExecuteFunctions);

		expect(email.cc).toContain('cc@example.com');
	});

	it('should apply the BCC list', async () => {
		setupParameters({ advancedEmailOptions: { bccList: 'bcc@example.com' } });

		const { email } = await createSendAndWaitEmail(mockExecuteFunctions);

		expect(email.bcc).toContain('bcc@example.com');
	});

	it('should apply the reply-to address', async () => {
		setupParameters({ advancedEmailOptions: { replyTo: 'reply@example.com' } });

		const { email } = await createSendAndWaitEmail(mockExecuteFunctions);

		expect(email.replyTo).toContain('reply@example.com');
	});

	it('should throw on an invalid address in the CC list', async () => {
		setupParameters({ advancedEmailOptions: { ccList: 'not-an-email' } });

		await expect(createSendAndWaitEmail(mockExecuteFunctions)).rejects.toThrow(NodeOperationError);
	});

	it('should combine the sender name with the authenticated mailbox', async () => {
		setupParameters({ advancedEmailOptions: { senderName: 'Nathan' } });
		(genericFunctions.googleApiRequest as Mock).mockResolvedValueOnce({
			emailAddress: 'me@example.com',
		});

		const { email } = await createSendAndWaitEmail(mockExecuteFunctions);

		expect(genericFunctions.googleApiRequest).toHaveBeenCalledWith(
			'GET',
			'/gmail/v1/users/me/profile',
		);
		expect(email.from).toBe('Nathan <me@example.com>');
	});

	it('should set thread headers and return the thread ID when replying in a thread', async () => {
		setupParameters({ advancedEmailOptions: { threadId: 'thread123' } });
		(genericFunctions.googleApiRequest as Mock).mockResolvedValueOnce({
			messages: [
				{ payload: { headers: [{ name: 'Message-ID', value: '<mid@mail.example.com>' }] } },
			],
		});

		const { email, threadId } = await createSendAndWaitEmail(mockExecuteFunctions);

		expect(threadId).toBe('thread123');
		expect(email.inReplyTo).toBe('<mid@mail.example.com>');
		expect(email.reference).toBe('<mid@mail.example.com>');
		expect(genericFunctions.googleApiRequest).toHaveBeenCalledWith(
			'GET',
			'/gmail/v1/users/me/threads/thread123',
			{},
			{ format: 'metadata', metadataHeaders: ['Message-ID', 'Subject'] },
		);
	});

	it('should serialize the thread reply headers into the MIME message', async () => {
		setupParameters({ advancedEmailOptions: { threadId: 'thread123' } });
		(genericFunctions.googleApiRequest as Mock).mockResolvedValueOnce({
			messages: [
				{ payload: { headers: [{ name: 'Message-ID', value: '<mid@mail.example.com>' }] } },
			],
		});

		const { email } = await createSendAndWaitEmail(mockExecuteFunctions);
		const raw = await genericFunctions.encodeEmail(email);
		const mime = Buffer.from(raw, 'base64url').toString('utf8');

		expect(mime).toContain('In-Reply-To: <mid@mail.example.com>');
		expect(mime).toContain('References: <mid@mail.example.com>');
	});

	it('should take the subject from the thread when replying in a thread', async () => {
		setupParameters({ advancedEmailOptions: { threadId: 'thread123' } });
		(genericFunctions.googleApiRequest as Mock).mockResolvedValueOnce({
			messages: [
				{
					payload: {
						headers: [
							{ name: 'Message-ID', value: '<mid@mail.example.com>' },
							{ name: 'Subject', value: 'Original conversation' },
						],
					},
				},
			],
		});

		const { email } = await createSendAndWaitEmail(mockExecuteFunctions);

		expect(email.subject).toBe('Re: Original conversation');
	});

	it('should not duplicate the Re: prefix when the thread subject already has one', async () => {
		setupParameters({ advancedEmailOptions: { threadId: 'thread123' } });
		(genericFunctions.googleApiRequest as Mock).mockResolvedValueOnce({
			messages: [
				{
					payload: {
						headers: [
							{ name: 'Message-ID', value: '<mid@mail.example.com>' },
							{ name: 'Subject', value: 'Re: Original conversation' },
						],
					},
				},
			],
		});

		const { email } = await createSendAndWaitEmail(mockExecuteFunctions);

		expect(email.subject).toBe('Re: Original conversation');
	});

	it('should render the approval buttons in the email body', async () => {
		setupParameters({
			'approvalOptions.values': { approvalType: 'single', approveLabel: 'Approve' },
		});

		const { email } = await createSendAndWaitEmail(mockExecuteFunctions);

		expect(email.htmlBody).toContain('my message');
		expect(email.htmlBody).toContain(
			'http://localhost/waiting-webhook/nodeID?approved=true&signature=abc',
		);
	});
});
