import { z } from 'zod';

/** Compiled files the hooks patch, as path suffixes inside the n8n image. */
export const FILES = {
	jobProcessor: 'n8n/dist/scaling/job-processor.js',
	scalingService: 'n8n/dist/scaling/scaling.service.js',
	executionPersistence: 'n8n/dist/executions/execution-persistence.js',
	taskRequester: 'n8n/dist/task-runners/task-managers/task-requester.js',
	taskBroker: 'n8n/dist/task-runners/task-broker/task-broker.service.js',
	workflowExecute: 'n8n-core/dist/execution-engine/workflow-execute.js',
	bullQueue: 'bull/lib/queue.js',
	bullJob: 'bull/lib/job.js',
	bullScripts: 'bull/lib/scripts.js',
	engineExecutionStart: '@n8n/engine/dist/execution/execution-start-handler.js',
	engineStepReady: '@n8n/engine/dist/execution/step-ready-handler.js',
	engineStepSettled: '@n8n/engine/dist/execution/step-settled-handler.js',
	engineExecutionStore: '@n8n/engine/dist/database/typeorm-execution-store.js',
	engineStepStore: '@n8n/engine/dist/database/typeorm-step-store.js',
	engineStaleness: '@n8n/engine/dist/execution/staleness.js',
	engineWaitSweeper: '@n8n/engine/dist/execution/wait-sweeper.js',
	engineReconciliationSweeper: '@n8n/engine/dist/reconciliation/reconciliation-sweeper.js',
} as const;

const ROLES = ['main', 'worker', 'engine'] as const;
export type Role = (typeof ROLES)[number];

const methodRef = z.object({
	file: z.string().min(1),
	target: z.string(),
	method: z.string().min(1),
});

const point = z.string().regex(/^[\w-]+$/, 'letters, digits, _ and - only');
const roles = z.array(z.enum(ROLES)).min(1).optional();

export const hookSpecSchema = methodRef
	.extend({
		point,
		kind: z.enum(['pause', 'observe', 'fault', 'drop']).optional(),
		arm: z.enum(['file', 'always']).optional(),
		once: z.boolean().optional(),
		scope: methodRef.optional(),
		where: z
			.array(
				z
					.object({
						path: z.string().min(1),
						equals: z.unknown().optional(),
						truthy: z.boolean().optional(),
					})
					.strict()
					.refine(
						(rule) => 'equals' in rule !== 'truthy' in rule,
						'set exactly one of equals and truthy',
					),
			)
			.optional(),
		detail: z.record(z.string()).optional(),
		phase: z.enum(['before', 'after']).optional(),
		returns: z.unknown().optional(),
		preserve: z.array(z.string()).optional(),
		roles,
		/** Set when the patched file loads only on first use, so the install check skips it. */
		lazy: z.boolean().optional(),
		/** Set when older images lack the file; the install check then fails only when the file loads and the method is missing. */
		optional: z.boolean().optional(),
	})
	.strict()
	.refine((spec) => spec.kind !== 'drop' || spec.phase !== 'after', {
		message: 'a drop hook runs before the call',
		path: ['phase'],
	});

/** Writes fixed values onto an exported object, or onto the exports with `target: ''`, when the file loads. */
export const setHookSpecSchema = z
	.object({
		point,
		kind: z.literal('set'),
		file: z.string().min(1),
		target: z.string(),
		values: z
			.record(z.unknown())
			.refine((values) => Object.keys(values).length > 0, 'set at least one value'),
		roles,
		lazy: z.boolean().optional(),
		optional: z.boolean().optional(),
	})
	.strict();

/** One hook point for the preload. Paths in `detail` and `where` start at `args`, `this`, `scope` or `result`. */
export type HookSpec = z.infer<typeof hookSpecSchema>;

export type SetHookSpec = z.infer<typeof setHookSpecSchema>;

/** Any spec a stack accepts: a method hook or a `set` hook. */
export type HarnessHookSpec = HookSpec | SetHookSpec;

const isSetSpec = (spec: unknown) =>
	typeof spec === 'object' && spec !== null && 'kind' in spec && spec.kind === 'set';

/** Parses hook specs and fails on the first invalid one, naming its point and field. */
export function parseHookSpecs(specs: unknown[]): HarnessHookSpec[] {
	const points = new Set<string>();
	return specs.map((spec, index) => {
		const result = (isSetSpec(spec) ? setHookSpecSchema : hookSpecSchema).safeParse(spec);
		if (!result.success) {
			const issue = result.error.issues[0];
			const point = (spec as { point?: unknown })?.point;
			const name = typeof point === 'string' ? point : `#${index}`;
			throw new Error(`hook ${name}: ${issue.path.join('.') || 'spec'}: ${issue.message}`);
		}
		if (points.has(result.data.point))
			throw new Error(`hook ${result.data.point}: duplicate point`);
		points.add(result.data.point);
		return result.data;
	});
}
