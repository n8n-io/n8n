import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';

import { LICENSE_NAME_PATTERN, loadTopology } from './config/env-yaml';
import { loadGlobalConfig, saveGlobalConfig } from './config/global-config';
import { licenseFile, licensesDir } from './config/paths';
import { readEnvFile, replaceEnvFile } from './env/secret-store';
import { envPaths, listEnvNames, suggest } from './environment';
import { RigError } from './errors';
import { RIG } from './meta';

export const LICENSE_KEYS = {
	activationKey: 'N8N_LICENSE_ACTIVATION_KEY',
	cert: 'N8N_LICENSE_CERT',
	tenantId: 'N8N_LICENSE_TENANT_ID',
	serverUrl: 'N8N_LICENSE_SERVER_URL',
} as const;

export const DEFAULT_TENANT_ID = '1';

export type LicenseKind = 'activation-key' | 'cert';

export interface License {
	kind: LicenseKind;
	/** The activation key or the cert. */
	value: string;
	tenantId: string;
	serverUrl?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BASE64 = /^[A-Za-z0-9+/_-]+={0,2}$/;
const TENANT_ID = /^[1-9]\d*$/;

export function kindLabel(kind: LicenseKind): string {
	return kind === 'cert' ? 'cert' : 'activation key';
}

export function assertLicenseName(name: string): string {
	if (!LICENSE_NAME_PATTERN.test(name)) {
		throw new RigError(`Invalid license name "${name}". Use lowercase letters, digits, - and _.`);
	}
	return name;
}

/** Stored licenses in ~/.config/rig/licenses. */
export function listLicenses(): string[] {
	if (!existsSync(licensesDir())) return [];
	return readdirSync(licensesDir())
		.filter((file) => file.endsWith('.env'))
		.map((file) => file.slice(0, -'.env'.length))
		.filter(licenseExists)
		.sort();
}

export function licenseExists(name: string): boolean {
	return LICENSE_NAME_PATTERN.test(name) && isFile(licenseFile(name));
}

function isFile(path: string): boolean {
	try {
		return statSync(path).isFile();
	} catch {
		return false;
	}
}

export function requireLicense(name: string): string {
	assertLicenseName(name);
	if (licenseExists(name)) return name;
	throw new RigError(
		`License "${name}" does not exist.${suggest(name, listLicenses())}`,
		`Add it with \`${RIG} license add ${name}\`. \`${RIG} license ls\` lists the licenses.`,
	);
}

/**
 * The license of a new environment: the given license, none for `false`, or
 * the default license. env.yaml keeps the name, so a later change of the
 * default does not change the environment.
 */
export function licenseForNewEnv(flag: string | false | undefined): string | undefined {
	if (flag === false) return undefined;
	return flag === undefined ? defaultLicense() : requireLicense(flag);
}

/** The decrypted values of a stored license file. */
export function readLicenseValues(name: string): Record<string, string> {
	return Object.fromEntries(readEnvFile(licenseFile(name)).map((e) => [e.key, e.value]));
}

/**
 * The license in a set of values. When a file has both a cert and an
 * activation key, the kind is `cert`. `validateLicenseValues` reports that case.
 */
export function licenseFromValues(values: Record<string, string>): License | undefined {
	const cert = values[LICENSE_KEYS.cert];
	const activationKey = values[LICENSE_KEYS.activationKey];
	const value = cert ?? activationKey;
	if (value === undefined) return undefined;
	return {
		kind: cert !== undefined ? 'cert' : 'activation-key',
		value,
		tenantId: values[LICENSE_KEYS.tenantId] ?? '',
		serverUrl: values[LICENSE_KEYS.serverUrl],
	};
}

export function licenseToValues(license: License): Record<string, string> {
	const values: Record<string, string> = {
		[license.kind === 'cert' ? LICENSE_KEYS.cert : LICENSE_KEYS.activationKey]: license.value,
		[LICENSE_KEYS.tenantId]: license.tenantId,
	};
	if (license.serverUrl) values[LICENSE_KEYS.serverUrl] = license.serverUrl;
	return values;
}

/**
 * The kind that the format of a value shows: a UUID is an activation key,
 * base64 is a cert. Undefined when the value has neither format.
 */
export function inferLicenseKind(value: string): LicenseKind | undefined {
	// A UUID also matches the base64url alphabet, so check it first.
	if (UUID.test(value)) return 'activation-key';
	if (validateCert(value) === undefined) return 'cert';
	return undefined;
}

export function validateActivationKey(value: string): string | undefined {
	return UUID.test(value) ? undefined : 'The activation key is not a UUID.';
}

export function validateCert(value: string): string | undefined {
	if (!BASE64.test(value)) return 'The cert is not base64.';
	// Buffer.from ignores a bad length and bad padding. A canonical encoding
	// survives a round trip.
	const standard = value.replace(/-/g, '+').replace(/_/g, '/');
	const unpadded = standard.replace(/=+$/, '');
	const decoded = Buffer.from(standard, 'base64');
	if (
		(unpadded !== standard && standard.length % 4 !== 0) ||
		decoded.toString('base64').replace(/=+$/, '') !== unpadded
	) {
		return 'The cert is not base64.';
	}
	if (decoded.length === 0) return 'The cert is empty.';
	return undefined;
}

export function validateTenantId(value: string): string | undefined {
	if (value === '') return `${LICENSE_KEYS.tenantId} is missing.`;
	return TENANT_ID.test(value) ? undefined : 'The tenant ID is not a positive integer.';
}

export function validateServerUrl(value: string | undefined): string | undefined {
	if (value === undefined || value === '') return undefined;
	try {
		const url = new URL(value);
		if (url.protocol === 'http:' || url.protocol === 'https:') return undefined;
	} catch {}
	return 'The server URL is not an http or https URL.';
}

/** The problems of a license. rig can store and use an invalid license, for tests. */
export function validateLicense(license: License): string[] {
	return [
		license.kind === 'cert' ? validateCert(license.value) : validateActivationKey(license.value),
		validateTenantId(license.tenantId),
		validateServerUrl(license.serverUrl),
	].filter((problem): problem is string => problem !== undefined);
}

/** The problems of the values of a stored license file. */
export function validateLicenseValues(values: Record<string, string>): string[] {
	const license = licenseFromValues(values);
	if (!license) {
		return [`It has no ${LICENSE_KEYS.activationKey} and no ${LICENSE_KEYS.cert}.`];
	}
	const problems = validateLicense(license);
	if (values[LICENSE_KEYS.activationKey] !== undefined && values[LICENSE_KEYS.cert] !== undefined) {
		problems.unshift(`It has both ${LICENSE_KEYS.activationKey} and ${LICENSE_KEYS.cert}.`);
	}
	return problems;
}

/** The default license, when its file exists. */
export function defaultLicense(): string | undefined {
	const name = loadGlobalConfig().license.default;
	return name && licenseExists(name) ? name : undefined;
}

export function setDefaultLicense(name: string | undefined): void {
	const config = loadGlobalConfig();
	saveGlobalConfig({ ...config, license: { ...config.license, default: name } });
}

/**
 * Writes a license file. It replaces a license with the same name. The first
 * license, or a license with `makeDefault`, becomes the default. Returns
 * whether it became the default.
 */
export function writeLicense(
	name: string,
	license: License,
	options: { makeDefault?: boolean } = {},
): boolean {
	assertLicenseName(name);
	replaceEnvFile(licenseFile(name), licenseToValues(license));
	const becomesDefault = options.makeDefault || defaultLicense() === undefined;
	if (becomesDefault) setDefaultLicense(name);
	return becomesDefault;
}

/** Deletes a license file. Clears the default when it was the default. Returns whether it was. */
export function deleteLicense(name: string): boolean {
	rmSync(licenseFile(assertLicenseName(name)), { force: true });
	if (loadGlobalConfig().license.default !== name) return false;
	setDefaultLicense(undefined);
	return true;
}

/** Environments with `license: <name>` in env.yaml. */
export function envsUsingLicense(name: string): string[] {
	return listEnvNames().filter((env) => {
		try {
			return loadTopology(envPaths(env).envYaml).license === name;
		} catch {
			return false;
		}
	});
}

/** For example `prod · cert · tenant 1`. */
export function describeLicense(name: string): string {
	let values: Record<string, string>;
	try {
		values = readLicenseValues(name);
	} catch {
		return `${name} · unreadable`;
	}
	const license = licenseFromValues(values);
	if (!license) return `${name} · invalid`;
	return `${name} · ${kindLabel(license.kind)} · tenant ${license.tenantId || '?'}`;
}
