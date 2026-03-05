import type { IConnections, INode, IWorkflowBase } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

/**
 * Node output modes for controlling execution data volume per node.
 * - `noop`: NoOp nodes — minimal output, tests pure engine overhead.
 * - `10KB` / `100KB` / `1MB`: Set nodes that add a padding field at that size.
 *   Tests realistic DB write pressure since execution data accumulates per node.
 *   Uses Set nodes (not Code nodes) to avoid task runner dependency, enabling
 *   clean multi-worker benchmarks.
 */
export type NodeOutputSize = 'noop' | '10KB' | '100KB' | '1MB';

interface KafkaWorkflowOptions {
	topic: string;
	groupId: string;
	credentialId: string;
	credentialName: string;
	nodeCount: number;
	nodeOutputSize?: NodeOutputSize;
}

const OUTPUT_SIZE_BYTES: Record<Exclude<NodeOutputSize, 'noop'>, number> = {
	'10KB': 10_000,
	'100KB': 100_000,
	'1MB': 1_000_000,
};

function buildSetNodeParams(size: Exclude<NodeOutputSize, 'noop'>) {
	const bytes = OUTPUT_SIZE_BYTES[size];
	return {
		assignments: {
			assignments: [
				{
					id: 'payload',
					name: 'payload',
					value: `={{ 'x'.repeat(${bytes}) }}`,
					type: 'string',
				},
			],
		},
		includeOtherFields: true,
		options: {},
	};
}

/**
 * Generates a workflow with a KafkaTrigger followed by N chained nodes.
 * Node type depends on `nodeOutputSize`:
 * - `noop` (default): NoOp nodes with minimal output — tests pure engine overhead.
 * - `10KB`/`100KB`/`1MB`: Set nodes that add a padding field at that size.
 *   This tests realistic DB write pressure since n8n stores all node outputs
 *   as a single accumulated blob per execution. Uses Set nodes instead of Code
 *   nodes to avoid external task runner dependency, enabling clean multi-worker benchmarks.
 */
export function buildKafkaTriggeredWorkflow(options: KafkaWorkflowOptions): Partial<IWorkflowBase> {
	const {
		topic,
		groupId,
		credentialId,
		credentialName,
		nodeCount,
		nodeOutputSize = 'noop',
	} = options;

	const nodes: INode[] = [];
	const connections: IConnections = {};

	nodes.push({
		id: 'trigger',
		name: 'Kafka Trigger',
		type: 'n8n-nodes-base.kafkaTrigger',
		typeVersion: 1.1,
		position: [0, 0] as [number, number],
		parameters: {
			topic,
			groupId,
			options: {
				fromBeginning: true,
				jsonParseMessage: true,
				parallelProcessing: true,
				sessionTimeout: 60000,
				heartbeatInterval: 3000,
			},
		},
		credentials: {
			kafka: { id: credentialId, name: credentialName },
		},
	});

	const useSetNode = nodeOutputSize !== 'noop';
	let previousNodeName = 'Kafka Trigger';

	for (let i = 1; i <= nodeCount; i++) {
		const nodeName = useSetNode ? `Set ${i}` : `NoOp ${i}`;

		if (useSetNode) {
			nodes.push({
				id: String(i + 1),
				name: nodeName,
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [i * 200, 0] as [number, number],
				parameters: buildSetNodeParams(nodeOutputSize),
			});
		} else {
			nodes.push({
				id: String(i + 1),
				name: nodeName,
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
				position: [i * 200, 0] as [number, number],
				parameters: {},
			});
		}

		connections[previousNodeName] = {
			[NodeConnectionTypes.Main]: [[{ node: nodeName, type: NodeConnectionTypes.Main, index: 0 }]],
		};
		previousNodeName = nodeName;
	}

	const label = useSetNode ? `${nodeOutputSize}/node` : 'noop';
	return {
		name: `Kafka Load Test (${nodeCount} nodes, ${label})`,
		nodes,
		connections,
		active: false,
	};
}
