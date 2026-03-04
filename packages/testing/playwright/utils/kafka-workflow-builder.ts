interface KafkaWorkflowOptions {
	topic: string;
	groupId: string;
	credentialId: string;
	credentialName: string;
	nodeCount: number;
}

/**
 * Generates a workflow definition with a KafkaTrigger followed by N chained NoOp nodes.
 * Each node in the chain writes execution state to DB, so this tests engine overhead
 * at different workflow depths without node-specific processing cost.
 */
export function buildKafkaTriggeredWorkflow(options: KafkaWorkflowOptions) {
	const { topic, groupId, credentialId, credentialName, nodeCount } = options;

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

	let previousNodeName = 'Kafka Trigger';
	for (let i = 1; i <= nodeCount; i++) {
		const nodeName = `NoOp ${i}`;

		nodes.push({
			id: String(i + 1),
			name: nodeName,
			type: 'n8n-nodes-base.noOp',
			typeVersion: 1,
			position: [i * 200, 0] as [number, number],
		});

		connections[previousNodeName] = {
			main: [[{ node: nodeName, type: 'main', index: 0 }]],
		};
		previousNodeName = nodeName;
	}

	return {
		name: `Kafka Load Test (${nodeCount} nodes)`,
		nodes,
		connections,
		active: false,
	};
}
