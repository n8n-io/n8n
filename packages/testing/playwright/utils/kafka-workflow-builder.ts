import type { IWorkflowBase } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { workflow, trigger, node } from '../../../@n8n/workflow-sdk/src';

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

function createChainNode(index: number, outputSize: NodeOutputSize) {
	if (outputSize === 'noop') {
		return node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { name: `NoOp ${index}` },
		});
	}

	return node({
		type: 'n8n-nodes-base.set',
		version: 3.4,
		config: {
			name: `Set ${index}`,
			parameters: {
				assignments: {
					assignments: [
						{
							id: 'payload',
							name: 'payload',
							value: `={{ 'x'.repeat(${OUTPUT_SIZE_BYTES[outputSize]}) }}`,
							type: 'string',
						},
					],
				},
				includeOtherFields: true,
				options: {},
			},
		},
	});
}

/**
 * Generates a workflow: KafkaTrigger → N chained nodes.
 *
 * `nodeOutputSize` controls what those N nodes do:
 * - `noop` (default): NoOp nodes — tests pure engine overhead.
 * - `10KB`/`100KB`/`1MB`: Set nodes that pad output — tests DB write pressure.
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

	const kafkaTrigger = trigger({
		type: 'n8n-nodes-base.kafkaTrigger',
		version: 1.1,
		config: {
			name: 'Kafka Trigger',
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
		},
	});

	const [first, ...rest] = Array.from({ length: nodeCount }, (_, i) =>
		createChainNode(i + 1, nodeOutputSize),
	);

	const label = nodeOutputSize === 'noop' ? 'noop' : `${nodeOutputSize}/node`;
	const wf = workflow(nanoid(), `Kafka Load Test (${nodeCount} nodes, ${label})`);
	wf.add(rest.reduce((chain, n) => chain.to(n), kafkaTrigger.to(first)));

	return wf.toJSON() as Partial<IWorkflowBase>;
}
