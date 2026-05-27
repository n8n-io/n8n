#!/usr/bin/env tsx
/**
 * Standalone script to start the n8n sandbox service (API + runner) using
 * raw Docker commands. Used by CI workflows where the sandbox must join an
 * existing Docker network alongside separately-managed n8n containers.
 *
 * Usage: pnpm tsx packages/testing/containers/start-sandbox.ts [--network <name>]
 */
import { execFileSync, execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { TEST_CONTAINER_IMAGES } from './test-containers';

const { values } = parseArgs({
	options: { network: { type: 'string', default: 'n8n-eval-net' } },
	strict: false,
});

const network = values.network ?? 'n8n-eval-net';

const API_KEY = 'n8n-sandbox-ci-key';
const RUNNER_API_KEY = 'ci-runner-key';
const REGISTRATION_TOKEN = 'ci-reg-token';

function docker(...args: string[]) {
	console.log(`$ docker ${args.join(' ')}`);
	execFileSync('docker', args, { stdio: 'inherit' });
}

function dockerQuiet(...args: string[]): string {
	return execFileSync('docker', args, { encoding: 'utf-8' }).trim();
}

function waitForHealth(
	container: string,
	healthCmd: string[],
	timeoutSeconds: number,
	label: string,
) {
	console.log(`Waiting for ${label} to become healthy...`);
	for (let i = 1; i <= timeoutSeconds; i++) {
		try {
			execFileSync('docker', ['exec', container, ...healthCmd], { stdio: 'pipe' });
			console.log(`${label} healthy after ${i}s`);
			return;
		} catch {
			if (i === timeoutSeconds) {
				try {
					execFileSync('docker', ['logs', container, '--tail', '30'], { stdio: 'inherit' });
				} catch {
					/* best-effort log dump */
				}
				throw new Error(`${label} failed to start within ${timeoutSeconds}s`);
			}
			execSync('sleep 1');
		}
	}
}

// 1. Generate mTLS certificates
const tlsDir = mkdtempSync(join(tmpdir(), 'sandbox-tls-'));
console.log(`Generating mTLS certificates in ${tlsDir}`);

docker(
	'run',
	'--rm',
	'--user',
	'0:0',
	'--entrypoint',
	'sh',
	'-v',
	`${tlsDir}:/tls`,
	'-e',
	'NUM_RUNNERS=1',
	TEST_CONTAINER_IMAGES.sandboxApi,
	'-c',
	'bootstrap-mtls.sh --out-dir /tls --api-san sandbox-api --control-san-prefix sandbox-runner --world-readable && chown -R sandbox-api:sandbox-api /tls/api',
);

// 2. Ensure network exists
try {
	dockerQuiet('network', 'inspect', network);
} catch {
	docker('network', 'create', network);
}

// 3. Start sandbox API
docker(
	'run',
	'-d',
	'--name',
	'sandbox-api',
	'--network',
	network,
	'-v',
	`${tlsDir}/api:/tls:ro`,
	'-e',
	`SANDBOX_API_KEYS=${API_KEY}`,
	'-e',
	`SANDBOX_API_RUNNER_REGISTRATION_TOKEN=${REGISTRATION_TOKEN}`,
	'-e',
	`SANDBOX_API_RUNNER_API_KEY=${RUNNER_API_KEY}`,
	'-e',
	'SANDBOX_API_GRPC_TLS_CERT_FILE=/tls/grpc-server.crt',
	'-e',
	'SANDBOX_API_GRPC_TLS_KEY_FILE=/tls/grpc-server.key',
	'-e',
	'SANDBOX_API_GRPC_TLS_CLIENT_CA_FILE=/tls/ca.crt',
	'-e',
	'SANDBOX_API_RUNNER_CONTROL_GRPC_TLS_CA_FILE=/tls/ca.crt',
	'-e',
	'SANDBOX_API_RUNNER_CONTROL_GRPC_TLS_CERT_FILE=/tls/control-grpc-api-client.crt',
	'-e',
	'SANDBOX_API_RUNNER_CONTROL_GRPC_TLS_KEY_FILE=/tls/control-grpc-api-client.key',
	'-e',
	'SANDBOX_API_RUNNER_CONTROL_GRPC_TLS_SERVER_NAME=sandbox-runner-1',
	'-e',
	'SANDBOX_API_LOG_LEVEL=warn',
	TEST_CONTAINER_IMAGES.sandboxApi,
);

waitForHealth(
	'sandbox-api',
	['wget', '-q', '-O', '/dev/null', 'http://localhost:8080/healthz'],
	60,
	'Sandbox API',
);

// 4. Start sandbox runner (DinD — requires privileged mode)
docker(
	'run',
	'-d',
	'--name',
	'sandbox-runner-1',
	'--network',
	network,
	'--privileged',
	'-v',
	`${tlsDir}/runner:/tls:ro`,
	'-e',
	`SANDBOX_RUNNER_API_KEYS=${RUNNER_API_KEY}`,
	'-e',
	`SANDBOX_RUNNER_REGISTRATION_TOKEN=${REGISTRATION_TOKEN}`,
	'-e',
	'SANDBOX_RUNNER_API_GRPC_ADDR=sandbox-api:9090',
	'-e',
	'SANDBOX_RUNNER_HTTP_BASE_URL=http://sandbox-runner-1:8080',
	'-e',
	'SANDBOX_RUNNER_CONTROL_GRPC_LISTEN_ADDR=:9091',
	'-e',
	'SANDBOX_RUNNER_CONTROL_GRPC_ADVERTISE_ADDR=sandbox-runner-1:9091',
	'-e',
	'SANDBOX_RUNNER_ID=ci-runner-1',
	'-e',
	`SANDBOX_RUNNER_DOCKER_SANDBOX_IMAGE=${TEST_CONTAINER_IMAGES.sandboxSandbox}`,
	'-e',
	'SANDBOX_RUNNER_LOG_LEVEL=warn',
	'-e',
	'SANDBOX_RUNNER_REGISTRATION_GRPC_CA_FILE=/tls/ca.crt',
	'-e',
	'SANDBOX_RUNNER_REGISTRATION_GRPC_CERT_FILE=/tls/grpc-client.crt',
	'-e',
	'SANDBOX_RUNNER_REGISTRATION_GRPC_KEY_FILE=/tls/grpc-client.key',
	'-e',
	'SANDBOX_RUNNER_REGISTRATION_GRPC_SERVER_NAME=sandbox-api',
	'-e',
	'SANDBOX_RUNNER_CONTROL_GRPC_TLS_CERT_FILE=/tls/control-grpc-server.crt',
	'-e',
	'SANDBOX_RUNNER_CONTROL_GRPC_TLS_KEY_FILE=/tls/control-grpc-server.key',
	'-e',
	'SANDBOX_RUNNER_CONTROL_GRPC_TLS_CLIENT_CA_FILE=/tls/ca.crt',
	TEST_CONTAINER_IMAGES.sandboxRunner,
);

waitForHealth(
	'sandbox-runner-1',
	[
		'wget',
		'-q',
		'-O',
		'/dev/null',
		'--header=X-Api-Key: ci-runner-key',
		'http://localhost:8080/healthz',
	],
	120,
	'Sandbox runner',
);

console.log('Sandbox service is ready');
