import { fromNodeProviderChain } from '@aws-sdk/credential-providers';

export const mskIamAuthProvider = () => {
	return async () => {
		const credentials = await fromNodeProviderChain()();
		return {
			accessKeyId: credentials.accessKeyId,
			secretAccessKey: credentials.secretAccessKey,
			sessionToken: credentials.sessionToken,
		};
	};
};
