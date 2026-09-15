import { createHmac, timingSafeEqual } from 'crypto';
import type { Mock } from 'vitest';

import { verifySignature } from '../SlackTriggerHelpers';
import type * as _importType0 from 'crypto';

vi.mock('crypto', async () => ({
	...(await vi.importActual<typeof _importType0>('crypto')),
	createHmac: vi.fn().mockReturnValue({
		update: vi.fn().mockReturnThis(),
		digest: vi
			.fn()
			.mockReturnValue('a2114d57b48eac39b9ad189dd8316235a7b4a8d21a10bd27519666489c69b503'),
	}),
	timingSafeEqual: vi.fn(),
}));

describe('SlackTriggerHelpers', () => {
	let mockWebhookFunctions: any;
	const testSignatureSecret = 'xyzz0WbapA4vBCDEFasx0q6G';
	const testTimestamp = '1531420618';
	const testBody =
		'token=xyzz0WbapA4vBCDEFasx0q6G&team_id=T1DC2JH3J&team_domain=testteamnow&channel_id=G8PSS9T3V&channel_name=foobar&user_id=U2CERLKJA&user_name=roadrunner&command=%2Fwebhook-collect&text=&response_url=https%3A%2F%2Fhooks.slack.com%2Fcommands%2FT1DC2JH3J%2F397700885554%2F96rGlfmibIGlgcZRskXaIFfN&trigger_id=398738663015.47445629121.803a0bc887a14d10d2c447fce8b6703c';
	const testSignature = 'v0=a2114d57b48eac39b9ad189dd8316235a7b4a8d21a10bd27519666489c69b503';

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock Date.now() to return a fixed timestamp
		const fixedDate = new Date(parseInt(testTimestamp, 10) * 1000);
		vi.spyOn(Date, 'now').mockImplementation(() => fixedDate.getTime());

		mockWebhookFunctions = {
			getCredentials: vi.fn(),
			getRequestObject: vi.fn(),
			getNode: vi.fn().mockReturnValue({
				name: 'Slack Trigger',
				credentials: {
					slackApi: { id: '1', name: 'Slack account' },
					slackSigningSecretApi: { id: '2', name: 'Slack signing secret' },
				},
			}),
		};

		// Default mock return values
		mockWebhookFunctions.getRequestObject.mockReturnValue({
			header: vi.fn().mockImplementation((header) => {
				if (header === 'x-slack-signature') return testSignature;
				if (header === 'x-slack-request-timestamp') return testTimestamp;
				return null;
			}),
			rawBody: testBody,
		});
	});

	describe('verifySignature', () => {
		it('should return true when no credentials are provided', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
			expect(mockWebhookFunctions.getCredentials).toHaveBeenCalledWith('slackApi');
		});

		it('should return true when no signature secret is provided', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				apiToken: 'test-token',
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
			expect(mockWebhookFunctions.getCredentials).toHaveBeenCalledWith('slackApi');
		});

		it('should return false when signature header is missing', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				signatureSecret: testSignatureSecret,
			});

			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: vi.fn().mockImplementation((header) => {
					if (header === 'x-slack-request-timestamp') return testTimestamp;
					return null;
				}),
				rawBody: testBody,
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should return false when timestamp header is missing', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				signatureSecret: testSignatureSecret,
			});

			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: vi.fn().mockImplementation((header) => {
					if (header === 'x-slack-signature') return testSignature;
					return null;
				}),
				rawBody: testBody,
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should return false when timestamp is too old', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				signatureSecret: testSignatureSecret,
			});

			// Mock Date.now() to return a timestamp that's more than 5 minutes after the request timestamp
			const futureDate = new Date((parseInt(testTimestamp, 10) + 301) * 1000);
			vi.spyOn(Date, 'now').mockImplementation(() => futureDate.getTime());

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should return true when signature is valid', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				signatureSecret: testSignatureSecret,
			});

			// Mock the timingSafeEqual to return true for valid signature
			(timingSafeEqual as Mock).mockReturnValue(true);

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
			expect(createHmac).toHaveBeenCalledWith('sha256', testSignatureSecret);
			expect(timingSafeEqual).toHaveBeenCalled();
		});

		it('should return false when signature is invalid', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				signatureSecret: testSignatureSecret,
			});

			// Mock the timingSafeEqual to return false for invalid signature
			(timingSafeEqual as Mock).mockReturnValue(false);

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
			expect(createHmac).toHaveBeenCalledWith('sha256', testSignatureSecret);
			expect(timingSafeEqual).toHaveBeenCalled();
		});

		it('should correctly build the signature string with the provided timestamp', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				signatureSecret: testSignatureSecret,
			});

			await verifySignature.call(mockWebhookFunctions);

			expect(createHmac).toHaveBeenCalledWith('sha256', testSignatureSecret);
			const mockHmac = createHmac('sha256', testSignatureSecret);

			// Verify that update was called with the expected string (using the timestamp from the request)
			expect(mockHmac.update).toHaveBeenCalledWith(`v0:${testTimestamp}:${testBody}`);
		});

		it('should verify timestamp even if signature secret is not set', async () => {
			// No signature secret in credentials
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				apiToken: 'test-token',
			});

			// Mock Date.now() to return a timestamp that's more than 5 minutes after the request timestamp
			const futureDate = new Date((parseInt(testTimestamp, 10) + 301) * 1000);
			vi.spyOn(Date, 'now').mockImplementation(() => futureDate.getTime());

			const result = await verifySignature.call(mockWebhookFunctions);

			// Should return false because timestamp is too old, even though signature secret is not set
			expect(result).toBe(false);
			expect(mockWebhookFunctions.getCredentials).toHaveBeenCalledWith('slackApi');
		});

		it('should return true when timestamp is valid even if signature secret is not set', async () => {
			// No signature secret in credentials
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				apiToken: 'test-token',
			});

			// Keep Date.now() at the same time as the request timestamp (within 5 minute window)
			const fixedDate = new Date(parseInt(testTimestamp, 10) * 1000);
			vi.spyOn(Date, 'now').mockImplementation(() => fixedDate.getTime());

			const result = await verifySignature.call(mockWebhookFunctions);

			// Should return true because timestamp is valid and signature secret is not required
			expect(result).toBe(true);
			expect(mockWebhookFunctions.getCredentials).toHaveBeenCalledWith('slackApi');
		});

		describe('with requireSecret', () => {
			it('should return false when the credential has no signature secret', async () => {
				mockWebhookFunctions.getCredentials.mockResolvedValue({});

				const result = await verifySignature.call(mockWebhookFunctions, 'slackSigningSecretApi', {
					requireSecret: true,
				});

				expect(result).toBe(false);
				expect(createHmac).not.toHaveBeenCalled();
				expect(mockWebhookFunctions.getCredentials).toHaveBeenCalledWith('slackSigningSecretApi');
			});

			it('should return false when the signature secret is an empty string', async () => {
				mockWebhookFunctions.getCredentials.mockResolvedValue({ signatureSecret: '' });

				const result = await verifySignature.call(mockWebhookFunctions, 'slackSigningSecretApi', {
					requireSecret: true,
				});

				expect(result).toBe(false);
				expect(createHmac).not.toHaveBeenCalled();
			});

			it('should return false without reading credentials when the credential slot is empty', async () => {
				mockWebhookFunctions.getNode.mockReturnValue({ name: 'Slack Trigger', credentials: {} });

				const result = await verifySignature.call(mockWebhookFunctions, 'slackSigningSecretApi', {
					requireSecret: true,
				});

				expect(result).toBe(false);
				expect(mockWebhookFunctions.getCredentials).not.toHaveBeenCalled();
				expect(createHmac).not.toHaveBeenCalled();
			});

			it('should throw when a configured credential cannot be read', async () => {
				mockWebhookFunctions.getCredentials.mockRejectedValue(new Error('Cannot decrypt'));

				await expect(
					verifySignature.call(mockWebhookFunctions, 'slackSigningSecretApi', {
						requireSecret: true,
					}),
				).rejects.toThrow('Cannot decrypt');
				expect(createHmac).not.toHaveBeenCalled();
			});

			it('should verify the signature when the credential has a signature secret', async () => {
				mockWebhookFunctions.getCredentials.mockResolvedValue({
					signatureSecret: testSignatureSecret,
				});
				(timingSafeEqual as Mock).mockReturnValue(true);

				const result = await verifySignature.call(mockWebhookFunctions, 'slackSigningSecretApi', {
					requireSecret: true,
				});

				expect(result).toBe(true);
				expect(createHmac).toHaveBeenCalledWith('sha256', testSignatureSecret);
				expect(timingSafeEqual).toHaveBeenCalled();
			});

			it('should return false when the signature is invalid', async () => {
				mockWebhookFunctions.getCredentials.mockResolvedValue({
					signatureSecret: testSignatureSecret,
				});
				(timingSafeEqual as Mock).mockReturnValue(false);

				const result = await verifySignature.call(mockWebhookFunctions, 'slackSigningSecretApi', {
					requireSecret: true,
				});

				expect(result).toBe(false);
			});
		});

		describe('with legacyCredentialType', () => {
			const options = { requireSecret: true, legacyCredentialType: 'slackApi' };

			it('should use the secret of the legacy credential when the primary slot is empty', async () => {
				mockWebhookFunctions.getNode.mockReturnValue({
					name: 'Slack Trigger',
					credentials: { slackApi: { id: '1', name: 'Slack account' } },
				});
				mockWebhookFunctions.getCredentials.mockResolvedValue({
					signatureSecret: testSignatureSecret,
				});
				(timingSafeEqual as Mock).mockReturnValue(true);

				const result = await verifySignature.call(
					mockWebhookFunctions,
					'slackSigningSecretApi',
					options,
				);

				expect(result).toBe(true);
				expect(mockWebhookFunctions.getCredentials).toHaveBeenCalledTimes(1);
				expect(mockWebhookFunctions.getCredentials).toHaveBeenCalledWith('slackApi');
				expect(createHmac).toHaveBeenCalledWith('sha256', testSignatureSecret);
			});

			it('should not fall back to the legacy credential when the primary credential cannot be read', async () => {
				mockWebhookFunctions.getCredentials.mockImplementation(async (type: string) => {
					if (type === 'slackApi') return { signatureSecret: testSignatureSecret };
					throw new Error('Cannot decrypt');
				});

				await expect(
					verifySignature.call(mockWebhookFunctions, 'slackSigningSecretApi', options),
				).rejects.toThrow('Cannot decrypt');
				expect(mockWebhookFunctions.getCredentials).not.toHaveBeenCalledWith('slackApi');
				expect(createHmac).not.toHaveBeenCalled();
			});

			it('should not read the legacy credential when the primary credential has a secret', async () => {
				mockWebhookFunctions.getCredentials.mockResolvedValue({
					signatureSecret: testSignatureSecret,
				});
				(timingSafeEqual as Mock).mockReturnValue(true);

				const result = await verifySignature.call(
					mockWebhookFunctions,
					'slackSigningSecretApi',
					options,
				);

				expect(result).toBe(true);
				expect(mockWebhookFunctions.getCredentials).toHaveBeenCalledTimes(1);
				expect(mockWebhookFunctions.getCredentials).toHaveBeenCalledWith('slackSigningSecretApi');
			});

			it('should return false when neither credential has a secret', async () => {
				mockWebhookFunctions.getNode.mockReturnValue({
					name: 'Slack Trigger',
					credentials: { slackApi: { id: '1', name: 'Slack account' } },
				});
				mockWebhookFunctions.getCredentials.mockResolvedValue({
					accessToken: 'test-token',
					signatureSecret: '',
				});

				const result = await verifySignature.call(
					mockWebhookFunctions,
					'slackSigningSecretApi',
					options,
				);

				expect(result).toBe(false);
				expect(createHmac).not.toHaveBeenCalled();
			});
		});
	});
});
