import { mock } from 'jest-mock-extended';
import type { RedisClientType } from '@redis/client';
import type { IExecuteFunctions } from 'n8n-workflow';
import { Redis } from '../Redis.node';

const mockClient = mock<RedisClientType>();
jest.mock('redis', () => ({
	createClient: () => mockClient,
}));

describe('Redis Node', () => {
	const mockCredential = {
		host: 'redis',
		port: 1234,
		database: 0,
		password: 'random',
	};

	const node = new Redis();
	const thisArg = mock<IExecuteFunctions>({});
	thisArg.getCredentials.calledWith('redis').mockResolvedValue(mockCredential);

	beforeEach(() => jest.clearAllMocks());

	it('info operation', async () => {
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

		expect(mockClient.connect).toHaveBeenCalled();
		expect(mockClient.ping).toHaveBeenCalled();
		expect(mockClient.info).toHaveBeenCalled();
		expect(mockClient.quit).toHaveBeenCalled();

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

	it('delete operation', async () => {
		thisArg.getInputData.mockReturnValue([{ json: { x: 1 } }]);
		thisArg.getNodeParameter.calledWith('operation', 0).mockReturnValue('delete');
		thisArg.getNodeParameter.calledWith('key', 0).mockReturnValue('key1');
		mockClient.del.calledWith('key1').mockResolvedValue(1);

		const output = await node.execute.call(thisArg);
		expect(mockClient.connect).toHaveBeenCalled();
		expect(mockClient.ping).toHaveBeenCalled();
		expect(mockClient.info).not.toHaveBeenCalled();
		expect(mockClient.del).toHaveBeenCalledWith('key1');
		expect(mockClient.quit).toHaveBeenCalled();
		expect(output[0][0].json).toEqual({ x: 1 });
	});
});
