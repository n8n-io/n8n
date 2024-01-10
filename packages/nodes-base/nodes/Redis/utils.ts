import type {
	ICredentialDataDecryptedObject,
	ICredentialTestFunctions,
	ICredentialsDecrypted,
	INodeCredentialTestResult,
} from 'n8n-workflow';

import { createClient } from 'redis';
export type RedisClientType = ReturnType<typeof createClient>;

export function setupRedisClient(credentials: ICredentialDataDecryptedObject): RedisClientType {
	const redisOptions = {
		socket: {
			host: credentials.host as string,
			port: credentials.port as number,
		},
		database: credentials.database as number,
		password: (credentials.password as string) || undefined,
	};

	return createClient(redisOptions);
}

export async function redisConnectionTest(
	this: ICredentialTestFunctions,
	credential: ICredentialsDecrypted,
): Promise<INodeCredentialTestResult> {
	const credentials = credential.data as ICredentialDataDecryptedObject;

	try {
		const client = setupRedisClient(credentials);
		await client.connect();
		await client.ping();
		return {
			status: 'OK',
			message: 'Connection successful!',
		};
	} catch (error) {
		return {
			status: 'Error',
			message: error.message,
		};
	}
}
