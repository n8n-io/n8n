import { spawnSync } from 'node:child_process';

import { requiredServices } from '../config/env-yaml';
import type { RigEnv } from '../environment';
import { RigError } from '../errors';
import { ensureLauncherBinary } from '../launcher/binary';
import { serviceAddress, servicesUp } from '../services/compose';
import { ensureEngineTls } from '../services/engine-tls';
import { checkBuild } from '../source';
import type { Component } from '../topology/components';
import { topologyWarnings, validateTopology } from '../topology/validate';
import { ui } from '../ui/output';

/** Checks that the components can start, then starts the services. */
export async function preflight(
	env: RigEnv,
	components: Component[],
	options: { services?: boolean } = {},
): Promise<void> {
	validateTopology(env.topology);
	const repoRoot = env.requireRepoRoot();

	const launchers = components.some((c) => c.kind === 'launcher');
	const runners = components.filter((c) => c.kind === 'runner');
	const languages = env.topology.runners.languages;
	const build = checkBuild(repoRoot, {
		jsRunner:
			(launchers && languages.includes('js')) ||
			runners.some((c) => c.kind === 'runner' && c.language === 'js'),
		pyRunner:
			(launchers && languages.includes('python')) ||
			runners.some((c) => c.kind === 'runner' && c.language === 'python'),
	});
	if (build.errors.length > 0) throw new RigError(build.errors.join('\n'));
	for (const warning of build.warnings) ui.warn(warning);

	if (launchers) await ensureLauncherBinary(env.launcherSource(), (message) => ui.info(message));
	const python =
		(launchers && languages.includes('python')) ||
		runners.some((c) => c.kind === 'runner' && c.language === 'python');
	if (python) {
		if (spawnSync('uv', ['--version'], { stdio: 'ignore' }).status !== 0) {
			throw new RigError(
				'The Python task runner needs `uv`.',
				'Install uv (https://docs.astral.sh/uv/), or set `runners.languages: [js]` in env.yaml.',
			);
		}
	}

	if (env.topology.engineTls) ensureEngineTls(env.paths, (message) => ui.info(message));

	const main = env.processes().find((c) => c.name === 'main-1');
	for (const warning of topologyWarnings(env.topology, main ? env.resolve(main).env : undefined)) {
		ui.warn(warning);
	}

	const services = requiredServices(env.topology);
	if (services.length > 0 && options.services !== false) {
		ui.info(`Starting services: ${services.join(', ')}`);
		await servicesUp(env.name, env.topology, env.paths);
		for (const service of services) {
			ui.success(`${service} is ready: ${serviceAddress(env.topology, env.paths, service)}`);
		}
	}
}
