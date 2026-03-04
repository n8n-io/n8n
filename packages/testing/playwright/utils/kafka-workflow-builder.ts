/**
 * Node output modes for controlling execution data volume per node.
 * - `noop`: NoOp nodes — minimal output, tests pure engine overhead.
 * - `10KB` / `100KB` / `1MB`: Code nodes that generate random data at that size.
 *   Tests realistic DB write pressure since execution data accumulates per node.
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

function buildCodeNodeParams(size: Exclude<NodeOutputSize, 'noop'>) {
	const bytes = OUTPUT_SIZE_BYTES[size];
	// Generate a deterministic padding string to avoid runtime randomness overhead.
	// The Code node outputs the incoming item plus a `payload` field of the target size.
	const code = [
		`const size = ${bytes};`,
		`const pad = 'x'.repeat(size);`,
		`return $input.all().map(item => ({`,
		`  json: { ...item.json, payload: pad }`,
		`}));`,
	].join('\n');

	return {
		jsCode: code,
		mode: 'runOnceForAllItems',
	};
}

/**
 * Generates a workflow with a KafkaTrigger followed by N chained nodes.
 * Node type depends on `nodeOutputSize`:
 * - `noop` (default): NoOp nodes with minimal output — tests pure engine overhead.
 * - `10KB`/`100KB`/`1MB`: Code nodes that pad each item with data at that size.
 *   This tests realistic DB write pressure since n8n stores all node outputs
 *   as a single accumulated blob per execution.
 */
export function buildKafkaTriggeredWorkflow(options: KafkaWorkflowOptions) {
	const {
		topic,
		groupId,
		credentialId,
		credentialName,
		nodeCount,
		nodeOutputSize = 'noop',
	} = options;

	const nodes: Array<Record<string, unknown>> = [];
	const connections: Record<
		string,
		{ main: Array<Array<{ node: string; type: string; index: number }>> }
	> = {};

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
				parallelProcessing: false,
			},
		},
		credentials: {
			kafka: { id: credentialId, name: credentialName },
		},
	});

	const useCodeNode = nodeOutputSize !== 'noop';
	let previousNodeName = 'Kafka Trigger';

	for (let i = 1; i <= nodeCount; i++) {
		const nodeName = useCodeNode ? `Code ${i}` : `NoOp ${i}`;

		if (useCodeNode) {
			nodes.push({
				id: String(i + 1),
				name: nodeName,
				type: 'n8n-nodes-base.code',
				typeVersion: 2,
				position: [i * 200, 0] as [number, number],
				parameters: buildCodeNodeParams(nodeOutputSize),
			});
		} else {
			nodes.push({
				id: String(i + 1),
				name: nodeName,
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
				position: [i * 200, 0] as [number, number],
			});
		}

		connections[previousNodeName] = {
			main: [[{ node: nodeName, type: 'main', index: 0 }]],
		};
		previousNodeName = nodeName;
	}

	const label = useCodeNode ? `${nodeOutputSize}/node` : 'noop';
	return {
		name: `Kafka Load Test (${nodeCount} nodes, ${label})`,
		nodes,
		connections,
		active: false,
	};
}
