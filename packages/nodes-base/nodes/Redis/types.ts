import type { createClient, createCluster } from 'redis';

export type RedisClient = ReturnType<typeof createClient>;
export type RedisClusterClient = ReturnType<typeof createCluster>;
export type RedisClientType = RedisClient | RedisClusterClient;

export type RedisCredential = {
	clusterMode?: boolean;
	host: string;
	port: number;
	ssl?: boolean;
	disableTlsVerification?: boolean;
	database: number;
	user?: string;
	password?: string;
};
