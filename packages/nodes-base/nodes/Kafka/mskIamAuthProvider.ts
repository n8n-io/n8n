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

	const region = String(awsRegion ?? '');
	if (!region || !accessKeyId || !secretAccessKey) {
		throw new ApplicationError('Missing AWS IAM credentials');
	}

	const staticProvider = async () => ({
		accessKeyId: String(accessKeyId),
		secretAccessKey: String(secretAccessKey),
		sessionToken: sessionToken ? String(sessionToken) : undefined,
	});

	const provider = fromNodeProviderChain();

	return async () => {
		const creds = await staticProvider().catch(() => provider());

		const sts = new STSClient({
			region,
			credentials: creds,
		});
		await sts.send(new GetCallerIdentityCommand({}));

		return {
			username: 'AWS_MSK_IAM',
			password: creds.sessionToken ?? creds.secretAccessKey ?? '',
		};
	};
};
