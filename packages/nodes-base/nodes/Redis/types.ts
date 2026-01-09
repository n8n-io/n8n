import type { createClient, createCluster } from 'redis';

export type RedisClient = ReturnType<typeof createClient>;
export type RedisClusterClient = ReturnType<typeof createCluster>;
export type RedisClientType = RedisClient | RedisClusterClient;

// Type for Redis pub/sub operations
export interface RedisPubSubClient {
	pSubscribe(
		channels: string | string[],
		listener: (message: string, channel: string) => void,
	): Promise<void>;
	pUnsubscribe(channels?: string | string[]): Promise<void>;
	connect(): Promise<void>;
	quit(): Promise<void>;
	disconnect(): Promise<void>;
}

// Type for common Redis operations used in the Redis node
export interface RedisCommandClient {
	connect(): Promise<void>;
	quit(): Promise<void>;
	disconnect(): Promise<void>;
	info(): Promise<string>;
	del(...keys: string[]): Promise<number>;
	incr(key: string): Promise<number>;
	expire(key: string, seconds: number): Promise<boolean>;
	publish(channel: string, message: string): Promise<number>;
	lPush(key: string, ...values: string[]): Promise<number>;
	rPush(key: string, ...values: string[]): Promise<number>;
	lPop(key: string): Promise<string | null>;
	rPop(key: string): Promise<string | null>;
	// Additional commands for getValue/setValue
	type(key: string): Promise<string>;
	get(key: string): Promise<string | null>;
	set(key: string, value: string): Promise<string | null>;
	hGetAll(key: string): Promise<Record<string, string>>;
	hSet(key: string, field: string, value: string): Promise<number>;
	hSet(key: string, data: string[]): Promise<number>;
	lRange(key: string, start: number, stop: number): Promise<string[]>;
	lSet(key: string, index: number, value: string): Promise<string | null>;
	sMembers(key: string): Promise<string[]>;
	sAdd(key: string, ...members: string[]): Promise<number>;
	keys(pattern: string): Promise<string[]>;
}

// Type for cluster-specific operations
export interface RedisClusterCommandClient extends RedisCommandClient {
	masters: Array<RedisCommandClient>;
}

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
