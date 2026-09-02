import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { generateKeyPairSync } from 'crypto';
import { mockDeep } from 'vitest-mock-extended';
import jwt from 'jsonwebtoken';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { Jwt } from '../Jwt.node';

const credentials = {
	jwtAuth: {
		keyType: 'passphrase',
		secret: 'baz',
		algorithm: 'HS256',
	},
};

describe('Test Jwt Node', () => {
	new NodeTestHarness().setupTests({ credentials });
});

describe('JWT Node - custom header claims', () => {
	const passphraseCredentials = {
		keyType: 'passphrase' as const,
		secret: 'baz',
		algorithm: 'HS256' as const,
	};

	const setupExecuteFunctions = (
		params: Record<string, unknown>,
		creds: Record<string, unknown>,
	) => {
		const ctx = mockDeep<IExecuteFunctions>();
		ctx.getInputData.mockReturnValue([{ json: {} }]);
		ctx.continueOnFail.mockReturnValue(false);
		ctx.getNode.mockReturnValue({
			id: 'jwt-node',
			name: 'JWT',
			type: 'n8n-nodes-base.jwt',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		});
		ctx.getCredentials.mockResolvedValue(creds);
		ctx.getNodeParameter.mockImplementation(
			(name: string, _itemIndex?: number, fallback?: unknown) =>
				(params[name] ?? fallback) as never,
		);
		return ctx;
	};

	const signToken = async (params: Record<string, unknown>, creds: Record<string, unknown>) => {
		const ctx = setupExecuteFunctions(params, creds);
		const result = await new Jwt().execute.call(ctx);
		return (result[0][0].json as { token: string }).token;
	};

	it('carries a custom RS256 header with x5t (Microsoft Entra client assertion shape)', async () => {
		const { privateKey, publicKey } = generateKeyPairSync('rsa', {
			modulusLength: 2048,
			publicKeyEncoding: { type: 'spki', format: 'pem' },
			privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
		});

		const token = await signToken(
			{
				operation: 'sign',
				useJson: true,
				claimsJson: JSON.stringify({
					aud: 'https://login.microsoftonline.com/contoso/oauth2/v2.0/token',
					iss: 'client-id',
					sub: 'client-id',
					jti: 'unique-assertion-id',
				}),
				headerClaims: JSON.stringify({ x5t: 'aB3cDeThumbprint', typ: 'JWT' }),
				options: {},
			},
			{ keyType: 'pemKey', privateKey, publicKey, algorithm: 'RS256' },
		);

		// Exact match: the client assertion header must contain only the intended claims
		// (alg + typ + x5t) and no stray fields such as kid.
		const decoded = jwt.decode(token, { complete: true });
		expect(decoded?.header).toEqual({
			alg: 'RS256',
			typ: 'JWT',
			x5t: 'aB3cDeThumbprint',
		});

		// The signature is a valid RS256 assertion verifiable with the matching public key
		const verified = jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as jwt.JwtPayload;
		expect(verified.aud).toBe('https://login.microsoftonline.com/contoso/oauth2/v2.0/token');
		expect(verified.sub).toBe('client-id');
	});

	it('lets explicit header claims take precedence over the auto-generated kid and typ', async () => {
		const token = await signToken(
			{
				operation: 'sign',
				useJson: false,
				claims: { subject: 'test' },
				headerClaims: JSON.stringify({ kid: 'header-kid', typ: 'at+jwt' }),
				options: { kid: 'option-kid' },
			},
			passphraseCredentials,
		);

		const decoded = jwt.decode(token, { complete: true });
		expect(decoded?.header.kid).toBe('header-kid');
		expect(decoded?.header.typ).toBe('at+jwt');
		expect(decoded?.header.alg).toBe('HS256');
	});

	it('still applies the kid option when the custom header omits kid', async () => {
		const token = await signToken(
			{
				operation: 'sign',
				useJson: false,
				claims: { subject: 'test' },
				headerClaims: JSON.stringify({ x5t: 'thumbprint' }),
				options: { kid: 'option-kid' },
			},
			passphraseCredentials,
		);

		const decoded = jwt.decode(token, { complete: true });
		expect(decoded?.header.kid).toBe('option-kid');
		expect(decoded?.header.x5t).toBe('thumbprint');
	});

	it('leaves the header unchanged when headerClaims is empty (existing workflows unaffected)', async () => {
		const token = await signToken(
			{
				operation: 'sign',
				useJson: false,
				claims: { subject: 'test' },
				headerClaims: '{}',
				options: {},
			},
			passphraseCredentials,
		);

		const decoded = jwt.decode(token, { complete: true });
		expect(decoded?.header).toEqual({ alg: 'HS256', typ: 'JWT' });
	});

	it('throws a NodeOperationError when headerClaims is not a JSON object', async () => {
		const ctx = setupExecuteFunctions(
			{
				operation: 'sign',
				useJson: false,
				claims: { subject: 'test' },
				headerClaims: '[1, 2, 3]',
				options: {},
			},
			passphraseCredentials,
		);

		await expect(new Jwt().execute.call(ctx)).rejects.toThrow(NodeOperationError);
	});
});
