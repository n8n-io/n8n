import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parse, stringify } from 'yaml';
import { z } from 'zod';

import { RigError } from '../errors';

export const ENV_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
export const PROFILE_NAME_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

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
export const MAX_SLOT = 9;

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
				.regex(/^main-[1-9]\d*$/, 'use a main, for example main-1')
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

export const MAILPIT_SMTP_PORT = 1025;
export const MAILPIT_UI_PORT = 8025;

/**
 * A local mail server that catches every email of n8n. `mail: mailpit` is the
 * short form of `mail: { provider: mailpit }`. rig points the SMTP settings of
 * n8n at it. The Mailpit UI shows the emails.
 */
const mailSchema = z.preprocess(
	(value) => (typeof value === 'string' ? { provider: value } : value),
	z
		.object({
			provider: z.enum(['off', 'mailpit']).default('off'),
			image: z.string().default('auto'),
			smtpPort: z.number().int().min(1).max(65535).default(MAILPIT_SMTP_PORT),
			uiPort: z.number().int().min(1).max(65535).default(MAILPIT_UI_PORT),
		})
		.strict()
		.default({}),
);

export type MailConfig = z.infer<typeof mailSchema>;

export const topologySchema = z
	.object({
		name: z.string().regex(ENV_NAME_PATTERN, 'use lowercase letters, digits, and dashes'),
		/** `auto`: the checkout of the current directory, then the checkout of rig. `repo:<path>`: that checkout. */
		source: z
			.union([z.literal('auto'), z.string().regex(/^repo:.+/, 'use auto or repo:<path>')])
			.default('auto'),
		db: z.enum(['sqlite', 'postgres']).default('sqlite'),
		queue: z.boolean().default(false),
		mains: z.number().int().min(1).max(10).default(1),
		workers: z.number().int().min(0).max(10).default(0),
		runners: z
			.object({
				mode: z.enum(['internal', 'external']).default('external'),
				/** `launcher`: one launcher per process starts the runners. `direct`: rig runs each runner itself. */
				via: z.enum(['launcher', 'direct']).default('launcher'),
				languages: z.array(languageSchema).min(1).default(['js', 'python']),
			})
			.strict()
			.default({}),
		engine: engineModeSchema.default('off'),
		/** With `engine: remote`: mutual TLS between the main and the engine, with certificates from rig. */
		engineTls: z.boolean().default(false),
		tunnel: tunnelSchema,
		mail: mailSchema,
		/**
		 * Port slot. Slot k adds 1000 * k to every n8n port and k to the service
		 * ports, so environments with different slots can run at the same time.
		 */
		slot: z.number().int().min(0).max(MAX_SLOT).default(0),
		/** Profiles from ~/.config/rig/profiles, in layer order. A later profile wins. */
		profiles: z
			.array(z.string().regex(PROFILE_NAME_PATTERN, 'use lowercase letters, digits, - and _'))
			.default([]),
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
		'# Reference: scripts/experimental/rig/README.md in the n8n repository.\n';
	writeFileSync(file, header + stringify(topology));
}

export type ServiceName = 'postgres' | 'redis' | 'tunnel' | 'mailpit';

/** Services the topology needs. */
export function requiredServices(topology: Topology): ServiceName[] {
	const services: ServiceName[] = [];
	if (topology.db === 'postgres') services.push('postgres');
	if (topology.queue || topology.engine === 'remote') services.push('redis');
	if (topology.tunnel.provider === 'cloudflare') services.push('tunnel');
	if (topology.mail.provider === 'mailpit') services.push('mailpit');
	return services;
}

/**
 * The main host port of a service, with the slot. The tunnel publishes only
 * its metrics port. For Mailpit it is the SMTP port.
 */
export function servicePort(topology: Topology, service: ServiceName): number {
	if (service === 'tunnel') return topology.tunnel.metricsPort + topology.slot;
	if (service === 'mailpit') return topology.mail.smtpPort + topology.slot;
	return topology.services[service].port + topology.slot;
}

/** The host port of the Mailpit UI and API, with the slot. */
export function mailpitUiPort(topology: Topology): number {
	return topology.mail.uiPort + topology.slot;
}

/** Every host port that a service publishes, with the slot. */
export function servicePorts(topology: Topology, service: ServiceName): number[] {
	const ports = [servicePort(topology, service)];
	if (service === 'mailpit') ports.push(mailpitUiPort(topology));
	return ports;
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
			? `runners: ${topology.runners.languages.join('+')} via ${topology.runners.via}`
			: 'runners: internal',
	);
	if (topology.engine !== 'off') {
		parts.push(`engine: ${topology.engine}${topology.engineTls ? ' (TLS)' : ''}`);
	}
	if (topology.tunnel.provider === 'cloudflare') {
		parts.push(`tunnel: ${topology.tunnel.hostname ?? 'cloudflare quick tunnel'}`);
	}
	if (topology.mail.provider === 'mailpit') parts.push('mail: mailpit');
	if (topology.slot > 0) parts.push(`slot ${topology.slot}`);
	return parts.join(' · ');
}
