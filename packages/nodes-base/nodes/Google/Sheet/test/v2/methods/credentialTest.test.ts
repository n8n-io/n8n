import { mock } from 'vitest-mock-extended';
import type { ICredentialsDecrypted, ICredentialTestFunctions } from 'n8n-workflow';

import { getGoogleAccessToken } from '../../../../GenericFunctions';
import { googleApiCredentialTest } from '../../../v2/methods/credentialTest';

vi.mock('../../../../GenericFunctions', async (importOriginal) => ({
	...(await importOriginal<typeof import('../../../../GenericFunctions')>()),
	getGoogleAccessToken: vi.fn(),
}));

describe('googleApiCredentialTest', () => {
	const testFunctions = mock<ICredentialTestFunctions>();
	const credential = {
		data: { email: 'test@test.com', privateKey: 'private-key' },
	} as unknown as ICredentialsDecrypted;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return OK when a token is generated from the private key', async () => {
		vi.mocked(getGoogleAccessToken).mockResolvedValue({ access_token: 'a-token' });

		const result = await googleApiCredentialTest.call(testFunctions, credential);

		expect(result).toEqual({ status: 'OK', message: 'Connection successful!' });
	});

	it('should return Error when no access token is returned', async () => {
		vi.mocked(getGoogleAccessToken).mockResolvedValue({ access_token: undefined });

		const result = await googleApiCredentialTest.call(testFunctions, credential);

		expect(result).toEqual({
			status: 'Error',
			message: 'Could not generate a token from your private key.',
		});
	});

	it('should return Error including the attempted scopes when token generation throws', async () => {
		vi.mocked(getGoogleAccessToken).mockRejectedValue(new Error('invalid key'));

		const result = await googleApiCredentialTest.call(testFunctions, credential);

		expect(result).toEqual({
			status: 'Error',
			message:
				'Private key validation failed: invalid key (requested scopes: https://www.googleapis.com/auth/drive.file, https://www.googleapis.com/auth/spreadsheets, https://www.googleapis.com/auth/drive.metadata)',
		});
	});

	it('should request the narrower sheetV2 service scope, not sheetV2Trigger, when not an HTTP Request node credential', async () => {
		vi.mocked(getGoogleAccessToken).mockResolvedValue({ access_token: 'a-token' });

		await googleApiCredentialTest.call(testFunctions, credential);

		expect(getGoogleAccessToken).toHaveBeenCalledWith(credential.data, 'sheetV2', undefined);
		expect(getGoogleAccessToken).not.toHaveBeenCalledWith(
			expect.anything(),
			'sheetV2Trigger',
			expect.anything(),
		);
	});

	describe('when set up for use in the HTTP Request node', () => {
		const httpNodeCredential = {
			data: {
				email: 'test@test.com',
				privateKey: 'private-key',
				httpNode: true,
				scopes: 'https://www.googleapis.com/auth/calendar.readonly',
			},
		} as unknown as ICredentialsDecrypted;

		it("should request the user's configured scopes instead of the sheetV2 default", async () => {
			vi.mocked(getGoogleAccessToken).mockResolvedValue({ access_token: 'a-token' });

			await googleApiCredentialTest.call(testFunctions, httpNodeCredential);

			expect(getGoogleAccessToken).toHaveBeenCalledWith(httpNodeCredential.data, undefined, [
				'https://www.googleapis.com/auth/calendar.readonly',
			]);
			expect(getGoogleAccessToken).not.toHaveBeenCalledWith(
				expect.anything(),
				'sheetV2',
				expect.anything(),
			);
		});

		it('should split multiple scopes on commas, whitespace, newlines, and escaped newlines', async () => {
			vi.mocked(getGoogleAccessToken).mockResolvedValue({ access_token: 'a-token' });
			const credentialWithMultipleScopes = {
				data: {
					...httpNodeCredential.data,
					scopes:
						'https://www.googleapis.com/auth/calendar.readonly\\nhttps://www.googleapis.com/auth/gmail.readonly',
				},
			} as unknown as ICredentialsDecrypted;

			await googleApiCredentialTest.call(testFunctions, credentialWithMultipleScopes);

			expect(getGoogleAccessToken).toHaveBeenCalledWith(
				credentialWithMultipleScopes.data,
				undefined,
				[
					'https://www.googleapis.com/auth/calendar.readonly',
					'https://www.googleapis.com/auth/gmail.readonly',
				],
			);
		});

		it('should fall back to the sheetV2 default when httpNode is enabled but no scopes are configured', async () => {
			vi.mocked(getGoogleAccessToken).mockResolvedValue({ access_token: 'a-token' });
			const credentialWithNoScopes = {
				data: { ...httpNodeCredential.data, scopes: '' },
			} as unknown as ICredentialsDecrypted;

			const result = await googleApiCredentialTest.call(testFunctions, credentialWithNoScopes);

			expect(result).toEqual({ status: 'OK', message: 'Connection successful!' });
			expect(getGoogleAccessToken).toHaveBeenCalledWith(
				credentialWithNoScopes.data,
				'sheetV2',
				undefined,
			);
		});

		it('should return Error including the configured scopes when token generation throws', async () => {
			vi.mocked(getGoogleAccessToken).mockRejectedValue(new Error('unauthorized_client'));

			const result = await googleApiCredentialTest.call(testFunctions, httpNodeCredential);

			expect(result).toEqual({
				status: 'Error',
				message:
					'Private key validation failed: unauthorized_client (requested scopes: https://www.googleapis.com/auth/calendar.readonly)',
			});
		});
	});
});
