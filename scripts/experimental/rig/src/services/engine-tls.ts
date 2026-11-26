import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { generateTlsCerts } from 'n8n-containers/helpers/tls-certs';

import type { EnvPaths } from '../config/paths';
import { RigError } from '../errors';

export type EnginePlane = 'main' | 'engine';

/** Both planes run on this machine, so each certificate names the loopback address. */
const SUBJECT_ALT_NAMES = ['DNS:localhost', 'IP:127.0.0.1'];
/** Renew certificates that expire within this many seconds. The helper makes them for 30 days. */
const RENEW_BEFORE_SECONDS = 2 * 24 * 60 * 60;

/** The files of one plane, as `N8N_ENGINE_TLS_*` vars. */
export function engineTlsEnv(paths: EnvPaths, plane: EnginePlane): Record<string, string> {
	const dir = paths.engineTlsDir;
	return {
		N8N_ENGINE_TLS_CERT_FILE: join(dir, `${plane}.crt`),
		N8N_ENGINE_TLS_KEY_FILE: join(dir, `${plane}.key`),
		N8N_ENGINE_TLS_CA_FILE: join(dir, 'ca.crt'),
	};
}

function expiresSoon(certFile: string): boolean {
	const result = spawnSync(
		'openssl',
		['x509', '-checkend', String(RENEW_BEFORE_SECONDS), '-noout', '-in', certFile],
		{ stdio: 'ignore' },
	);
	return result.status !== 0;
}

/**
 * Creates the CA and a certificate for each plane, or renews them before they
 * expire. n8n reads the files again when they change, so a running pair keeps working.
 */
export function ensureEngineTls(paths: EnvPaths, log: (message: string) => void): void {
	const files = [
		...Object.values(engineTlsEnv(paths, 'main')),
		...Object.values(engineTlsEnv(paths, 'engine')),
	];
	if (files.every(existsSync) && !files.filter((f) => f.endsWith('.crt')).some(expiresSoon)) return;

	if (spawnSync('openssl', ['version'], { stdio: 'ignore' }).status !== 0) {
		throw new RigError(
			'Engine TLS needs openssl to create certificates.',
			'Install openssl, or set `engineTls: false`.',
		);
	}
	log('Creating the engine TLS certificates');
	mkdirSync(paths.engineTlsDir, { recursive: true });
	generateTlsCerts(paths.engineTlsDir, { main: SUBJECT_ALT_NAMES, engine: SUBJECT_ALT_NAMES });
	// The helper keeps the CA key and signing files next to the certificates. Nothing needs them later.
	for (const file of ['ca.key', 'ca.srl']) rmSync(join(paths.engineTlsDir, file), { force: true });
	// The helper makes every file readable for containers. Here only the user runs the planes.
	for (const plane of ['main', 'engine'])
		chmodSync(join(paths.engineTlsDir, `${plane}.key`), 0o600);
}
