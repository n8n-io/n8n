import type { ProcessInternals } from '@n8n/api-types';
import { z } from 'zod';

const bytes = z.number().finite().nonnegative();
const instanceTypeSchema = z.enum(['main', 'worker', 'webhook', 'engine']);
export const memoryKeys: Array<keyof ProcessInternals['memory']> = [
	'rss',
	'heapTotal',
	'heapUsed',
	'external',
	'arrayBuffers',
];
export const memorySchema = z.object({
	rss: bytes,
	heapTotal: bytes,
	heapUsed: bytes,
	external: bytes,
	arrayBuffers: bytes,
});

export const readingSchema: z.ZodType<ProcessInternals> = z.object({
	version: z.literal(1),
	instanceType: instanceTypeSchema,
	hostId: z.string().min(1),
	processStartId: z.string().uuid(),
	isLeader: z.boolean(),
	memory: memorySchema,
	resources: z.record(z.number().int().nonnegative()),
	collections: z.record(z.number().int().nonnegative()),
});

export const observationSchema = z.object({
	runId: z.string().uuid(),
	sequence: z.number().int().positive(),
	time: z.number().int().nonnegative(),
	reading: readingSchema,
	checkpoint: z.string().min(1).max(100).optional(),
	gc: z.boolean(),
});

export const manifestSchema = z.object({
	version: z.literal(1),
	runId: z.string().uuid(),
	status: z.enum(['recording', 'completed', 'failed', 'interrupted']),
	startedAt: z.number().int().nonnegative(),
	endedAt: z.number().int().nonnegative().optional(),
	url: z.string().url(),
	hostId: z.string().min(1),
	processStartId: z.string().uuid(),
	instanceType: instanceTypeSchema,
	mode: z.enum(['measurements', 'snapshots']),
	intervalMs: z.number().int().positive(),
	gc: z.boolean(),
	workloadExitCode: z.number().int().nullable().optional(),
	observationCount: z.number().int().nonnegative(),
	error: z.string().optional(),
	snapshots: z.array(
		z.object({
			sequence: z.number().int().positive(),
			file: z.string().regex(/^snapshot-\d+\.heapsnapshot$/),
			sizeBytes: bytes,
			sha256: z.string().regex(/^[a-f0-9]{64}$/),
		}),
	),
});

export type Observation = z.infer<typeof observationSchema>;
export type Manifest = z.infer<typeof manifestSchema>;

export const snapshotResponseSchema = z.discriminatedUnion('success', [
	z.object({ success: z.literal(true), filePath: z.string().min(1), sizeBytes: bytes }),
	z.object({ success: z.literal(false), message: z.string() }),
]);
