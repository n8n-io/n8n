import type { createClient } from 'redis';

export type RedisClient = ReturnType<typeof createClient>;

export type RedisCredential = {
	host: string;
	port: number;
	ssl?: boolean;
	disableTlsVerification?: boolean;
	database: number;
	user?: string;
	password?: string;
};
