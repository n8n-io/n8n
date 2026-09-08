import * as jwt from 'jsonwebtoken';
import { mock } from 'vitest-mock-extended';
import { getGoogleAccessToken } from '../GenericFunctions';
vi.mock('jsonwebtoken', () => {
    const sign = vi.fn(() => 'signed-jwt');
    return { default: { sign }, sign };
});
describe('getGoogleAccessToken', () => {
    const mockedSign = jwt.sign;
    beforeEach(() => {
        mockedSign.mockClear();
    });
    it('signs the assertion with only standard JWT header fields', async () => {
        const ctx = mock();
        ctx.helpers = { request: vi.fn().mockResolvedValue({ access_token: 'token' }) };
        const credentials = {
            email: 'svc@project.iam.gserviceaccount.com',
            privateKey: '-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----',
        };
        await getGoogleAccessToken.call(ctx, credentials, 'drive');
        const signOptions = mockedSign.mock.calls[0][2];
        expect(signOptions.header).toEqual({ typ: 'JWT', alg: 'RS256' });
        expect(signOptions.header).not.toHaveProperty('kid');
    });
});
//# sourceMappingURL=GenericFunctions.accessToken.test.js.map