import type { SeededInstance } from './seed';

/**
 * How the page reports that it is usable. The predicate runs inside the page
 * on every animation frame (see `measure.ts`), so it is data, not a function:
 * Playwright cannot serialize a callback into `waitForFunction` arguments.
 */
export type ReadySpec =
	| { kind: 'selector'; selector: string }
	| { kind: 'any'; selectors: string[] }
	| { kind: 'canvas'; nodes: number };

export interface PageTarget {
	/** Stable id, used in metric names and file names. */
	id: string;
	/** Human label for the report. */
	label: string;
	/** Route name in the editor telemetry (`rudder_schema.pages.name`). */
	routeName: string;
	path: string;
	ready: ReadySpec;
	/** The page is only reachable without a session (sign-in). */
	signedOut?: boolean;
}

/**
 * The most visited editor pages (Cloud, week of 2026-11-10, navigation map by
 * Nikolai Mikulin), in traffic order. Module pages (Assistant, Agents, Data
 * tables, MCP settings) are not here yet: they need the module enabled on the
 * instance and their own ready signals.
 */
export function buildTargets(seed: SeededInstance): PageTarget[] {
	return [
		{
			id: 'workflows-home',
			label: 'Workflows list (home)',
			routeName: 'WorkflowsView',
			path: '/home/workflows',
			ready: { kind: 'selector', selector: '[data-test-id="resources-list-item-workflow"]' },
		},
		{
			id: 'workflow-canvas',
			label: `Workflow canvas (${seed.canvasNodes} nodes)`,
			routeName: 'NodeViewExisting',
			path: `/workflow/${seed.canvasWorkflowId}`,
			ready: { kind: 'canvas', nodes: seed.canvasNodes },
		},
		{
			id: 'signin',
			label: 'Sign in',
			routeName: 'SigninView',
			path: '/signin',
			ready: { kind: 'selector', selector: '[data-test-id="signin-form"]' },
			signedOut: true,
		},
		{
			id: 'workflows-project',
			label: 'Personal project workflows',
			routeName: 'ProjectsWorkflows',
			path: `/projects/${seed.personalProjectId}/workflows`,
			ready: { kind: 'selector', selector: '[data-test-id="resources-list-item-workflow"]' },
		},
		{
			id: 'workflow-executions',
			label: 'Workflow executions tab',
			routeName: 'WorkflowExecutions',
			path: `/workflow/${seed.executedWorkflowId}/executions`,
			ready: { kind: 'selector', selector: 'div.execution-card' },
		},
		{
			id: 'execution-preview',
			label: 'Execution preview',
			routeName: 'ExecutionPreview',
			path: `/workflow/${seed.executedWorkflowId}/executions/${seed.executionId}`,
			ready: {
				kind: 'selector',
				selector: '[data-test-id="execution-preview-host"] [data-test-id="canvas-node"]',
			},
		},
		{
			id: 'credentials-home',
			label: 'Credentials list',
			routeName: 'CredentialsView',
			path: '/home/credentials',
			ready: { kind: 'selector', selector: '[data-test-id="resources-list-item"]' },
		},
		{
			id: 'workflow-evaluation',
			label: 'Workflow evaluations tab',
			routeName: 'Evaluation',
			path: `/workflow/${seed.canvasWorkflowId}/evaluation`,
			ready: {
				kind: 'any',
				selectors: [
					'[data-test-id="evaluation-setup-wizard"]',
					'[data-test-id="run-test-button"]',
					'[data-test-id="evaluations-empty-state"]',
					'[data-test-id="evaluations-unlicensed"]',
				],
			},
		},
		{
			id: 'settings-personal',
			label: 'Personal settings',
			routeName: 'PersonalSettings',
			path: '/settings/personal',
			ready: { kind: 'selector', selector: '[data-test-id="personal-data-form"]' },
		},
		{
			id: 'executions-home',
			label: 'Executions list (home)',
			routeName: 'Executions',
			path: '/home/executions',
			ready: { kind: 'selector', selector: '[data-test-id="global-execution-list-item"]' },
		},
		{
			id: 'workflow-new',
			label: 'New workflow',
			routeName: 'NodeViewNew',
			path: '/workflow/new',
			ready: {
				kind: 'any',
				selectors: ['[data-test-id="canvas-plus-button"]', '[data-test-id="canvas-choice-prompt"]'],
			},
		},
	];
}

/** `PERF_PAGES=workflows-home,signin` limits the run to those ids. */
export function selectTargets(targets: PageTarget[], filter: string | undefined): PageTarget[] {
	if (!filter) return targets;
	const wanted = new Set(filter.split(',').map((id) => id.trim()));
	return targets.filter((target) => wanted.has(target.id));
}
