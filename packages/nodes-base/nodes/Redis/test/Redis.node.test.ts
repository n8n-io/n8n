import { mock } from 'jest-mock-extended';
import type { RedisClientType } from '@redis/client';
import type { IExecuteFunctions } from 'n8n-workflow';

const mockClient = mock<RedisClientType>();
const createClient = jest.fn().mockReturnValue(mockClient);
jest.mock('redis', () => ({ createClient }));

import { Redis } from '../Redis.node';
import { setupRedisClient } from '../utils';

describe('Redis Node', () => {
	const node = new Redis();

	beforeEach(() => jest.clearAllMocks());

	describe('setupRedisClient', () => {
		it('should not configure TLS by default', () => {
			setupRedisClient({
				host: 'redis.domain',
				port: 1234,
				database: 0,
			});
			expect(createClient).toHaveBeenCalledWith({
				database: 0,
				password: undefined,
				socket: {
					host: 'redis.domain',
					port: 1234,
					tls: false,
				},
			});
		});

		it('should configure TLS', () => {
			setupRedisClient({
				host: 'redis.domain',
				port: 1234,
				database: 0,
				ssl: true,
			});
			expect(createClient).toHaveBeenCalledWith({
				database: 0,
				password: undefined,
				socket: {
					host: 'redis.domain',
					port: 1234,
					tls: true,
				},
			});
		});
	});

	describe('operations', () => {
		const thisArg = mock<IExecuteFunctions>({});

		const mockCredential = {
			host: 'redis',
			port: 1234,
			database: 0,
			password: 'random',
		};

		thisArg.getCredentials.calledWith('redis').mockResolvedValue(mockCredential);

		afterEach(() => {
			expect(createClient).toHaveBeenCalled();
			expect(mockClient.connect).toHaveBeenCalled();
			expect(mockClient.ping).toHaveBeenCalled();
			expect(mockClient.quit).toHaveBeenCalled();
		});

		describe('info operation', () => {
			it('should return info', async () => {
				thisArg.getNodeParameter.calledWith('operation', 0).mockReturnValue('info');
				mockClient.info.mockResolvedValue(`
# Server
redis_version:6.2.14
redis_git_sha1:00000000
redis_git_dirty:0
redis_mode:standalone
arch_bits:64
tcp_port:6379
uptime_in_seconds:429905
uptime_in_days:4

# Clients
connected_clients:1
cluster_connections:0
max_clients:10000

# Memory
used_memory:876648

# Replication
role:master
connected_slaves:0
master_failover_state:no-failover
	`);

				const output = await node.execute.call(thisArg);

				expect(mockClient.info).toHaveBeenCalled();
				expect(output[0][0].json).toEqual({
					redis_version: 6.2,
					redis_git_sha1: 0,
					redis_git_dirty: 0,
					redis_mode: 'standalone',
					arch_bits: 64,
					tcp_port: 6379,
					uptime_in_seconds: 429905,
					uptime_in_days: 4,
					connected_clients: 1,
					cluster_connections: 0,
					max_clients: 10000,
					used_memory: 876648,
					role: 'master',
					connected_slaves: 0,
					master_failover_state: 'no-failover',
				});
			});
		});

		describe('delete operation', () => {
			it('should delete', async () => {
				thisArg.getInputData.mockReturnValue([{ json: { x: 1 } }]);
				thisArg.getNodeParameter.calledWith('operation', 0).mockReturnValue('delete');
				thisArg.getNodeParameter.calledWith('key', 0).mockReturnValue('key1');
				mockClient.del.calledWith('key1').mockResolvedValue(1);

				const output = await node.execute.call(thisArg);
				expect(mockClient.del).toHaveBeenCalledWith('key1');
				expect(output[0][0].json).toEqual({ x: 1 });
			});
		});

		describe('get operation', () => {
			beforeEach(() => {
				thisArg.getInputData.mockReturnValue([{ json: { x: 1 } }]);
				thisArg.getNodeParameter.calledWith('operation', 0).mockReturnValue('get');
				thisArg.getNodeParameter.calledWith('options', 0).mockReturnValue({ dotNotation: true });
				thisArg.getNodeParameter.calledWith('key', 0).mockReturnValue('key1');
				thisArg.getNodeParameter.calledWith('propertyName', 0).mockReturnValue('x.y');
			});

			it('keyType = automatic', async () => {
				thisArg.getNodeParameter.calledWith('keyType', 0).mockReturnValue('automatic');
				mockClient.type.calledWith('key1').mockResolvedValue('string');
				mockClient.get.calledWith('key1').mockResolvedValue('value');

				const output = await node.execute.call(thisArg);
				expect(mockClient.type).toHaveBeenCalledWith('key1');
				expect(mockClient.get).toHaveBeenCalledWith('key1');
				expect(output[0][0].json).toEqual({ x: { y: 'value' } });
			});

			it('keyType = hash', async () => {
				thisArg.getNodeParameter.calledWith('keyType', 0).mockReturnValue('hash');
				mockClient.hGetAll.calledWith('key1').mockResolvedValue({
					field1: '1',
					field2: '2',
				});

				const output = await node.execute.call(thisArg);
				expect(mockClient.hGetAll).toHaveBeenCalledWith('key1');
				expect(output[0][0].json).toEqual({
					x: {
						y: {
							field1: '1',
							field2: '2',
						},
					},
				});
			});
		});

		describe('keys operation', () => {
			beforeEach(() => {
				thisArg.getInputData.mockReturnValue([{ json: { x: 1 } }]);
				thisArg.getNodeParameter.calledWith('operation', 0).mockReturnValue('keys');
				thisArg.getNodeParameter.calledWith('keyPattern', 0).mockReturnValue('key*');
				mockClient.keys.calledWith('key*').mockResolvedValue(['key1', 'key2']);
			});

			it('getValues = false', async () => {
				thisArg.getNodeParameter.calledWith('getValues', 0).mockReturnValue(false);

				const output = await node.execute.call(thisArg);
				expect(mockClient.keys).toHaveBeenCalledWith('key*');
				expect(output[0][0].json).toEqual({ keys: ['key1', 'key2'] });
			});

			it('getValues = true', async () => {
				thisArg.getNodeParameter.calledWith('getValues', 0).mockReturnValue(true);
				mockClient.type.mockResolvedValue('string');
				mockClient.get.calledWith('key1').mockResolvedValue('value1');
				mockClient.get.calledWith('key2').mockResolvedValue('value2');

				const output = await node.execute.call(thisArg);
				expect(mockClient.keys).toHaveBeenCalledWith('key*');
				expect(output[0][0].json).toEqual({ key1: 'value1', key2: 'value2' });
			});
		});
	});
});
