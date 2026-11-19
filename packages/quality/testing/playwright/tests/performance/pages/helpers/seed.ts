import { nanoid } from 'nanoid';

import { buildCanvasBenchmarkWorkflow, TIER_CONFIG } from '../../canvas/fixtures/generate-workflow';
import type { ApiHelpers } from '../../../../services/api-helper';
import { TestError } from '../../../../Types';

export interface SeededInstance {
	personalProjectId: string;
	/** The S-tier benchmark workflow (30 nodes), opened by the canvas target. */
	canvasWorkflowId: string;
	canvasNodes: number;
	/** A manual-trigger workflow with finished executions. */
	executedWorkflowId: string;
	executionId: string;
	listWorkflowIds: string[];
}

export interface SeedOptions {
	workflows: number;
	credentials: number;
	executions: number;
}

function manualWorkflow(name: string) {
	return {
		name,
		nodes: [
			{
				id: nanoid(),
				name: 'Manual',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0] as [number, number],
				parameters: {},
			},
		],
		connections: {},
		settings: { saveManualExecutions: true, executionOrder: 'v1' as const },
	};
}

async function getPersonalProjectId(api: ApiHelpers): Promise<string> {
	const response = await api.request.get('/rest/projects/personal');
	if (!response.ok()) {
		throw new TestError(`Failed to read the personal project: ${await response.text()}`);
	}
	const body = (await response.json()) as { data?: { id?: string }; id?: string };
	const id = body.data?.id ?? body.id;
	if (!id) throw new TestError('The personal project response has no id');
	return id;
}

/**
 * Fills the instance so the list pages render real rows. Every name carries
 * the `[perf]` prefix and a nanoid, so a re-run adds data instead of colliding.
 */
export async function seedInstance(api: ApiHelpers, options: SeedOptions): Promise<SeededInstance> {
	const personalProjectId = await getPersonalProjectId(api);

	const listWorkflowIds: string[] = [];
	for (let index = 0; index < options.workflows; index++) {
		const created = await api.workflows.createWorkflow(
			manualWorkflow(`[perf] workflow ${index} ${nanoid(6)}`),
		);
		listWorkflowIds.push(String(created.id));
	}

	for (let index = 0; index < options.credentials; index++) {
		await api.credentials.createCredential({
			name: `[perf] credential ${index} ${nanoid(6)}`,
			type: 'notionApi',
			data: { apiKey: `perf-${nanoid(12)}` },
		});
	}

	const { workflow } = buildCanvasBenchmarkWorkflow({ tier: 'S' });
	const canvas = await api.workflows.createWorkflow(workflow);

	const executed = await api.workflows.createWorkflow(
		manualWorkflow(`[perf] executed ${nanoid(6)}`),
	);
	const executedWorkflowId = String(executed.id);
	let executionId = '';
	for (let index = 0; index < options.executions; index++) {
		const run = await api.workflows.runManually(executedWorkflowId, 'Manual');
		await api.workflows.waitForExecutionById(run.executionId, 15_000);
		executionId = run.executionId;
	}

	return {
		personalProjectId,
		canvasWorkflowId: String(canvas.id),
		canvasNodes: TIER_CONFIG.S.nodes,
		executedWorkflowId,
		executionId,
		listWorkflowIds,
	};
}
