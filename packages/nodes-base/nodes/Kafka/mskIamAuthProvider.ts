import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { ApplicationError } from 'n8n-workflow';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';

/**
 * AWS MSK IAM Authentication Provider
 * Generates a temporary IAM-based auth function compatible with KafkaJS SASL.
 */
export const mskIamAuthProvider = (credentials: ICredentialDataDecryptedObject) => {
	const { awsRegion, accessKeyId, secretAccessKey, sessionToken } = credentials;

	if (!awsRegion || !accessKeyId || !secretAccessKey) {
		throw new ApplicationError('Missing AWS IAM credentials');
	}

	// Create a static credentials provider if keys are provided
	const staticProvider = async () => ({
		accessKeyId: String(accessKeyId),
		secretAccessKey: String(secretAccessKey),
		sessionToken: sessionToken ? String(sessionToken) : undefined,
	});

	// Use the Node default provider chain as fallback
	const provider = fromNodeProviderChain();

	return async () => {
		// Prefer static credentials first, fallback to provider chain
		const creds = await staticProvider().catch(() => provider());

		// Validate AWS credentials via STS
		const sts = new STSClient({
			region: String(awsRegion),
			credentials: creds,
		});
		await sts.send(new GetCallerIdentityCommand({}));

		// Return SASL credentials for KafkaJS
		return {
			username: 'AWS_MSK_IAM',
			password: creds.sessionToken ?? creds.secretAccessKey ?? '',
		};
	};
};
