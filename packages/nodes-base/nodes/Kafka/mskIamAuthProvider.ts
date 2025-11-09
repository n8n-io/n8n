import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { ApplicationError } from 'n8n-workflow';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';
import { HttpRequest } from '@aws-sdk/protocol-http';

/**
 * Returns a KafkaJS-compatible SASL provider function with automatic temporary credentials rotation
 */
export const mskIamAuthProvider = (
	credentials: ICredentialDataDecryptedObject,
	brokerHost: string,
): (() => Promise<{ username: string; password: string }>) => {
	const { awsRegion, accessKeyId, secretAccessKey, sessionToken } = credentials;

	const region = String(awsRegion ?? '');
	if (!region || !accessKeyId || !secretAccessKey) {
		throw new ApplicationError('Missing AWS IAM credentials');
	}

	const provider =
		accessKeyId && secretAccessKey
			? async () => ({
					accessKeyId: String(accessKeyId),
					secretAccessKey: String(secretAccessKey),
					sessionToken: sessionToken ? String(sessionToken) : undefined,
				})
			: fromNodeProviderChain();

	// Token cache
	let cachedToken: string | null = null;
	let tokenExpiry = 0;

	return async () => {
		const now = Date.now();

		// Refresh credentials if expired
		const creds = now >= tokenExpiry - 5000 ? await provider() : undefined;

		// Validate credentials with STS only if new
		if (creds) {
			const sts = new STSClient({ region, credentials: creds });
			await sts.send(new GetCallerIdentityCommand({}));
		}

		// Generate new SigV4 token if expired
		if (!cachedToken || now >= tokenExpiry - 5000) {
			const credsToUse = creds ?? (await provider());

			const signer = new SignatureV4({
				service: 'kafka-cluster',
				region,
				credentials: credsToUse,
				sha256: Sha256,
			});

			const request = new HttpRequest({
				hostname: brokerHost,
				method: 'GET',
				protocol: 'https:',
			});

			const signed = await signer.presign(request, { expiresIn: 900 });
			const authHeader = signed.headers.Authorization;
			if (!authHeader) throw new ApplicationError('Failed to generate AWS MSK IAM auth token');

			cachedToken = authHeader;
			tokenExpiry = now + 14_500; // ~15 seconds before expiration
		}

		return { username: 'AWS_MSK_IAM', password: cachedToken ?? '' };
	};
};
