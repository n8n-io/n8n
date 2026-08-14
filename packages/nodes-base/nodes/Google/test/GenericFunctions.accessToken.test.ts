import * as jwt from 'jsonwebtoken';
import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { getGoogleAccessToken } from '../GenericFunctions';

vi.mock('jsonwebtoken', () => {
	const sign = vi.fn(() => 'signed-jwt');
	return { default: { sign }, sign };
});

describe('getGoogleAccessToken', () => {
	const mockedSign = jwt.sign as unknown as Mock;

	beforeEach(() => {
		mockedSign.mockClear();
	});

	it('signs the assertion with only standard JWT header fields', async () => {
		const ctx = mock<IExecuteFunctions>();
		ctx.helpers = { request: vi.fn().mockResolvedValue({ access_token: 'token' }) } as any;

		const credentials: IDataObject = {
			email: 'svc@project.iam.gserviceaccount.com',
			privateKey: '-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----',
		};

		await getGoogleAccessToken.call(ctx, credentials, 'drive');

		const signOptions = mockedSign.mock.calls[0][2] as { header: Record<string, unknown> };
		expect(signOptions.header).toEqual({ typ: 'JWT', alg: 'RS256' });
		expect(signOptions.header).not.toHaveProperty('kid');
	});
});
