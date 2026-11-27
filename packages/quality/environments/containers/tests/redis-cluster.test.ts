import { describe, expect, test } from 'vitest';

import { redis } from '../services/redis';
import {
	assertCompatibleRedisServices,
	buildClusterNatMap,
	buildRedisClusterServerCommand,
	findSlotOwnerNode,
	formatClusterNodes,
	formatNodeStartupLogs,
	isClusterInfoHealthy,
	isClusterTopologyComplete,
	parseBullJobCounterValue,
	parseClusterInfo,
	parseClusterSlots,
	parseMovedError,
	redisCluster,
	toClusterHashTag,
	validateClusterNodeCount,
	type RedisClusterNode,
	type RedisClusterResult,
	type RedisClusterSlotRange,
} from '../services/redis-cluster';
import type { StartContext } from '../services/types';

const SAMPLE_NODES: RedisClusterNode[] = [
	{
		index: 1,
		alias: 'redis-cluster-1',
		ip: '172.20.0.2',
		internalPort: 6379,
		host: 'localhost',
		mappedPort: 32771,
	},
	{
		index: 2,
		alias: 'redis-cluster-2',
		ip: '172.20.0.3',
		internalPort: 6379,
		host: 'localhost',
		mappedPort: 32772,
	},
	{
		index: 3,
		alias: 'redis-cluster-3',
		ip: '172.20.0.4',
		internalPort: 6379,
		host: 'localhost',
		mappedPort: 32773,
	},
];

const SAMPLE_CLUSTER_INFO = [
	'cluster_state:ok',
	'cluster_slots_assigned:16384',
	'cluster_slots_ok:16384',
	'cluster_slots_pfail:0',
	'cluster_slots_fail:0',
	'cluster_known_nodes:3',
	'cluster_size:3',
	'cluster_current_epoch:3',
].join('\r\n');

const SAMPLE_SLOT_RANGES: RedisClusterSlotRange[] = [
	{ start: 0, end: 5460, master: { host: '172.20.0.2', port: 6379, nodeId: 'node-1' } },
	{ start: 5461, end: 10922, master: { host: '172.20.0.3', port: 6379, nodeId: 'node-2' } },
	{ start: 10923, end: 16383, master: { host: '172.20.0.4', port: 6379, nodeId: 'node-3' } },
];

describe('validateClusterNodeCount', () => {
	test.each([3, 4, 6])('accepts valid cluster primary count: %d', (count) => {
		expect(() => validateClusterNodeCount(count)).not.toThrow();
	});

	test.each([0, 1, 2, -1, 2.5, Number.NaN])(
		'rejects invalid cluster primary count: %s',
		(count) => {
			expect(() => validateClusterNodeCount(count)).toThrow(/at least 3/);
		},
	);
});

describe('assertCompatibleRedisServices', () => {
	test('rejects enabling both standalone redis and redisCluster', () => {
		expect(() => assertCompatibleRedisServices(['postgres', 'redis', 'redisCluster'])).toThrow(
			/Cannot enable both "redis" and "redisCluster"/,
		);
	});

	test.each([[['redis']], [['redisCluster']], [['postgres', 'mailpit']], [[]]] as const)(
		'allows compatible service lists: %j',
		(services) => {
			expect(() => assertCompatibleRedisServices(services)).not.toThrow();
		},
	);
});

describe('redis service precedence with redisCluster', () => {
	const context = (config: StartContext['config'], isQueueMode = false) =>
		({ config, isQueueMode }) as StartContext;

	test('skips standalone redis auto-start in queue mode when redisCluster is enabled', () => {
		expect(redis.shouldStart?.(context({ services: ['redisCluster'] }, true))).toBe(false);
	});

	test('skips standalone redis auto-start for container engine when redisCluster is enabled', () => {
		expect(
			redis.shouldStart?.(context({ engine: 'container', services: ['redisCluster'] }, false)),
		).toBe(false);
	});

	test('keeps standalone redis auto-start in queue mode when redisCluster is not enabled', () => {
		expect(redis.shouldStart?.(context({ services: ['mailpit'] }, true))).toBe(true);
	});
});

describe('toClusterHashTag', () => {
	test('wraps bare and half-wrapped prefixes in curly braces', () => {
		expect(toClusterHashTag('bull')).toBe('{bull}');
		expect(toClusterHashTag('{bull}')).toBe('{bull}');
		expect(toClusterHashTag('{bull')).toBe('{bull}');
		expect(toClusterHashTag('bull}')).toBe('{bull}');
		expect(toClusterHashTag(' n8n:cache ')).toBe('{n8n:cache}');
	});

	test.each(['', '   '])('rejects empty prefix: %j', (prefix) => {
		expect(() => toClusterHashTag(prefix)).toThrow(/non-empty/);
	});
});

describe('formatClusterNodes and buildClusterNatMap', () => {
	test('formats internal Docker aliases and external host-mapped ports', () => {
		expect(formatClusterNodes(SAMPLE_NODES, false)).toBe(
			'redis-cluster-1:6379,redis-cluster-2:6379,redis-cluster-3:6379',
		);
		expect(formatClusterNodes(SAMPLE_NODES, true)).toBe(
			'localhost:32771,localhost:32772,localhost:32773',
		);
	});

	test('rejects an empty node list', () => {
		expect(() => formatClusterNodes([])).toThrow(/at least one node/);
	});

	test('maps both container IPs and network aliases to host-mapped ports', () => {
		expect(buildClusterNatMap(SAMPLE_NODES)).toEqual({
			'172.20.0.2:6379': { host: 'localhost', port: 32771 },
			'redis-cluster-1:6379': { host: 'localhost', port: 32771 },
			'172.20.0.3:6379': { host: 'localhost', port: 32772 },
			'redis-cluster-2:6379': { host: 'localhost', port: 32772 },
			'172.20.0.4:6379': { host: 'localhost', port: 32773 },
			'redis-cluster-3:6379': { host: 'localhost', port: 32773 },
		});
	});
});

describe('parseClusterInfo and isClusterInfoHealthy', () => {
	test('parses healthy CLUSTER INFO output', () => {
		const info = parseClusterInfo(SAMPLE_CLUSTER_INFO);

		expect(info).toMatchObject({
			clusterState: 'ok',
			clusterSlotsAssigned: 16384,
			clusterSlotsOk: 16384,
			clusterSlotsPfail: 0,
			clusterSlotsFail: 0,
			clusterKnownNodes: 3,
			clusterSize: 3,
		});
		expect(isClusterInfoHealthy(info, 3)).toBe(true);
		expect(isClusterInfoHealthy(info, 6)).toBe(false);
	});

	test.each([
		{ scenario: 'cluster_state is fail', patch: { clusterState: 'fail' } },
		{ scenario: 'not all slots are assigned', patch: { clusterSlotsAssigned: 16383 } },
		{ scenario: 'not all slots are ok', patch: { clusterSlotsOk: 16380 } },
		{ scenario: 'slots are in pfail', patch: { clusterSlotsPfail: 1 } },
		{ scenario: 'slots are in fail', patch: { clusterSlotsFail: 1 } },
		{ scenario: 'known node count mismatches', patch: { clusterKnownNodes: 2 } },
		{ scenario: 'cluster size mismatches', patch: { clusterSize: 2 } },
	])('reports unhealthy when $scenario', ({ patch }) => {
		const info = { ...parseClusterInfo(SAMPLE_CLUSTER_INFO), ...patch };
		expect(isClusterInfoHealthy(info, 3)).toBe(false);
	});

	test('rejects malformed or missing CLUSTER INFO fields', () => {
		expect(() => parseClusterInfo('ERR This instance has cluster support disabled')).toThrow(
			/missing cluster_state/,
		);
		expect(() => parseClusterInfo('cluster_state:ok\ncluster_slots_assigned:bad')).toThrow(
			/cluster_slots_assigned/,
		);
	});
});

describe('parseClusterSlots and isClusterTopologyComplete', () => {
	test('parses and sorts CLUSTER SLOTS responses and validates complete coverage', () => {
		const raw = [
			[10923, 16383, ['172.20.0.4', 6379, 'node-3']],
			[0, 5460, ['172.20.0.2', 6379, 'node-1']],
			[5461, 10922, ['172.20.0.3', 6379, 'node-2']],
		];

		const ranges = parseClusterSlots(raw);
		expect(ranges).toEqual(SAMPLE_SLOT_RANGES);
		expect(isClusterTopologyComplete(ranges, 3)).toBe(true);
		expect(isClusterTopologyComplete(ranges, 2)).toBe(false);
	});

	test.each([
		{ scenario: 'empty ranges', ranges: [] },
		{
			scenario: 'gap between ranges',
			ranges: [
				SAMPLE_SLOT_RANGES[0],
				{ ...SAMPLE_SLOT_RANGES[1], start: 5462 },
				SAMPLE_SLOT_RANGES[2],
			],
		},
		{
			scenario: 'overlapping ranges',
			ranges: [
				SAMPLE_SLOT_RANGES[0],
				{ ...SAMPLE_SLOT_RANGES[1], start: 5460 },
				SAMPLE_SLOT_RANGES[2],
			],
		},
		{
			scenario: 'missing trailing slots',
			ranges: [
				SAMPLE_SLOT_RANGES[0],
				SAMPLE_SLOT_RANGES[1],
				{ ...SAMPLE_SLOT_RANGES[2], end: 16382 },
			],
		},
		{
			scenario: 'duplicate primary owning multiple ranges',
			ranges: [
				SAMPLE_SLOT_RANGES[0],
				{ ...SAMPLE_SLOT_RANGES[1], master: SAMPLE_SLOT_RANGES[0].master },
				SAMPLE_SLOT_RANGES[2],
			],
		},
	])('rejects incomplete topology: $scenario', ({ ranges }) => {
		expect(isClusterTopologyComplete(ranges, 3)).toBe(false);
	});

	test.each([
		'not-an-array',
		[[0, 10]],
		[[10, 5, ['172.20.0.2', 6379]]],
		[[-1, 5, ['172.20.0.2', 6379]]],
		[[0, 16384, ['172.20.0.2', 6379]]],
		[[0, 5, ['', 6379]]],
		[[0, 5, ['172.20.0.2', 0]]],
	])('throws on malformed CLUSTER SLOTS payload: %j', (payload) => {
		expect(() => parseClusterSlots(payload)).toThrow();
	});
});

describe('findSlotOwnerNode', () => {
	test('resolves the primary node owning a given hash slot', () => {
		expect(findSlotOwnerNode(0, SAMPLE_SLOT_RANGES, SAMPLE_NODES)).toBe(SAMPLE_NODES[0]);
		expect(findSlotOwnerNode(10051, SAMPLE_SLOT_RANGES, SAMPLE_NODES)).toBe(SAMPLE_NODES[1]);
		expect(findSlotOwnerNode(16383, SAMPLE_SLOT_RANGES, SAMPLE_NODES)).toBe(SAMPLE_NODES[2]);
	});

	test('matches primaries announced by network alias or host-mapped endpoint', () => {
		const aliasRanges: RedisClusterSlotRange[] = [
			{ start: 0, end: 16383, master: { host: 'redis-cluster-2', port: 6379 } },
		];
		expect(findSlotOwnerNode(100, aliasRanges, SAMPLE_NODES)).toBe(SAMPLE_NODES[1]);

		const hostRanges: RedisClusterSlotRange[] = [
			{ start: 0, end: 16383, master: { host: 'localhost', port: 32773 } },
		];
		expect(findSlotOwnerNode(100, hostRanges, SAMPLE_NODES)).toBe(SAMPLE_NODES[2]);
	});

	test('throws for out-of-range slots or unknown primary endpoints', () => {
		expect(() => findSlotOwnerNode(16384, SAMPLE_SLOT_RANGES, SAMPLE_NODES)).toThrow(
			/Invalid Redis hash slot/,
		);
		expect(() =>
			findSlotOwnerNode(
				10,
				[{ start: 0, end: 100, master: { host: '10.0.0.9', port: 6379 } }],
				SAMPLE_NODES,
			),
		).toThrow(/unknown master/);
	});
});

describe('parseMovedError', () => {
	test('parses IPv4, hostname, and IPv6 MOVED redirects', () => {
		expect(parseMovedError('MOVED 10051 172.20.0.3:6379')).toEqual({
			slot: 10051,
			host: '172.20.0.3',
			port: 6379,
		});
		expect(parseMovedError('MOVED 0 redis-cluster-1:6379')).toEqual({
			slot: 0,
			host: 'redis-cluster-1',
			port: 6379,
		});
		expect(parseMovedError('MOVED 16383 [::1]:6379')).toEqual({
			slot: 16383,
			host: '::1',
			port: 6379,
		});
	});

	test.each([
		'ERR This instance has cluster support disabled',
		'ASK 10051 172.20.0.3:6379',
		'MOVED 16384 172.20.0.3:6379',
		'MOVED 10 172.20.0.3:0',
		'',
	])('returns null for non-MOVED or invalid error: %j', (message) => {
		expect(parseMovedError(message)).toBeNull();
	});
});

describe('parseBullJobCounterValue', () => {
	test('parses empty and numeric Bull counter replies', () => {
		expect(parseBullJobCounterValue(null)).toBe(0);
		expect(parseBullJobCounterValue('')).toBe(0);
		expect(parseBullJobCounterValue('  ')).toBe(0);
		expect(parseBullJobCounterValue('42')).toBe(42);
	});

	test.each(['-1', 'abc', '1.5'])('rejects invalid Bull counter value: %j', (raw) => {
		expect(() => parseBullJobCounterValue(raw)).toThrow(/Unexpected Redis Bull job counter/);
	});
});

describe('buildRedisClusterServerCommand', () => {
	test('enables cluster mode with ephemeral storage on the requested port', () => {
		const cmd = buildRedisClusterServerCommand({ port: 7000 });
		expect(cmd).toEqual([
			'redis-server',
			'--port',
			'7000',
			'--bind',
			'0.0.0.0',
			'--protected-mode',
			'no',
			'--cluster-enabled',
			'yes',
			'--cluster-config-file',
			'nodes.conf',
			'--cluster-node-timeout',
			'5000',
			'--appendonly',
			'no',
			'--save',
			'',
		]);
	});

	test('configures explicit bus port and hostname announcements for external mode', () => {
		const cmd = buildRedisClusterServerCommand({
			port: 60001,
			clusterBusPort: 16379,
			announceHostname: 'localhost',
		});
		expect(cmd).toEqual([
			'redis-server',
			'--port',
			'60001',
			'--bind',
			'0.0.0.0',
			'--protected-mode',
			'no',
			'--cluster-enabled',
			'yes',
			'--cluster-config-file',
			'nodes.conf',
			'--cluster-node-timeout',
			'5000',
			'--appendonly',
			'no',
			'--save',
			'',
			'--cluster-port',
			'16379',
			'--cluster-announce-hostname',
			'localhost',
			'--cluster-preferred-endpoint-type',
			'hostname',
		]);

		expect(
			buildRedisClusterServerCommand({
				port: 35001,
				clusterBusPort: 16379,
				announceHostname: '127.0.0.1',
			}),
		).toContain('127.0.0.1');
	});

	test.each([
		{ scenario: 'port is out of range', options: { port: 0 }, pattern: /Invalid Redis port/ },
		{
			scenario: 'high port lacks explicit bus port',
			options: { port: 55536 },
			pattern: /pass clusterBusPort explicitly/,
		},
		{
			scenario: 'bus port is out of range',
			options: { port: 6379, clusterBusPort: 70000 },
			pattern: /Invalid Redis cluster bus port/,
		},
		{
			scenario: 'bus port collides with client port',
			options: { port: 16379, clusterBusPort: 16379 },
			pattern: /must differ from client port/,
		},
		{
			scenario: 'announce hostname is empty',
			options: { port: 6379, announceHostname: '  ' },
			pattern: /Invalid Redis cluster announce hostname/,
		},
		{
			scenario: 'announce hostname contains IPv6 colon',
			options: { port: 6379, announceHostname: '::1' },
			pattern: /Invalid Redis cluster announce hostname/,
		},
	])('rejects invalid command options: $scenario', ({ options, pattern }) => {
		expect(() => buildRedisClusterServerCommand(options)).toThrow(pattern);
	});
});

describe('formatNodeStartupLogs', () => {
	test('formats logs from all nodes and skips empty entries', () => {
		const formatted = formatNodeStartupLogs([
			{ alias: 'redis-cluster-1', logs: 'node 1 booted\ncluster failed' },
			{ alias: 'redis-cluster-2', logs: '   \n  ' },
			{ alias: 'redis-cluster-3', logs: 'node 3 booted' },
		]);

		expect(formatted).toBe(
			[
				'--- Container Logs (redis-cluster-1) ---',
				'node 1 booted',
				'cluster failed',
				'---------------------',
				'--- Container Logs (redis-cluster-3) ---',
				'node 3 booted',
				'---------------------',
			].join('\n'),
		);
	});

	test('returns an empty string when no node emitted logs', () => {
		expect(
			formatNodeStartupLogs([
				{ alias: 'redis-cluster-1', logs: '' },
				{ alias: 'redis-cluster-2', logs: '  ' },
			]),
		).toBe('');
	});
});

describe('redisCluster.env external-mode guard', () => {
	const makeResult = (external?: boolean) =>
		({
			meta: { nodes: SAMPLE_NODES, ...(external !== undefined ? { external } : {}) },
		}) as RedisClusterResult;

	test('returns external host-mapped env when started with external: true', () => {
		expect(redisCluster.env?.(makeResult(true), true)).toEqual({
			EXECUTIONS_MODE: 'queue',
			QUEUE_BULL_REDIS_CLUSTER_NODES: 'localhost:32771,localhost:32772,localhost:32773',
			N8N_CACHE_ENABLED: 'true',
			N8N_CACHE_BACKEND: 'redis',
		});
	});

	test('rejects external env generation when started for container networking only', () => {
		expect(() => redisCluster.env?.(makeResult(false), true)).toThrow(
			/start it with external: true/,
		);
		expect(() => redisCluster.env?.(makeResult(undefined), true)).toThrow(
			/start it with external: true/,
		);
	});
});
