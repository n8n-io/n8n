import { mock } from 'vitest-mock-extended';
import type { ICredentialsDecrypted, ICredentialTestFunctions } from 'n8n-workflow';

import { getGoogleAccessToken } from '../../../../GenericFunctions';
import { googleApiCredentialTest } from '../../../v2/methods/credentialTest';

vi.mock('../../../../GenericFunctions', () => ({
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

	it('should return Error when token generation throws', async () => {
		vi.mocked(getGoogleAccessToken).mockRejectedValue(new Error('invalid key'));

		const result = await googleApiCredentialTest.call(testFunctions, credential);

		expect(result).toEqual({
			status: 'Error',
			message: expect.stringContaining('Private key validation failed'),
		});
	});

	it('should request the narrower sheetV2 service scope, not sheetV2Trigger', async () => {
		vi.mocked(getGoogleAccessToken).mockResolvedValue({ access_token: 'a-token' });

		await googleApiCredentialTest.call(testFunctions, credential);

		expect(getGoogleAccessToken).toHaveBeenCalledWith(credential.data, 'sheetV2');
		expect(getGoogleAccessToken).not.toHaveBeenCalledWith(expect.anything(), 'sheetV2Trigger');
	});
});
