import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parse, stringify } from 'yaml';
import { z } from 'zod';

import { RigError } from '../errors';

export const ENV_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

const serviceSchema = (defaultPort: number) =>
	z
		.object({
			image: z.string().default('auto'),
			port: z.number().int().min(1).max(65535).default(defaultPort),
		})
		.strict()
		.default({});

export const languageSchema = z.enum(['js', 'python']);
export type Language = z.infer<typeof languageSchema>;

export const engineModeSchema = z.enum(['off', 'in-process', 'remote']);
export type EngineMode = z.infer<typeof engineModeSchema>;

export const TUNNEL_METRICS_PORT = 20241;

/**
 * A public HTTPS URL through a Cloudflare tunnel. `tunnel: cloudflare` is the
 * short form of `tunnel: { provider: cloudflare }`. Without `hostname`, rig
 * starts a quick tunnel with a random `trycloudflare.com` URL. With `hostname`,
 * rig runs the named tunnel of `CLOUDFLARE_TUNNEL_TOKEN` in secrets.env.
 */
const tunnelSchema = z.preprocess(
	(value) => (typeof value === 'string' ? { provider: value } : value),
	z
		.object({
			provider: z.enum(['off', 'cloudflare']).default('off'),
			/** The main that the tunnel exposes. */
			target: z
				.string()
				.regex(/^main-\d+$/, 'use a main, for example main-1')
				.default('main-1'),
			hostname: z
				.string()
				.regex(/^[a-z0-9.-]+$/i, 'use a hostname without a scheme, for example n8n.example.com')
				.optional(),
			image: z.string().default('auto'),
			metricsPort: z.number().int().min(1).max(65535).default(TUNNEL_METRICS_PORT),
		})
		.strict()
		.default({}),
);

export type TunnelConfig = z.infer<typeof tunnelSchema>;

export const topologySchema = z
	.object({
		name: z.string().regex(ENV_NAME_PATTERN, 'use lowercase letters, digits, and dashes'),
		source: z.literal('auto').default('auto'),
		db: z.enum(['sqlite', 'postgres']).default('sqlite'),
		queue: z.boolean().default(false),
		mains: z.number().int().min(1).max(10).default(1),
		workers: z.number().int().min(0).max(10).default(0),
		runners: z
			.object({
				mode: z.enum(['internal', 'external']).default('external'),
				via: z.literal('launcher').default('launcher'),
				languages: z.array(languageSchema).min(1).default(['js', 'python']),
			})
			.strict()
			.default({}),
		engine: engineModeSchema.default('off'),
		tunnel: tunnelSchema,
		services: z
			.object({
				postgres: serviceSchema(5432),
				redis: serviceSchema(6379),
			})
			.strict()
			.default({}),
	})
	.strict();

export type Topology = z.infer<typeof topologySchema>;
export type TopologyInput = z.input<typeof topologySchema>;

export function parseTopology(input: unknown, file = 'env.yaml'): Topology {
	const result = topologySchema.safeParse(input);
	if (result.success) return result.data;

	const issue = result.error.issues[0];
	const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
	throw new RigError(`Invalid ${file} at "${path}": ${issue.message}`);
}

export function loadTopology(file: string): Topology {
	if (!existsSync(file)) throw new RigError(`Missing ${file}`);
	let raw: unknown;
	try {
		raw = parse(readFileSync(file, 'utf8'));
	} catch (error) {
		throw new RigError(
			`Cannot parse ${file}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
	return parseTopology(raw, file);
}

export function saveTopology(file: string, topology: Topology): void {
	const header =
		'# Topology of this rig environment. Run `rig status` after you change it.\n' +
		'# Reference: .agents/specs/rig.md in the n8n repository.\n';
	writeFileSync(file, header + stringify(topology));
}

export type ServiceName = 'postgres' | 'redis' | 'tunnel';

/** Services the topology needs. */
export function requiredServices(topology: Topology): ServiceName[] {
	const services: ServiceName[] = [];
	if (topology.db === 'postgres') services.push('postgres');
	if (topology.queue || topology.engine === 'remote') services.push('redis');
	if (topology.tunnel.provider === 'cloudflare') services.push('tunnel');
	return services;
}

/** The host port of a service. The tunnel publishes only its metrics port. */
export function servicePort(topology: Topology, service: ServiceName): number {
	return service === 'tunnel' ? topology.tunnel.metricsPort : topology.services[service].port;
}

export function describeTopology(topology: Topology): string {
	const parts = [
		topology.db,
		topology.queue ? 'queue' : 'regular',
		`${topology.mains} main${topology.mains > 1 ? 's' : ''}`,
	];
	if (topology.workers > 0) {
		parts.push(`${topology.workers} worker${topology.workers > 1 ? 's' : ''}`);
	}
	parts.push(
		topology.runners.mode === 'external'
			? `runners: ${topology.runners.languages.join('+')} via launcher`
			: 'runners: internal',
	);
	if (topology.engine !== 'off') parts.push(`engine: ${topology.engine}`);
	if (topology.tunnel.provider === 'cloudflare') {
		parts.push(`tunnel: ${topology.tunnel.hostname ?? 'cloudflare quick tunnel'}`);
	}
	return parts.join(' · ');
}
