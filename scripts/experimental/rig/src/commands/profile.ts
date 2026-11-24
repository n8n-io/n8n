import { existsSync } from 'node:fs';
import { defineCommand } from 'citty';
import pc from 'picocolors';

import { PROFILE_NAME_PATTERN, saveTopology } from '../config/env-yaml';
import { displayPath, profileFile, profilesDir } from '../config/paths';
import { readDotenv } from '../env/dotenv';
import { listProfiles, PROFILE_PREFIX, suggest } from '../environment';
import { RigError } from '../errors';
import { RIG } from '../meta';
import { table, ui } from '../ui/output';
import { envArg, loadEnv, offerRestart, positionals } from './common';

const restartArg = {
	restart: {
		type: 'boolean',
		description: 'Restart affected components without a prompt. --no-restart skips it',
	},
} as const;

function profileArg(name: string): string {
	if (!PROFILE_NAME_PATTERN.test(name)) {
		throw new RigError(`Invalid profile name "${name}". Use lowercase letters, digits, - and _.`);
	}
	return name;
}

function requireProfileFile(name: string): void {
	if (existsSync(profileFile(name))) return;
	throw new RigError(
		`Profile "${name}" does not exist.${suggest(name, listProfiles())}`,
		`Create it with \`${RIG} env set KEY=VALUE --on ${PROFILE_PREFIX}${name}\` or \`${RIG} env edit --on ${PROFILE_PREFIX}${name}\`.`,
	);
}

const lsCommand = defineCommand({
	meta: { name: 'ls', description: 'List the profiles and show which ones the environment uses' },
	args: { ...envArg },
	run({ args }) {
		const env = loadEnv(args.env);
		const names = [...new Set([...listProfiles(), ...env.topology.profiles])];
		if (names.length === 0) {
			ui.info(
				`No profiles in ${displayPath(profilesDir())}. Create one with \`${RIG} env set KEY=VALUE --on ${PROFILE_PREFIX}<name>\`.`,
			);
			return;
		}
		const rows = [[pc.dim('ON'), pc.dim('PROFILE'), pc.dim('KEYS')]];
		for (const name of names) {
			const position = env.topology.profiles.indexOf(name);
			const file = profileFile(name);
			const keys = existsSync(file) ? readDotenv(file).map((entry) => entry.key) : [];
			rows.push([
				position === -1 ? ' ' : pc.green(String(position + 1)),
				existsSync(file) ? name : `${name} ${pc.red('(missing)')}`,
				keys.join(', ') || pc.dim('(empty)'),
			]);
		}
		console.log(table(rows));
		console.log(pc.dim(`\nA later profile wins. Files: ${displayPath(profilesDir())}/<name>.env`));
	},
});

const onCommand = defineCommand({
	meta: {
		name: 'on',
		description: 'Turn profiles on for the environment. A later profile wins',
	},
	args: {
		...envArg,
		...restartArg,
		name: { type: 'positional', required: true, description: 'Profile' },
	},
	async run({ args }) {
		const env = loadEnv(args.env);
		const names = positionals(args).map(profileArg);
		names.forEach(requireProfileFile);
		// Turning a profile on again moves it to the end, so it wins.
		const profiles = [...env.topology.profiles.filter((p) => !names.includes(p)), ...names];
		saveTopology(env.paths.envYaml, { ...env.topology, profiles });
		ui.success(`Profiles of ${env.name}: ${profiles.join(', ')}`);
		await offerRestart(env, ['shared'], args.restart);
	},
});

const offCommand = defineCommand({
	meta: { name: 'off', description: 'Turn profiles off for the environment' },
	args: {
		...envArg,
		...restartArg,
		name: { type: 'positional', required: true, description: 'Profile' },
	},
	async run({ args }) {
		const env = loadEnv(args.env);
		const names = positionals(args).map(profileArg);
		for (const name of names) {
			if (!env.topology.profiles.includes(name)) ui.warn(`${name} is not on.`);
		}
		const profiles = env.topology.profiles.filter((p) => !names.includes(p));
		saveTopology(env.paths.envYaml, { ...env.topology, profiles });
		ui.success(`Profiles of ${env.name}: ${profiles.join(', ') || pc.dim('none')}`);
		await offerRestart(env, ['shared'], args.restart);
	},
});

export const profileCommand = defineCommand({
	meta: {
		name: 'profile',
		description: `Reusable env snippets in ${displayPath(profilesDir())}. Edit them with \`env set|edit --on profile:<name>\``,
	},
	subCommands: { ls: lsCommand, on: onCommand, off: offCommand },
});
