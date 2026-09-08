import { workflow, node } from '@n8n/workflow-sdk';
import type { IWorkflowBase } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import type { NodeOutputSize } from './types';
import { OUTPUT_SIZE_BYTES } from './types';

type TriggerNode = Parameters<ReturnType<typeof workflow>['add']>[0];

export function createChainNode(index: number, outputSize: NodeOutputSize) {
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
 * Builds a workflow: triggerNode → N chained nodes.
 * The trigger can be any node type — Kafka, Webhook, Cron, etc.
 */
export function buildChainedWorkflow(
	name: string,
	triggerNode: TriggerNode,
	nodeCount: number,
	nodeOutputSize: NodeOutputSize = 'noop',
): Partial<IWorkflowBase> {
	if (nodeCount <= 0) throw new Error(`nodeCount must be > 0, got ${nodeCount}`);

	const [first, ...rest] = Array.from({ length: nodeCount }, (_, i) =>
		createChainNode(i + 1, nodeOutputSize),
	);

	const wf = workflow(nanoid(), name);
	wf.add(
		rest.reduce((chain, n) => chain.to(n), (triggerNode as ReturnType<typeof node>).to(first)),
	);

	return wf.toJSON() as Partial<IWorkflowBase>;
}
