import type {
	ICredentialTestFunctions,
	ICredentialsDecrypted,
	IDataObject,
	IExecuteFunctions,
	INodeCredentialTestResult,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { createClient, createCluster } from 'redis';

import type {
	RedisCredential,
	RedisClientType,
	RedisCommandClient,
	RedisClusterCommandClient,
} from './types';

export function setupRedisClient(credentials: RedisCredential, isTest = false): RedisClientType {
	// Check if cluster mode is enabled
	if (credentials.clusterMode === true) {
		// For cluster mode, provide the initial node and let Redis discover the rest
		const rootNode = {
			socket: {
				host: credentials.host,
				port: credentials.port,
				tls: credentials.ssl === true,
				...(credentials.ssl === true &&
					credentials.disableTlsVerification === true && {
						rejectUnauthorized: false,
					}),
			},
		};

		return createCluster({
			rootNodes: [rootNode],
			defaults: {
				username: credentials.user ?? undefined,
				password: credentials.password ?? undefined,
				socket: {
					connectTimeout: 10000,
					// Disable reconnection for tests to prevent hanging
					reconnectStrategy: isTest ? false : undefined,
					// TLS settings must be in defaults.socket to apply to all discovered nodes
					tls: credentials.ssl === true,
					...(credentials.ssl === true &&
						credentials.disableTlsVerification === true && {
							rejectUnauthorized: false,
						}),
				},
			},
			...(isTest && {
				useReplicas: true,
			}),
		});
	}

	// Standalone mode (original implementation)
	const socketConfig: any = {
		host: credentials.host,
		port: credentials.port,
		tls: credentials.ssl === true,
		connectTimeout: 10000,
		// Disable reconnection for tests to prevent hanging
		reconnectStrategy: isTest ? false : undefined,
	};

	// If SSL is enabled and TLS verification should be disabled
	if (credentials.ssl === true && credentials.disableTlsVerification === true) {
		socketConfig.rejectUnauthorized = false;
	}

	return createClient({
		socket: socketConfig,
		database: credentials.database,
		username: credentials.user ?? undefined,
		password: credentials.password ?? undefined,
		// Disable automatic error retry for tests
		...(isTest && {
			disableOfflineQueue: true,
			enableOfflineQueue: false,
		}),
	});
}

export async function redisConnectionTest(
	this: ICredentialTestFunctions,
	credential: ICredentialsDecrypted,
): Promise<INodeCredentialTestResult> {
	const credentials = credential.data as RedisCredential;
	let client: RedisClientType | undefined;

	try {
		client = setupRedisClient(credentials, true);

		// Connect to Redis (works for both standalone and cluster)
		// If connect() succeeds, the connection is established
		await client.connect();

		return {
			status: 'OK',
			message: 'Connection successful!',
		};
	} catch (error) {
		// Handle specific error types for better user feedback
		let errorMessage = error.message;
		if (error.code === 'ECONNRESET') {
			errorMessage =
				'Connection reset: The Redis server rejected the connection. This often happens when trying to connect without SSL to an SSL-only server.';
		} else if (error.code === 'ECONNREFUSED') {
			errorMessage =
				'Connection refused: Unable to connect to the Redis server. Please check the host and port.';
		}

		return {
			status: 'Error',
			message: errorMessage,
		};
	} finally {
		// Ensure the Redis client is always closed to prevent leaked connections
		if (client) {
			try {
				await client.quit();
			} catch {
				// If quit fails, forcefully disconnect
				try {
					await client.disconnect();
				} catch {
					// Ignore disconnect errors in cleanup
				}
			}
		}
	}
}

/** Parses the given value in a number if it is one else returns a string */
function getParsedValue(value: string): string | number {
	if (value.match(/^[\d.]+$/) === null) {
		// Is a string
		return value;
	} else {
		// Is a number
		return parseFloat(value);
	}
}

/** Converts the Redis Info String into an object */
export function convertInfoToObject(stringData: string): IDataObject {
	const returnData: IDataObject = {};

	let key: string, value: string;
	for (const line of stringData.split('\n')) {
		if (['#', ''].includes(line.charAt(0))) {
			continue;
		}
		[key, value] = line.split(':');
		if (key === undefined || value === undefined) {
			continue;
		}
		value = value.trim();

		if (value.includes('=')) {
			returnData[key] = {};
			let key2: string, value2: string;
			for (const keyValuePair of value.split(',')) {
				[key2, value2] = keyValuePair.split('=');
				(returnData[key] as IDataObject)[key2] = getParsedValue(value2);
			}
		} else {
			returnData[key] = getParsedValue(value);
		}
	}

	return returnData;
}

export async function getValue(client: RedisClientType, keyName: string, type?: string) {
	const commandClient = client as RedisCommandClient;

	if (type === undefined || type === 'automatic') {
		// Request the type first
		type = await commandClient.type(keyName);
	}

	if (type === 'string') {
		return await commandClient.get(keyName);
	} else if (type === 'hash') {
		return await commandClient.hGetAll(keyName);
	} else if (type === 'list') {
		return await commandClient.lRange(keyName, 0, -1);
	} else if (type === 'sets') {
		return await commandClient.sMembers(keyName);
	}
}

export async function setValue(
	this: IExecuteFunctions,
	client: RedisClientType,
	keyName: string,
	value: string | number | object | string[] | number[],
	expire: boolean,
	ttl: number,
	type?: string,
	valueIsJSON?: boolean,
) {
	if (type === undefined || type === 'automatic') {
		// Request the type first
		if (typeof value === 'string') {
			type = 'string';
		} else if (Array.isArray(value)) {
			type = 'list';
		} else if (typeof value === 'object') {
			type = 'hash';
		} else {
			throw new NodeOperationError(
				this.getNode(),
				'Could not identify the type to set. Please set it manually!',
			);
		}
	}

	const commandClient = client as RedisCommandClient;

	if (type === 'string') {
		await commandClient.set(keyName, value.toString());
	} else if (type === 'hash') {
		if (valueIsJSON) {
			let values: unknown;
			if (typeof value === 'string') {
				try {
					values = JSON.parse(value);
				} catch {
					// This is how we originally worked and prevents a breaking change
					values = value;
				}
			} else {
				values = value;
			}
			for (const key of Object.keys(values as object)) {
				await commandClient.hSet(keyName, key, (values as IDataObject)[key]!.toString());
			}
		} else {
			const values = value.toString().split(' ');
			await commandClient.hSet(keyName, values);
		}
	} else if (type === 'list') {
		for (let index = 0; index < (value as string[]).length; index++) {
			await commandClient.lSet(keyName, index, (value as IDataObject)[index]!.toString());
		}
	} else if (type === 'sets') {
		//@ts-ignore
		await commandClient.sAdd(keyName, value);
	}

	if (expire) {
		await commandClient.expire(keyName, ttl);
	}
	return;
}

/**
 * Get keys matching a pattern, with proper support for cluster mode.
 * In cluster mode, KEYS only hits one shard, so we need to iterate all master nodes.
 */
export async function getKeys(
	client: RedisClientType,
	pattern: string,
	isClusterMode: boolean,
): Promise<string[]> {
	const commandClient = client as RedisCommandClient;

	// In standalone mode, use the regular KEYS command
	if (!isClusterMode) {
		return await commandClient.keys(pattern);
	}

	// In cluster mode, iterate over all master nodes to get keys from all shards
	const clusterClient = client as RedisClusterCommandClient;
	const allKeys: string[] = [];
	const masters = clusterClient.masters;

	if (!masters || masters.length === 0) {
		throw new Error('Cluster mode is enabled but no master nodes were found');
	}

	// Collect keys from each master node
	for (const master of masters) {
		try {
			const keys = await master.keys(pattern);
			allKeys.push(...keys);
		} catch (error) {
			// If a master is unavailable, continue with other masters
			// This allows partial results in degraded cluster scenarios
			console.warn(`Failed to get keys from master node: ${error.message}`);
		}
	}

	// Remove duplicates (shouldn't happen in a properly configured cluster, but be safe)
	return [...new Set(allKeys)];
}
