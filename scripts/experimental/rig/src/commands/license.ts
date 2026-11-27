import { readFileSync } from 'node:fs';
import { defineCommand } from 'citty';
import pc from 'picocolors';

import { saveTopology } from '../config/env-yaml';
import { displayPath, licensesDir } from '../config/paths';
import { currentEnvName } from '../environment';
import { RigError } from '../errors';
import {
	assertLicenseName,
	DEFAULT_TENANT_ID,
	defaultLicense,
	deleteLicense,
	envsUsingLicense,
	inferLicenseKind,
	kindLabel,
	type License,
	type LicenseKind,
	licenseExists,
	licenseFromValues,
	listLicenses,
	readLicenseValues,
	requireLicense,
	setDefaultLicense,
	validateLicense,
	validateLicenseValues,
	writeLicense,
} from '../licenses';
import { RIG } from '../meta';
import { table, ui } from '../ui/output';
import { ask, confirm, isInteractive, password, select } from '../ui/prompt';
import { envArg, loadEnv, offerRestart, positionals } from './common';

const restartArg = {
	restart: {
		type: 'boolean',
		description: 'Restart affected components without a prompt. --no-restart skips it',
	},
} as const;

function validateNewName(name: string): string | undefined {
	if (name === '') return 'Enter a name.';
	try {
		assertLicenseName(name);
	} catch (error) {
		return error instanceof Error ? error.message : String(error);
	}
	return licenseExists(name) ? `"${name}" exists. Choose another name.` : undefined;
}

/**
 * Shows the problems of a license and asks whether to keep it. An invalid
 * license is allowed, so you can test how n8n handles one.
 */
async function acceptProblems(problems: string[], force: boolean | undefined): Promise<boolean> {
	if (problems.length === 0) return true;
	for (const problem of problems) ui.warn(problem);
	if (force) return true;
	if (!isInteractive()) {
		throw new RigError('The license is not valid.', 'Add --force to store it anyway.');
	}
	return await confirm('Add it anyway?', false);
}

interface LicenseFlags {
	kind?: LicenseKind;
	tenantId?: string;
	serverUrl?: string;
}

/**
 * Reads the activation key or the cert from stdin, or from a masked prompt,
 * so it stays out of the shell history.
 */
async function readLicenseValue(interactive: boolean): Promise<string> {
	if (!process.stdin.isTTY) {
		const value = readFileSync(0, 'utf8').trim();
		if (value === '') throw new RigError('stdin has no activation key or cert.');
		return value;
	}
	if (!interactive) {
		throw new RigError(
			'Pipe the activation key or the cert to stdin, or run the command in a terminal.',
		);
	}
	const value = (await password('Activation key or cert')).trim();
	if (value === '') throw new RigError('No activation key or cert. Nothing changed.');
	return value;
}

/**
 * The kind of a license value: the flag, or the kind that the format shows.
 * Asks when the value has neither format.
 */
async function licenseKind(
	value: string,
	flag: LicenseKind | undefined,
	interactive: boolean,
): Promise<LicenseKind> {
	const kind = flag ?? inferLicenseKind(value);
	if (kind) return kind;
	if (!interactive) {
		throw new RigError(
			'The value is not a UUID (activation key) and not base64 (cert).',
			'Give its kind with --activation-key or --cert, and add --force to store it anyway.',
		);
	}
	return await select<LicenseKind>('The value is not a UUID and not base64. What is it?', [
		{ value: 'activation-key', label: 'Activation key', hint: 'N8N_LICENSE_ACTIVATION_KEY' },
		{ value: 'cert', label: 'Cert', hint: 'N8N_LICENSE_CERT' },
	]);
}

/** Asks for the parts of a license that the flags do not give. */
async function collectLicense(flags: LicenseFlags): Promise<License> {
	const interactive = isInteractive();
	const value = await readLicenseValue(interactive);
	const kind = await licenseKind(value, flags.kind, interactive);

	const tenantId =
		flags.tenantId ??
		(interactive
			? await ask('Tenant ID', {
					initialValue: DEFAULT_TENANT_ID,
					validate: (input) => (input === '' ? 'Enter a tenant ID.' : undefined),
				})
			: DEFAULT_TENANT_ID);
	const serverUrl =
		flags.serverUrl ??
		(interactive
			? await ask(`License server URL ${pc.dim('(empty for the default server)')}`, {
					placeholder: 'https://license.n8n.io/v1',
				})
			: undefined);
	return { kind, value, tenantId, serverUrl: serverUrl || undefined };
}

function announceAdd(name: string, license: License, becameDefault: boolean): void {
	ui.success(
		`Added license ${pc.bold(name)}: ${kindLabel(license.kind)}, tenant ${license.tenantId}${becameDefault ? ', the default' : ''}.`,
	);
}

/**
 * Asks for a new license and stores it. Returns its name, or undefined when
 * the user does not keep an invalid license. The wizard uses it too.
 */
export async function addLicenseInteractively(): Promise<string | undefined> {
	const name = await ask('License name', { validate: validateNewName });
	const license = await collectLicense({});
	if (!(await acceptProblems(validateLicense(license), false))) return undefined;
	announceAdd(name, license, writeLicense(name, license));
	return name;
}

const lsCommand = defineCommand({
	meta: { name: 'ls', description: 'List the stored licenses and the environments that use them' },
	run() {
		const names = listLicenses();
		if (names.length === 0) {
			ui.info(`No licenses in ${displayPath(licensesDir())}. Add one with \`${RIG} license add\`.`);
			return;
		}
		const fallback = defaultLicense();
		const current = currentEnvName();
		const rows = [
			[
				pc.dim(''),
				pc.dim('NAME'),
				pc.dim('KIND'),
				pc.dim('TENANT'),
				pc.dim('SERVER'),
				pc.dim('USED BY'),
			],
		];
		const invalid: Array<[string, string[]]> = [];
		for (const name of names) {
			let values: Record<string, string>;
			try {
				values = readLicenseValues(name);
			} catch (error) {
				rows.push([' ', name, pc.red(error instanceof Error ? error.message : String(error))]);
				continue;
			}
			const license = licenseFromValues(values);
			const problems = validateLicenseValues(values);
			if (problems.length > 0) invalid.push([name, problems]);
			const users = envsUsingLicense(name).map((env) =>
				env === current ? `${pc.bold(env)} ${pc.dim('(current)')}` : env,
			);
			rows.push([
				name === fallback ? pc.green('*') : ' ',
				problems.length > 0 ? `${name} ${pc.red('(invalid)')}` : name,
				license ? kindLabel(license.kind) : pc.red('none'),
				license?.tenantId || pc.red('none'),
				license?.serverUrl ?? pc.dim('default'),
				users.join(', ') || pc.dim('-'),
			]);
		}
		console.log(table(rows));
		for (const [name, problems] of invalid) {
			console.log(pc.dim(`\n${name}: ${problems.join(' ')}`));
		}
		console.log(
			pc.dim(
				`\n* is the default for new environments. Files: ${displayPath(licensesDir())}/<name>.env`,
			),
		);
	},
});

const addCommand = defineCommand({
	meta: {
		name: 'add',
		description:
			'Store a license. Asks for the values, or reads the key or cert from stdin. The first license becomes the default',
	},
	args: {
		name: { type: 'positional', required: false, description: 'License name' },
		'activation-key': {
			type: 'boolean',
			description: 'Store the value as an activation key. Default: a UUID is an activation key',
		},
		cert: {
			type: 'boolean',
			description: 'Store the value as a cert. Default: a base64 value is a cert',
		},
		'tenant-id': { type: 'string', description: `Tenant ID (default ${DEFAULT_TENANT_ID})` },
		'server-url': { type: 'string', description: 'License server URL (default: n8n default)' },
		default: { type: 'boolean', description: 'Make it the default license' },
		force: {
			type: 'boolean',
			description: 'Store an invalid license, and replace a license with the same name',
		},
	},
	async run({ args }) {
		if (args['activation-key'] && args.cert) {
			throw new RigError('Give --activation-key or --cert, not both.');
		}
		const kind: LicenseKind | undefined = args.cert
			? 'cert'
			: args['activation-key']
				? 'activation-key'
				: undefined;

		let name: string;
		if (args.name) {
			name = assertLicenseName(args.name);
		} else if (isInteractive()) {
			name = await ask('License name', { validate: validateNewName });
		} else {
			throw new RigError(`Give a name: \`${RIG} license add <name>\`.`);
		}
		if (licenseExists(name) && !args.force) {
			if (!isInteractive()) {
				throw new RigError(`License "${name}" exists.`, 'Add --force to replace it.');
			}
			if (!(await confirm(`License "${name}" exists. Replace it?`, false))) return;
		}

		const license = await collectLicense({
			kind,
			tenantId: args['tenant-id'],
			serverUrl: args['server-url'],
		});
		if (!(await acceptProblems(validateLicense(license), args.force))) {
			ui.info('Nothing changed.');
			return;
		}
		announceAdd(name, license, writeLicense(name, license, { makeDefault: args.default }));
		const users = envsUsingLicense(name);
		if (users.length > 0) {
			ui.info(`Used by ${users.join(', ')}. Restart their components to use the new values.`);
		}
	},
});

const rmCommand = defineCommand({
	meta: { name: 'rm', description: 'Delete stored licenses' },
	args: {
		name: { type: 'positional', required: true, description: 'License' },
		yes: { type: 'boolean', alias: 'y', description: 'Do not ask for confirmation' },
	},
	async run({ args }) {
		const names = positionals(args).map(requireLicense);
		for (const name of names) {
			const users = envsUsingLicense(name);
			if (!args.yes) {
				if (!isInteractive()) throw new RigError('Add --yes to confirm.');
				const usage =
					users.length > 0 ? ` ${users.join(', ')} use${users.length === 1 ? 's' : ''} it.` : '';
				if (!(await confirm(`Delete license ${pc.bold(name)}?${usage}`, false))) continue;
			}
			const wasDefault = deleteLicense(name);
			ui.success(`Deleted license ${pc.bold(name)}.`);
			if (users.length > 0) {
				ui.warn(
					`${users.join(', ')} still refer${users.length === 1 ? 's' : ''} to it. Use \`${RIG} license use <name> --env <env>\` or \`${RIG} license off --env <env>\`.`,
				);
			}
			if (wasDefault) {
				ui.info(`There is no default license now. Set one with \`${RIG} license default <name>\`.`);
			}
		}
	},
});

const useCommand = defineCommand({
	meta: {
		name: 'use',
		description: 'Use a license in the environment. Without a name, use the default license',
	},
	args: {
		...envArg,
		...restartArg,
		name: { type: 'positional', required: false, description: 'License' },
	},
	async run({ args }) {
		const env = loadEnv(args.env);
		const name = args.name ? requireLicense(args.name) : defaultLicense();
		if (!name) {
			throw new RigError(
				'There is no default license.',
				`Give a name, or set a default with \`${RIG} license default <name>\`.`,
			);
		}
		saveTopology(env.paths.envYaml, { ...env.topology, license: name });
		ui.success(`License of ${env.name}: ${name}`);
		await offerRestart(env, ['shared'], args.restart);
	},
});

const offCommand = defineCommand({
	meta: { name: 'off', description: 'Use no license in the environment' },
	args: { ...envArg, ...restartArg },
	async run({ args }) {
		const env = loadEnv(args.env);
		if (!env.topology.license) {
			ui.info(`${env.name} uses no license.`);
			return;
		}
		saveTopology(env.paths.envYaml, { ...env.topology, license: undefined });
		ui.success(`${env.name} uses no license now.`);
		await offerRestart(env, ['shared'], args.restart);
	},
});

const defaultCommand = defineCommand({
	meta: {
		name: 'default',
		description: 'Show or set the license that new environments use',
	},
	args: { name: { type: 'positional', required: false, description: 'License' } },
	run({ args }) {
		if (!args.name) {
			const name = defaultLicense();
			if (name) console.log(name);
			else ui.info(`No default license. Set one with \`${RIG} license default <name>\`.`);
			return;
		}
		setDefaultLicense(requireLicense(args.name));
		ui.success(`Default license: ${args.name}`);
	},
});

export const licenseCommand = defineCommand({
	meta: {
		name: 'license',
		description: `n8n licenses in ${displayPath(licensesDir())}, for the environments to use`,
	},
	subCommands: {
		ls: lsCommand,
		add: addCommand,
		rm: rmCommand,
		use: useCommand,
		off: offCommand,
		default: defaultCommand,
	},
});
