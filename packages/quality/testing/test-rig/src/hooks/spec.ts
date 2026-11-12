import { z } from 'zod';

/** Compiled files the hooks patch, as path suffixes inside the n8n image. */
export const FILES = {
	jobProcessor: 'n8n/dist/scaling/job-processor.js',
} as const;

const ROLES = ['main', 'worker'] as const;
export type Role = (typeof ROLES)[number];

const methodRef = z.object({
	file: z.string().min(1),
	target: z.string(),
	method: z.string().min(1),
});

export const hookSpecSchema = methodRef
	.extend({
		point: z.string().regex(/^[\w-]+$/, 'letters, digits, _ and - only'),
		kind: z.enum(['pause', 'observe']).optional(),
		arm: z.enum(['file', 'always']).optional(),
		once: z.boolean().optional(),
		scope: methodRef.optional(),
		where: z
			.array(
				z.object({
					path: z.string().min(1),
					equals: z.unknown().optional(),
					truthy: z.boolean().optional(),
				}),
			)
			.optional(),
		detail: z.record(z.string()).optional(),
		phase: z.enum(['before', 'after']).optional(),
		roles: z.array(z.enum(ROLES)).min(1).optional(),
		/** Set when the patched file loads only on first use, so the install check skips it. */
		lazy: z.boolean().optional(),
	})
	.strict();

/** One hook point for the preload. Paths in `detail` and `where` start at `args`, `this`, `scope` or `result`. */
export type HookSpec = z.infer<typeof hookSpecSchema>;

/** Parses hook specs and fails on the first invalid one, naming its point and field. */
export function parseHookSpecs(specs: unknown[]): HookSpec[] {
	const points = new Set<string>();
	return specs.map((spec, index) => {
		const result = hookSpecSchema.safeParse(spec);
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
