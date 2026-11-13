import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineCommand } from 'citty';
import pc from 'picocolors';

import { loadGlobalConfig } from '../config/global-config';
import { expandHome } from '../config/paths';
import { RigError } from '../errors';
import { BUILD, DELEGATED_FROM_VAR, runningVersion } from '../self/build-info';
import { handOffTarget, NO_DELEGATE_VAR } from '../self/delegate';
import {
	binDir,
	buildBundle,
	currentInstall,
	installBundle,
	isShim,
	pathStatus,
	RIG_PACKAGE_DIR,
	rollback,
	shimPath,
} from '../self/install';
import { findMonorepoRoot } from '../source';
import { ui } from '../ui/output';

function hasRig(checkout: string): boolean {
	return existsSync(join(checkout, RIG_PACKAGE_DIR, 'package.json'));
}

/**
 * The checkout to build from: `--from`, then the checkout of the current
 * directory, then `repo` in the global config, then the checkout of the
 * installed version, then the checkout that this code runs from.
 */
function buildCheckout(from: string | undefined): string {
	if (from) {
		const root = findMonorepoRoot(expandHome(from));
		if (!root || !hasRig(root)) throw new RigError(`${from} is not an n8n checkout with rig.`);
		return root;
	}
	const candidates = [
		findMonorepoRoot(),
		loadGlobalConfig().repo,
		currentInstall()?.info?.checkout,
		BUILD ? undefined : findMonorepoRoot(dirname(fileURLToPath(import.meta.url))),
	];
	const checkout = candidates.find(
		(candidate): candidate is string => candidate !== undefined && hasRig(expandHome(candidate)),
	);
	if (!checkout) {
		throw new RigError(
			'rig needs an n8n checkout to build from.',
			'Run the command inside a checkout, or pass `--from <path>`.',
		);
	}
	return expandHome(checkout);
}

function printPathAdvice(): void {
	const { onPath, first } = pathStatus();
	if (!onPath) {
		ui.warn(`${binDir()} is not on your PATH. Add this line to your shell profile:`);
		console.log(`    export PATH="${binDir()}:$PATH"`);
		return;
	}
	if (first && first !== shimPath() && !isShim(first)) {
		ui.warn(
			`The shell finds another rig first: ${first}. Remove it or put ${binDir()} earlier on PATH.`,
		);
	}
}

function install(from: string | undefined, force: boolean): void {
	const checkout = buildCheckout(from);
	ui.info(`Building rig from ${checkout}`);
	const bundle = buildBundle(checkout);
	const { id, previous } = installBundle(bundle, checkout, { force });
	ui.success(`Installed rig ${id}${previous ? pc.dim(` (was ${previous})`) : ''}`);
	ui.step(`Shim: ${shimPath()}`);
	if (bundle.info.dirty)
		ui.warn('The rig package had uncommitted changes. The version id marks this build as dirty.');
	printPathAdvice();
}

const sourceArgs = {
	from: { type: 'string', description: 'The n8n checkout to build from' },
	force: { type: 'boolean', description: 'Replace an existing rig file that rig did not create' },
} as const;

export const installGlobalCommand = defineCommand({
	meta: {
		name: 'install-global',
		description: `Build rig and install it as \`rig\` in ${binDir()}`,
	},
	args: sourceArgs,
	run({ args }) {
		install(args.from, args.force ?? false);
		ui.step(
			'Inside an n8n checkout with rig, `rig` runs the version of that checkout. RIG_NO_DELEGATE=1 turns this off.',
		);
	},
});

export const selfUpdateCommand = defineCommand({
	meta: {
		name: 'self-update',
		description: 'Rebuild the global rig, or roll back to the previous version',
	},
	args: {
		...sourceArgs,
		rollback: { type: 'boolean', description: 'Point the shim to the previous version' },
	},
	run({ args }) {
		if (args.rollback) {
			const { from, to } = rollback();
			ui.success(`rig now runs ${to} ${pc.dim(`(was ${from})`)}`);
			return;
		}
		if (!currentInstall()) {
			throw new RigError('rig is not installed globally.', 'Run `pnpm rig install-global`.');
		}
		install(args.from, args.force ?? false);
	},
});

/** `rig --version`: the running version, and the global version when they differ. */
export function printVersion(): void {
	const delegatedFrom = process.env[DELEGATED_FROM_VAR];
	const installed = currentInstall();
	const running = runningVersion();
	const where = BUILD
		? 'global install'
		: `source: ${findMonorepoRoot(dirname(fileURLToPath(import.meta.url))) ?? 'unknown'}`;
	console.log(`rig ${running} ${pc.dim(`(${where})`)}`);
	if (delegatedFrom) {
		console.log(
			pc.dim(
				`global rig ${delegatedFrom} handed off to this checkout. ${NO_DELEGATE_VAR}=1 turns this off.`,
			),
		);
	} else if (!BUILD && installed) {
		console.log(pc.dim(`global rig ${installed.id}`));
	} else if (BUILD && handOffTarget().kind === 'not-installed') {
		console.log(
			pc.dim('This checkout has rig without dependencies. Run `pnpm install` to use its version.'),
		);
	}
}
