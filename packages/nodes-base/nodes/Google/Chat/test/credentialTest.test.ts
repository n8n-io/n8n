import jwt from 'jsonwebtoken';
import type { ICredentialsDecrypted, ICredentialTestFunctions } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { GoogleChat } from '../GoogleChat.node';

vi.mock('jsonwebtoken', () => {
	const sign = vi.fn(() => 'signed-jwt');
	return { default: { sign }, sign };
});

describe('GoogleChat credentialTest', () => {
	const mockedSign = jwt.sign as unknown as Mock;
	const node = new GoogleChat();

	beforeEach(() => {
		mockedSign.mockClear();
	});

	it('signs the assertion with only standard JWT header fields', async () => {
		const ctx = mock<ICredentialTestFunctions>();
		ctx.helpers = { request: vi.fn().mockResolvedValue({ access_token: 'token' }) } as any;

		const credential = mock<ICredentialsDecrypted>();
		credential.data = {
			email: 'svc@project.iam.gserviceaccount.com',
			privateKey: '-----BEGIN PRIVATE KEY-----\\nkey\\n-----END PRIVATE KEY-----',
		};

		const result = await node.methods.credentialTest.testGoogleTokenAuth.call(ctx, credential);

		expect(result.status).toBe('OK');
		const signOptions = mockedSign.mock.calls[0][2] as { header: Record<string, unknown> };
		expect(signOptions.header).toEqual({ typ: 'JWT', alg: 'RS256' });
		expect(signOptions.header).not.toHaveProperty('kid');
	});
});
