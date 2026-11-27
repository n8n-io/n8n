import getPort from 'get-port';
import Redis, { Cluster, type ClusterNode, type ClusterOptions, type NatMap } from 'ioredis';
import { setTimeout as delay } from 'node:timers/promises';
import type { StartedNetwork, StartedTestContainer } from 'testcontainers';
import { GenericContainer, getContainerRuntimeClient, Wait } from 'testcontainers';

import { createSilentLogConsumer } from '../helpers/utils';
import { TEST_CONTAINER_IMAGES } from '../test-containers';
import type { HelperContext, Service, ServiceName, ServiceResult, StartContext } from './types';

const REDIS_PORT = 6379;
const REDIS_CLUSTER_BUS_PORT = 16379;
const MAX_PORT = 65535;
const DEFAULT_CLUSTER_BUS_OFFSET = 10_000;
const NODE_HOSTNAME_PREFIX = 'redis-cluster';
const DEFAULT_CLUSTER_NODE_COUNT = 3;
const MIN_CLUSTER_NODE_COUNT = 3;
const CLUSTER_SLOTS_COUNT = 16384;
const CLUSTER_NODE_TIMEOUT_MS = 5_000;
const CLUSTER_READY_TIMEOUT_MS = 30_000;
const CLUSTER_READY_POLL_INTERVAL_MS = 250;
const CLIENT_CONNECT_TIMEOUT_MS = 5_000;

export interface RedisClusterNode {
	/** 1-based node index within the cluster. */
	index: number;
	/** Docker network alias (for example `redis-cluster-1`). */
	alias: string;
	/** Container IP address on the stack Docker network. */
	ip: string;
	/** Internal Redis client port inside the Docker network. */
	internalPort: number;
	/** Host-reachable address for test clients. */
	host: string;
	/** Host-mapped port corresponding to `internalPort`. */
	mappedPort: number;
}

export interface RedisClusterMeta {
	nodes: RedisClusterNode[];
	/** True when cluster nodes advertise host-reachable endpoints for external/local-dev clients. */
	external?: boolean;
}

export type RedisClusterResult = ServiceResult<RedisClusterMeta> & {
	containers: StartedTestContainer[];
};

export interface RedisClusterInfo {
	clusterState: string;
	clusterSlotsAssigned: number;
	clusterSlotsOk: number;
	clusterSlotsPfail: number;
	clusterSlotsFail: number;
	clusterKnownNodes: number;
	clusterSize: number;
	fields: Record<string, string>;
}

export interface RedisClusterSlotRange {
	start: number;
	end: number;
	master: {
		host: string;
		port: number;
		nodeId?: string;
	};
}

export interface RedisMovedRedirect {
	slot: number;
	host: string;
	port: number;
}

export interface RedisClusterSlotRoutingResult {
	key: string;
	slot: number;
	ownerNode: RedisClusterNode;
	nonOwnerNode: RedisClusterNode;
	movedRedirect: RedisMovedRedirect;
	ownerValue: string | null;
	routedValue: string | null;
}

/** Reject stack configurations that request both standalone Redis and Redis Cluster. */
export function assertCompatibleRedisServices(enabledServices: readonly ServiceName[]): void {
	if (enabledServices.includes('redis') && enabledServices.includes('redisCluster')) {
		throw new Error('Cannot enable both "redis" and "redisCluster" services in the same stack');
	}
}

/** Validate the primary node count for a Redis Cluster. */
export function validateClusterNodeCount(nodeCount: number): void {
	if (!Number.isInteger(nodeCount) || nodeCount < MIN_CLUSTER_NODE_COUNT) {
		throw new Error(
			`Redis Cluster requires an integer node count of at least ${MIN_CLUSTER_NODE_COUNT}, got ${String(nodeCount)}`,
		);
	}
}

/** Wrap a Redis key prefix in hash-tag braces so all keys share one cluster hash slot. */
export function toClusterHashTag(prefix: string): string {
	const trimmed = prefix.trim();
	if (!trimmed) {
		throw new Error('Redis cluster hash-tag prefix must be a non-empty string');
	}
	let result = trimmed;
	if (!result.startsWith('{')) result = `{${result}`;
	if (!result.endsWith('}')) result = `${result}}`;
	return result;
}

/** Format `QUEUE_BULL_REDIS_CLUSTER_NODES` as comma-separated `host:port` pairs. */
export function formatClusterNodes(nodes: readonly RedisClusterNode[], external = false): string {
	if (nodes.length === 0) {
		throw new Error('Redis Cluster must contain at least one node');
	}
	return nodes
		.map((node) =>
			external ? `${node.host}:${node.mappedPort}` : `${node.alias}:${node.internalPort}`,
		)
		.join(',');
}

/**
 * Build an `ioredis` NAT map from container-internal Redis Cluster addresses
 * (both IP and alias) to host-mapped ports.
 */
export function buildClusterNatMap(nodes: readonly RedisClusterNode[]): NatMap {
	const natMap: NatMap = {};
	for (const node of nodes) {
		const target = { host: node.host, port: node.mappedPort };
		natMap[`${node.ip}:${node.internalPort}`] = target;
		natMap[`${node.alias}:${node.internalPort}`] = target;
	}
	return natMap;
}

function parseNonNegativeIntField(fields: Record<string, string>, key: string): number {
	const raw = fields[key];
	if (raw === undefined || !/^\d+$/.test(raw)) {
		throw new Error(
			`CLUSTER INFO field "${key}" must be a non-negative integer, got "${raw ?? ''}"`,
		);
	}
	return Number.parseInt(raw, 10);
}

/** Parse Redis `CLUSTER INFO` text output into structured cluster state fields. */
export function parseClusterInfo(raw: string): RedisClusterInfo {
	const fields: Record<string, string> = {};
	for (const rawLine of raw.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith('#')) continue;
		const separator = line.indexOf(':');
		if (separator <= 0) continue;
		const key = line.slice(0, separator).trim();
		const value = line.slice(separator + 1).trim();
		fields[key] = value;
	}

	const clusterState = fields.cluster_state;
	if (!clusterState) {
		throw new Error(`CLUSTER INFO output is missing cluster_state: ${raw.slice(0, 400)}`);
	}

	return {
		clusterState,
		clusterSlotsAssigned: parseNonNegativeIntField(fields, 'cluster_slots_assigned'),
		clusterSlotsOk: parseNonNegativeIntField(fields, 'cluster_slots_ok'),
		clusterSlotsPfail: parseNonNegativeIntField(fields, 'cluster_slots_pfail'),
		clusterSlotsFail: parseNonNegativeIntField(fields, 'cluster_slots_fail'),
		clusterKnownNodes: parseNonNegativeIntField(fields, 'cluster_known_nodes'),
		clusterSize: parseNonNegativeIntField(fields, 'cluster_size'),
		fields,
	};
}

/** Return true when `CLUSTER INFO` reports a healthy cluster with all slots assigned. */
export function isClusterInfoHealthy(info: RedisClusterInfo, expectedNodeCount: number): boolean {
	return (
		info.clusterState === 'ok' &&
		info.clusterSlotsAssigned === CLUSTER_SLOTS_COUNT &&
		info.clusterSlotsOk === CLUSTER_SLOTS_COUNT &&
		info.clusterSlotsPfail === 0 &&
		info.clusterSlotsFail === 0 &&
		info.clusterKnownNodes === expectedNodeCount &&
		info.clusterSize === expectedNodeCount
	);
}

function parseSlotNumber(value: unknown, label: string): number {
	if (
		typeof value !== 'number' ||
		!Number.isInteger(value) ||
		value < 0 ||
		value >= CLUSTER_SLOTS_COUNT
	) {
		throw new Error(`Invalid CLUSTER SLOTS ${label}: ${String(value)}`);
	}
	return value;
}

/** Parse the raw nested array returned by Redis `CLUSTER SLOTS`. */
export function parseClusterSlots(raw: unknown): RedisClusterSlotRange[] {
	if (!Array.isArray(raw)) {
		throw new Error('Expected CLUSTER SLOTS response to be an array');
	}

	const ranges: RedisClusterSlotRange[] = [];
	for (const entry of raw) {
		if (!Array.isArray(entry) || entry.length < 3) {
			throw new Error('Malformed CLUSTER SLOTS entry: expected [start, end, master, ...]');
		}
		const start = parseSlotNumber(entry[0], 'start slot');
		const end = parseSlotNumber(entry[1], 'end slot');
		if (start > end) {
			throw new Error(`Invalid CLUSTER SLOTS range: start (${start}) > end (${end})`);
		}

		const masterEntry: unknown = entry[2];
		if (!Array.isArray(masterEntry) || masterEntry.length < 2) {
			throw new Error('Malformed CLUSTER SLOTS master entry: expected [host, port, ...]');
		}
		const host: unknown = masterEntry[0];
		const port: unknown = masterEntry[1];
		const nodeId: unknown = masterEntry[2];
		if (typeof host !== 'string' || host.trim().length === 0) {
			throw new Error(`Invalid CLUSTER SLOTS master host: ${String(host)}`);
		}
		if (typeof port !== 'number' || !Number.isInteger(port) || port <= 0) {
			throw new Error(`Invalid CLUSTER SLOTS master port: ${String(port)}`);
		}

		ranges.push({
			start,
			end,
			master: {
				host,
				port,
				...(typeof nodeId === 'string' && nodeId.length > 0 ? { nodeId } : {}),
			},
		});
	}

	return ranges.sort((a, b) => a.start - b.start);
}

/**
 * Return true when slot ranges cover slots `0..16383` without gaps or overlaps
 * and span the expected number of distinct primary endpoints.
 */
export function isClusterTopologyComplete(
	slotRanges: readonly RedisClusterSlotRange[],
	expectedNodeCount: number,
): boolean {
	if (slotRanges.length === 0) return false;

	const sorted = [...slotRanges].sort((a, b) => a.start - b.start);
	let nextExpectedSlot = 0;
	const primaries = new Set<string>();

	for (const range of sorted) {
		if (range.start !== nextExpectedSlot) {
			return false;
		}
		if (range.end < range.start || range.end >= CLUSTER_SLOTS_COUNT) {
			return false;
		}
		primaries.add(`${range.master.host}:${range.master.port}`);
		nextExpectedSlot = range.end + 1;
	}

	return nextExpectedSlot === CLUSTER_SLOTS_COUNT && primaries.size === expectedNodeCount;
}

/** Find the cluster node that owns `slot` in `slotRanges`. */
export function findSlotOwnerNode(
	slot: number,
	slotRanges: readonly RedisClusterSlotRange[],
	nodes: readonly RedisClusterNode[],
): RedisClusterNode {
	if (!Number.isInteger(slot) || slot < 0 || slot >= CLUSTER_SLOTS_COUNT) {
		throw new Error(`Invalid Redis hash slot: ${String(slot)}`);
	}
	const range = slotRanges.find((entry) => slot >= entry.start && slot <= entry.end);
	if (!range) {
		throw new Error(`No cluster slot range covers slot ${slot}`);
	}
	const owner = nodes.find(
		(node) =>
			((node.ip === range.master.host || node.alias === range.master.host) &&
				node.internalPort === range.master.port) ||
			(node.host === range.master.host && node.mappedPort === range.master.port),
	);
	if (!owner) {
		throw new Error(
			`Cluster slot ${slot} maps to unknown master ${range.master.host}:${range.master.port}`,
		);
	}
	return owner;
}

/** Parse a Redis `MOVED <slot> <host>:<port>` error message. Returns null for other errors. */
export function parseMovedError(message: string): RedisMovedRedirect | null {
	const match = /^MOVED\s+(\d+)\s+(?:\[([^\]]+)\]|([^\s:]+)):(\d+)$/.exec(message.trim());
	if (!match) return null;

	const slot = Number.parseInt(match[1], 10);
	const host = match[2] ?? match[3];
	const port = Number.parseInt(match[4], 10);
	if (!host || slot < 0 || slot >= CLUSTER_SLOTS_COUNT || port <= 0) {
		return null;
	}
	return { slot, host, port };
}

/** Parse the Bull monotonic job counter value (`{bull}:jobs:id`). */
export function parseBullJobCounterValue(raw: string | null): number {
	if (raw === null) return 0;
	const trimmed = raw.trim();
	if (trimmed === '') return 0;
	if (!/^\d+$/.test(trimmed)) {
		throw new Error(`Unexpected Redis Bull job counter value: "${trimmed}"`);
	}
	return Number.parseInt(trimmed, 10);
}

export interface RedisClusterServerCommandOptions {
	/** Internal Redis client port (default: 6379). */
	port?: number;
	/** Explicit internal cluster bus port. Required when `port > 55535`. */
	clusterBusPort?: number;
	/** Host-reachable hostname or IPv4 address advertised via `CLUSTER SLOTS` and `MOVED`. */
	announceHostname?: string;
}

/** Build `redis-server` arguments for one Redis Cluster primary container. */
export function buildRedisClusterServerCommand(
	options: RedisClusterServerCommandOptions = {},
): string[] {
	const { port = REDIS_PORT, clusterBusPort, announceHostname } = options;
	if (!Number.isInteger(port) || port <= 0 || port > MAX_PORT) {
		throw new Error(`Invalid Redis port: ${String(port)}`);
	}
	if (clusterBusPort !== undefined) {
		if (!Number.isInteger(clusterBusPort) || clusterBusPort <= 0 || clusterBusPort > MAX_PORT) {
			throw new Error(`Invalid Redis cluster bus port: ${String(clusterBusPort)}`);
		}
		if (clusterBusPort === port) {
			throw new Error(
				`Redis cluster bus port (${clusterBusPort}) must differ from client port (${port})`,
			);
		}
	} else if (port + DEFAULT_CLUSTER_BUS_OFFSET > MAX_PORT) {
		throw new Error(
			`Redis port ${port} exceeds ${MAX_PORT - DEFAULT_CLUSTER_BUS_OFFSET}; pass clusterBusPort explicitly`,
		);
	}

	const command = [
		'redis-server',
		'--port',
		String(port),
		'--bind',
		'0.0.0.0',
		'--protected-mode',
		'no',
		'--cluster-enabled',
		'yes',
		'--cluster-config-file',
		'nodes.conf',
		'--cluster-node-timeout',
		String(CLUSTER_NODE_TIMEOUT_MS),
		'--appendonly',
		'no',
		'--save',
		'',
	];

	if (clusterBusPort !== undefined) {
		command.push('--cluster-port', String(clusterBusPort));
	}

	if (announceHostname !== undefined) {
		const trimmedHost = announceHostname.trim();
		if (!trimmedHost || !/^[A-Za-z0-9.-]+$/.test(trimmedHost)) {
			throw new Error(
				`Invalid Redis cluster announce hostname "${announceHostname}": expected a hostname or IPv4 address`,
			);
		}
		command.push(
			'--cluster-announce-hostname',
			trimmedHost,
			'--cluster-preferred-endpoint-type',
			'hostname',
		);
	}

	return command;
}

/** Format collected startup logs from every cluster node for failure diagnostics. */
export function formatNodeStartupLogs(
	entries: ReadonlyArray<{ alias: string; logs: string }>,
): string {
	const sections: string[] = [];
	for (const { alias, logs } of entries) {
		const trimmed = logs.trim();
		if (!trimmed) continue;
		sections.push(`--- Container Logs (${alias}) ---\n${trimmed}\n---------------------`);
	}
	return sections.join('\n');
}

/**
 * Helper for inspecting and querying a Redis Cluster test service via `ioredis`.
 * Translates container-internal cluster endpoints to host-mapped ports through `natMap`
 * unless the cluster was started in external mode with host-reachable advertised endpoints.
 */
export class RedisClusterHelper {
	readonly nodes: readonly RedisClusterNode[];
	readonly external: boolean;
	readonly clusterNodesEnv: string;
	readonly externalClusterNodesEnv: string;
	readonly natMap: NatMap;

	constructor(meta: RedisClusterMeta) {
		if (meta.nodes.length === 0) {
			throw new Error('RedisClusterHelper requires at least one cluster node');
		}
		this.nodes = meta.nodes;
		this.external = meta.external ?? false;
		this.clusterNodesEnv = formatClusterNodes(meta.nodes, false);
		this.externalClusterNodesEnv = formatClusterNodes(meta.nodes, true);
		this.natMap = buildClusterNatMap(meta.nodes);
	}

	private createNodeClient(node: RedisClusterNode): Redis {
		const client = new Redis({
			host: node.host,
			port: node.mappedPort,
			lazyConnect: true,
			connectTimeout: CLIENT_CONNECT_TIMEOUT_MS,
			maxRetriesPerRequest: 1,
			retryStrategy: () => null,
		});
		// Prevent unhandled EventEmitter errors when probing unreachable or standalone nodes.
		client.on('error', () => {});
		return client;
	}

	/** Create an `ioredis` Cluster client configured with host-mapped startup nodes. */
	createClusterClient(startupNodes?: ClusterNode[], options: ClusterOptions = {}): Cluster {
		const seeds: ClusterNode[] =
			startupNodes ?? this.nodes.map((node) => ({ host: node.host, port: node.mappedPort }));
		const cluster = new Cluster(seeds, {
			...(this.external ? {} : { natMap: this.natMap }),
			clusterRetryStrategy: () => null,
			slotsRefreshTimeout: CLIENT_CONNECT_TIMEOUT_MS,
			lazyConnect: true,
			redisOptions: {
				connectTimeout: CLIENT_CONNECT_TIMEOUT_MS,
				maxRetriesPerRequest: 1,
			},
			...options,
		});
		cluster.on('error', () => {});
		cluster.on('node error', () => {});
		return cluster;
	}

	/** Run `fn` against a single cluster node and close the connection afterwards. */
	async withNodeClient<T>(node: RedisClusterNode, fn: (client: Redis) => Promise<T>): Promise<T> {
		const client = this.createNodeClient(node);
		try {
			await client.connect();
			return await fn(client);
		} finally {
			client.disconnect();
		}
	}

	/** Run `fn` with an `ioredis` Cluster client and close all connections afterwards. */
	async withClusterClient<T>(
		fn: (client: Cluster) => Promise<T>,
		startupNodes?: ClusterNode[],
	): Promise<T> {
		const cluster = this.createClusterClient(startupNodes);
		try {
			await cluster.connect();
			return await fn(cluster);
		} finally {
			cluster.disconnect();
		}
	}

	/** Query `CLUSTER INFO` on one node. Fails against standalone Redis. */
	async getClusterInfo(node: RedisClusterNode = this.nodes[0]): Promise<RedisClusterInfo> {
		const raw = await this.withNodeClient(node, async (client) => await client.cluster('INFO'));
		if (typeof raw !== 'string') {
			throw new Error(`Expected CLUSTER INFO to return a string, got ${typeof raw}`);
		}
		return parseClusterInfo(raw);
	}

	/** Query `CLUSTER INFO` on every node in the cluster. */
	async getAllNodeClusterInfo(): Promise<
		Array<{ node: RedisClusterNode; info: RedisClusterInfo }>
	> {
		return await Promise.all(
			this.nodes.map(async (node) => ({
				node,
				info: await this.getClusterInfo(node),
			})),
		);
	}

	/** Query `CLUSTER SLOTS` on one node. Fails against standalone Redis. */
	async getClusterSlots(node: RedisClusterNode = this.nodes[0]): Promise<RedisClusterSlotRange[]> {
		const raw = await this.withNodeClient(node, async (client) => await client.cluster('SLOTS'));
		return parseClusterSlots(raw);
	}

	/** Query the Redis Cluster hash slot for `key` via `CLUSTER KEYSLOT`. */
	async getKeySlot(key: string, node: RedisClusterNode = this.nodes[0]): Promise<number> {
		const raw = await this.withNodeClient(
			node,
			async (client) => await client.cluster('KEYSLOT', key),
		);
		return parseSlotNumber(raw, `KEYSLOT for "${key}"`);
	}

	/** Read a key through the cluster client (routing to the owning primary). */
	async get(key: string): Promise<string | null> {
		return await this.withClusterClient(async (cluster) => await cluster.get(key));
	}

	/** Read the Bull monotonic job counter (`{bull}:jobs:id`) from the cluster. */
	async readBullJobCounter(prefix = 'bull'): Promise<number> {
		const key = `${toClusterHashTag(prefix)}:jobs:id`;
		return parseBullJobCounterValue(await this.get(key));
	}

	/**
	 * Verify real Redis Cluster routing for `key`:
	 * 1. Resolve its hash slot and owning primary node from `CLUSTER SLOTS`.
	 * 2. Read the key directly on the owning primary.
	 * 3. Query a non-owning primary directly and verify it responds with `MOVED`.
	 * 4. Read the key through an `ioredis` Cluster client seeded only with the non-owning primary.
	 */
	async verifySlotRouting(key: string): Promise<RedisClusterSlotRoutingResult> {
		const slot = await this.getKeySlot(key);
		const slotRanges = await this.getClusterSlots();
		const ownerNode = findSlotOwnerNode(slot, slotRanges, this.nodes);
		const nonOwnerNode = this.nodes.find((node) => node.index !== ownerNode.index);
		if (!nonOwnerNode) {
			throw new Error(
				`Cannot verify cluster MOVED routing with fewer than 2 nodes (key "${key}", slot ${slot})`,
			);
		}

		const ownerValue = await this.withNodeClient(
			ownerNode,
			async (client) => await client.get(key),
		);

		const nonOwnerOutcome = await this.withNodeClient(
			nonOwnerNode,
			async (
				client,
			): Promise<
				| { kind: 'moved'; redirect: RedisMovedRedirect }
				| { kind: 'value'; value: string | null }
				| { kind: 'error'; error: Error }
			> => {
				try {
					return { kind: 'value', value: await client.get(key) };
				} catch (error: unknown) {
					const message = error instanceof Error ? error.message : String(error);
					const redirect = parseMovedError(message);
					if (redirect) {
						return { kind: 'moved', redirect };
					}
					return { kind: 'error', error: error instanceof Error ? error : new Error(message) };
				}
			},
		);

		if (nonOwnerOutcome.kind === 'error') {
			throw new Error(
				`Expected MOVED redirect from ${nonOwnerNode.alias} for "${key}" (slot ${slot}), got error: ${nonOwnerOutcome.error.message}`,
			);
		}
		if (nonOwnerOutcome.kind === 'value') {
			throw new Error(
				`Expected MOVED redirect from ${nonOwnerNode.alias} for "${key}" (slot ${slot}), but GET succeeded with ${JSON.stringify(nonOwnerOutcome.value)}`,
			);
		}
		const movedRedirect = nonOwnerOutcome.redirect;

		const routedValue = await this.withClusterClient(
			async (cluster) => await cluster.get(key),
			[{ host: nonOwnerNode.host, port: nonOwnerNode.mappedPort }],
		);

		return {
			key,
			slot,
			ownerNode,
			nonOwnerNode,
			movedRedirect,
			ownerValue,
			routedValue,
		};
	}
}

async function waitForClusterReady(
	nodes: readonly RedisClusterNode[],
	external = false,
): Promise<void> {
	const helper = new RedisClusterHelper({ nodes: [...nodes], external });
	const deadline = Date.now() + CLUSTER_READY_TIMEOUT_MS;
	let lastReason = 'cluster did not converge';

	while (Date.now() < deadline) {
		try {
			const nodeInfos = await helper.getAllNodeClusterInfo();
			const unhealthy = nodeInfos.find(({ info }) => !isClusterInfoHealthy(info, nodes.length));
			if (unhealthy) {
				lastReason = `${unhealthy.node.alias} cluster_state=${unhealthy.info.clusterState}, slots_ok=${unhealthy.info.clusterSlotsOk}, known_nodes=${unhealthy.info.clusterKnownNodes}, size=${unhealthy.info.clusterSize}`;
			} else {
				const slotRanges = await helper.getClusterSlots();
				if (!isClusterTopologyComplete(slotRanges, nodes.length)) {
					lastReason = `incomplete slot topology (${slotRanges.length} ranges)`;
				} else if (
					external &&
					!slotRanges.every((range) =>
						nodes.some(
							(node) => node.host === range.master.host && node.mappedPort === range.master.port,
						),
					)
				) {
					lastReason = 'cluster slots do not yet advertise host-reachable endpoints';
				} else {
					const pong = await helper.withClusterClient(async (cluster) => await cluster.ping());
					if (pong === 'PONG') {
						return;
					}
					lastReason = `unexpected cluster PING reply: ${String(pong)}`;
				}
			}
		} catch (error: unknown) {
			lastReason = error instanceof Error ? error.message : String(error);
		}

		await delay(CLUSTER_READY_POLL_INTERVAL_MS);
	}

	throw new Error(
		`Redis Cluster did not become ready within ${CLUSTER_READY_TIMEOUT_MS}ms: ${lastReason}`,
	);
}

export const redisCluster: Service<RedisClusterResult> = {
	description: 'Redis Cluster',

	async start(
		network: StartedNetwork,
		projectName: string,
		_options?: unknown,
		ctx?: StartContext,
	): Promise<RedisClusterResult> {
		validateClusterNodeCount(DEFAULT_CLUSTER_NODE_COUNT);

		const containers: StartedTestContainer[] = [];
		const nodes: RedisClusterNode[] = [];
		const nodeLogReaders: Array<{ alias: string; getLogs: () => string }> = [];

		try {
			const external = ctx?.external ?? false;
			const announceHostname = external
				? (await getContainerRuntimeClient()).info.containerRuntime.host
				: undefined;
			const allocatedExternalPorts: number[] = [];

			for (let index = 1; index <= DEFAULT_CLUSTER_NODE_COUNT; index++) {
				const alias = `${NODE_HOSTNAME_PREFIX}-${index}`;
				const { consumer, getLogs } = createSilentLogConsumer();
				nodeLogReaders.push({ alias, getLogs });

				// In external/local-dev mode, host n8n clients follow CLUSTER SLOTS and MOVED
				// without a NAT map. Match each node's internal client port to its mapped host
				// port and advertise the runtime host via hostname endpoint mode, while keeping
				// node-to-node cluster bus gossip on internal Docker IPs and a fixed bus port.
				let internalPort = REDIS_PORT;
				if (external) {
					internalPort = await getPort({
						exclude: [REDIS_CLUSTER_BUS_PORT, ...allocatedExternalPorts],
					});
					allocatedExternalPorts.push(internalPort);
				}

				const exposedPort = external ? { container: internalPort, host: internalPort } : REDIS_PORT;
				const command = buildRedisClusterServerCommand(
					external
						? {
								port: internalPort,
								clusterBusPort: REDIS_CLUSTER_BUS_PORT,
								announceHostname,
							}
						: { port: REDIS_PORT },
				);

				const container = await new GenericContainer(TEST_CONTAINER_IMAGES.redis)
					.withNetwork(network)
					.withNetworkAliases(alias)
					.withExposedPorts(exposedPort)
					.withCommand(command)
					.withWaitStrategy(
						Wait.forAll([
							Wait.forListeningPorts(),
							Wait.forLogMessage(/Ready to accept connections/),
						]).withStartupTimeout(60_000),
					)
					.withLabels({
						'com.docker.compose.project': projectName,
						'com.docker.compose.service': alias,
					})
					.withName(`${projectName}-${alias}`)
					// Not reused: cluster nodes persist network-specific IPs in nodes.conf.
					.withLogConsumer(consumer)
					.start();

				containers.push(container);
				ctx?.registerContainer?.(container);

				const ip = container.getIpAddress(network.getName());
				if (!ip) {
					throw new Error(
						`Container ${container.getName()} has no IP address on network "${network.getName()}"`,
					);
				}

				nodes.push({
					index,
					alias,
					ip,
					internalPort,
					host: container.getHost(),
					mappedPort: container.getMappedPort(internalPort),
				});
			}

			const clusterEndpoints = nodes.map((node) => `${node.ip}:${node.internalPort}`);
			const createResult = await containers[0].exec([
				'redis-cli',
				'--cluster',
				'create',
				...clusterEndpoints,
				'--cluster-replicas',
				'0',
				'--cluster-yes',
			]);
			if (createResult.exitCode !== 0) {
				throw new Error(
					`redis-cli --cluster create failed (exit ${createResult.exitCode}): ${createResult.output}`,
				);
			}

			await waitForClusterReady(nodes, external);

			return {
				container: containers[0],
				containers,
				meta: { nodes, external },
			};
		} catch (error: unknown) {
			if (!ctx?.registerContainer) {
				await Promise.allSettled(containers.map(async (container) => await container.stop()));
			}
			const formattedLogs = formatNodeStartupLogs(
				nodeLogReaders.map(({ alias, getLogs }) => ({ alias, logs: getLogs() })),
			);
			if (formattedLogs) {
				console.error(`\n${formattedLogs}\n`);
			}
			throw error;
		}
	},

	env(result: RedisClusterResult, external?: boolean): Record<string, string> {
		if (external && !result.meta.external) {
			throw new Error(
				'Redis Cluster was started for container networking; start it with external: true to expose host-reachable cluster endpoints',
			);
		}
		return {
			// In container mode, EXECUTIONS_MODE is set by the stack based on worker count.
			// In external/local mode, redisCluster implies the user wants queue mode.
			...(external ? { EXECUTIONS_MODE: 'queue' } : {}),
			QUEUE_BULL_REDIS_CLUSTER_NODES: formatClusterNodes(result.meta.nodes, external),
			N8N_CACHE_ENABLED: 'true',
			N8N_CACHE_BACKEND: 'redis',
		};
	},
};

export function createRedisClusterHelper(ctx: HelperContext): RedisClusterHelper {
	const result = ctx.serviceResults.redisCluster as RedisClusterResult | undefined;
	if (!result) {
		throw new Error('Redis Cluster service not found in context');
	}
	return new RedisClusterHelper(result.meta);
}

declare module './types' {
	interface ServiceHelpers {
		redisCluster: RedisClusterHelper;
	}
}
