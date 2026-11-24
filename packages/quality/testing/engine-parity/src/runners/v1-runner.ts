import { ExecutionLifecycleHooks, WorkflowExecute } from 'n8n-core';
import type { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { createRunExecutionData, jsonParse, Workflow } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import type { IrItem, ParityCase } from '../grammar/ir';
import { parityAdditionalData } from './additional-data';
import { parityNodeTypes } from './node-registry';
import type { EngineRunner, RawOutcome } from './runner';
import { CASE_TIMEOUT_MS, TimeoutError, withTimeout } from './runner';

export function toExecutionData(items: IrItem[]): INodeExecutionData[] {
	return items.map((item) => ({ json: jsonParse<IDataObject>(JSON.stringify(item.json)) }));
}

/**
 * Runs a case on engine v1 (`WorkflowExecute`) in this process.
 *
 * The fired trigger starts on the execution stack with the trigger items. The
 * mode is `trigger`, so the trigger passes the items through, as for a
 * production run. Engine v2 gets the same items as its trigger outputs.
 */
export class V1Runner implements EngineRunner {
	readonly name = 'v1';

	async start(): Promise<void> {}

	async stop(): Promise<void> {}

	async run(parityCase: ParityCase): Promise<RawOutcome> {
		const progress: string[] = [];
		const { workflowExecute, workflow } = this.prepare(
			parityCase,
			// A node can change its input items in place. Each engine gets its own copy.
			toExecutionData(parityCase.ir.triggerItems),
			progress,
		);
		const execution = workflowExecute.processRunExecutionData(workflow);
		try {
			const run = await withTimeout(execution, CASE_TIMEOUT_MS);
			const { runData, lastNodeExecuted, error } = run.data.resultData;
			return { kind: 'ran', status: run.status, runData, lastNodeExecuted, error };
		} catch (error) {
			if (error instanceof TimeoutError) {
				const stalledAt = [...progress];
				// Stop the run, so that it does not use the process while the next cases run.
				execution.cancel();
				return { kind: 'timeout', stalledAt };
			}
			throw error;
		}
	}

	private prepare(
		parityCase: ParityCase,
		items: INodeExecutionData[],
		progress: string[],
	): { workflowExecute: WorkflowExecute; workflow: Workflow } {
		const { workflow: workflowData } = parityCase;
		const startNodeName = parityCase.ir.firedTrigger;
		const mode = 'trigger';
		const workflow = new Workflow({
			id: workflowData.id,
			name: workflowData.name,
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			active: false,
			nodeTypes: parityNodeTypes,
			staticData: {},
			settings: workflowData.settings,
		});
		const startNode = workflow.getNode(startNodeName);
		if (!startNode) throw new Error(`The workflow has no node "${startNodeName}"`);

		const executionId = uuid();
		const hooks = new ExecutionLifecycleHooks(mode, executionId, workflowData);
		hooks.addHandler('nodeExecuteAfter', (nodeName) => {
			progress.push(nodeName);
		});
		const additionalData = parityAdditionalData(executionId, { hooks });

		const runExecutionData = createRunExecutionData({
			executionData: {
				nodeExecutionStack: [{ node: startNode, data: { main: [items] }, source: null }],
			},
		});
		const workflowExecute = new WorkflowExecute(additionalData, mode, runExecutionData);
		return { workflowExecute, workflow };
	}
}
