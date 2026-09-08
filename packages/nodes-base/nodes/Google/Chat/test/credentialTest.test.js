import jwt from 'jsonwebtoken';
import { mock } from 'vitest-mock-extended';
import { GoogleChat } from '../GoogleChat.node';
vi.mock('jsonwebtoken', () => {
    const sign = vi.fn(() => 'signed-jwt');
    return { default: { sign }, sign };
});
describe('GoogleChat credentialTest', () => {
    const mockedSign = jwt.sign;
    const node = new GoogleChat();
    beforeEach(() => {
        mockedSign.mockClear();
    });
    it('signs the assertion with only standard JWT header fields', async () => {
        const ctx = mock();
        ctx.helpers = { request: vi.fn().mockResolvedValue({ access_token: 'token' }) };
        const credential = mock();
        credential.data = {
            email: 'svc@project.iam.gserviceaccount.com',
            privateKey: '-----BEGIN PRIVATE KEY-----\\nkey\\n-----END PRIVATE KEY-----',
        };
        const result = await node.methods.credentialTest.testGoogleTokenAuth.call(ctx, credential);
        expect(result.status).toBe('OK');
        const signOptions = mockedSign.mock.calls[0][2];
        expect(signOptions.header).toEqual({ typ: 'JWT', alg: 'RS256' });
        expect(signOptions.header).not.toHaveProperty('kid');
    });
});
//# sourceMappingURL=credentialTest.test.js.map