import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	loadGlobalConfig,
	saveGlobalConfig,
	setGlobalConfigValue,
} from '../src/config/global-config';
import { globalConfigFile } from '../src/config/paths';
import { RigError } from '../src/errors';
import { buildCompose, containerName } from '../src/services/compose';
import {
	assertRuntimeRunning,
	configuredRuntime,
	containerRuntime,
	ensureContainerRuntime,
	serverVersion,
} from '../src/services/runtime';
import { parseTopology } from '../src/config/env-yaml';

let bin: string;

/** A fake CLI. `info` succeeds only when the runtime "runs". */
function fakeRuntime(name: 'docker' | 'podman', running: boolean) {
	const file = join(bin, name);
	writeFileSync(
		file,
		`#!/bin/sh\ncase "$1" in\n  --version) echo "${name} version 1.0";;\n  info) ${running ? 'echo 9.9' : 'exit 1'};;\nesac\n`,
	);
	chmodSync(file, 0o755);
}

beforeEach(() => {
	bin = mkdtempSync(join(tmpdir(), 'rig-runtime-'));
	// Only the fake CLIs: /bin/sh runs them through their shebang.
	vi.stubEnv('PATH', bin);
	vi.stubEnv('RIG_CONTAINER_RUNTIME', '');
	vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
	rmSync(bin, { recursive: true, force: true });
	rmSync(globalConfigFile(), { force: true });
});

describe('container runtime', () => {
	it('should save the only installed runtime on the first use', async () => {
		fakeRuntime('podman', false);
		expect(await ensureContainerRuntime()).toBe('podman');
		expect(loadGlobalConfig().container.runtime).toBe('podman');
	});

	it('should pick the running one without a terminal when both are installed, and not save it', async () => {
		fakeRuntime('docker', false);
		fakeRuntime('podman', true);
		expect(await ensureContainerRuntime()).toBe('podman');
		expect(loadGlobalConfig().container.runtime).toBeUndefined();
		expect(containerRuntime()).toBe('podman');
	});

	it('should prefer Docker when both run', async () => {
		fakeRuntime('docker', true);
		fakeRuntime('podman', true);
		expect(await ensureContainerRuntime()).toBe('docker');
	});

	it('should fail when neither is installed', async () => {
		await expect(ensureContainerRuntime()).rejects.toThrow('rig needs Docker or Podman');
	});

	it('should use the saved runtime, and let RIG_CONTAINER_RUNTIME override it', async () => {
		fakeRuntime('docker', true);
		saveGlobalConfig(setGlobalConfigValue(loadGlobalConfig(), 'container.runtime', 'podman'));
		expect(await ensureContainerRuntime()).toBe('podman');
		vi.stubEnv('RIG_CONTAINER_RUNTIME', 'docker');
		expect(configuredRuntime()).toBe('docker');
		vi.stubEnv('RIG_CONTAINER_RUNTIME', 'containerd');
		expect(() => configuredRuntime()).toThrow(RigError);
	});

	it('should reject an unknown runtime in the config', () => {
		expect(() => setGlobalConfigValue(loadGlobalConfig(), 'container.runtime', 'lxc')).toThrow(
			'Invalid container.runtime',
		);
	});

	it('should read the server version from info', () => {
		fakeRuntime('docker', true);
		fakeRuntime('podman', false);
		expect(serverVersion('docker')).toBe('9.9');
		expect(serverVersion('podman')).toBeUndefined();
	});

	it('should tell apart a runtime that does not run from one that is not installed', () => {
		fakeRuntime('docker', false);
		expect(() => assertRuntimeRunning('docker')).toThrow('Docker is not running.');
		expect(() => assertRuntimeRunning('podman')).toThrow('Podman is not installed.');
	});
});

describe('compose file', () => {
	it('should name the containers so that inspect and exec find them in both runtimes', () => {
		const topology = parseTopology({ name: 'q', db: 'postgres', queue: true, workers: 1 });
		const { services } = buildCompose('q', topology) as {
			services: Record<string, { container_name: string }>;
		};
		expect(services.postgres.container_name).toBe(containerName('q', 'postgres'));
		expect(services.redis.container_name).toBe('rig-q-redis');
	});
});
