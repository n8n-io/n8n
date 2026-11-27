import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { licenseChecks } from '../src/commands/doctor';
import { loadTopology, parseTopology, saveTopology } from '../src/config/env-yaml';
import { globalConfigFile, licenseFile, licensesDir } from '../src/config/paths';
import { envPaths, listEnvNames } from '../src/environment';
import {
	defaultLicense,
	deleteLicense,
	describeLicense,
	envsUsingLicense,
	inferLicenseKind,
	type License,
	licenseForNewEnv,
	listLicenses,
	readLicenseValues,
	setDefaultLicense,
	validateLicense,
	validateLicenseValues,
	writeLicense,
} from '../src/licenses';

const KEY = '0b2c5a8e-1f3d-4c6b-9a7e-2d4f6b8c0e1a';
const CERT = Buffer.from('{"license":"test"}').toString('base64');

const activation: License = { kind: 'activation-key', value: KEY, tenantId: '1' };
const cert: License = { kind: 'cert', value: CERT, tenantId: '2' };

function createEnv(name: string, license?: string) {
	const paths = envPaths(name);
	mkdirSync(paths.root, { recursive: true });
	saveTopology(paths.envYaml, parseTopology({ name, license }));
}

afterEach(() => {
	rmSync(licensesDir(), { recursive: true, force: true });
	rmSync(globalConfigFile(), { force: true });
	for (const name of listEnvNames()) rmSync(envPaths(name).root, { recursive: true, force: true });
});

describe('inferLicenseKind', () => {
	it('should find the kind from the format of the value', () => {
		expect(inferLicenseKind(KEY)).toBe('activation-key');
		expect(inferLicenseKind(KEY.toUpperCase())).toBe('activation-key');
		expect(inferLicenseKind(CERT)).toBe('cert');
		expect(inferLicenseKind('not base64!')).toBeUndefined();
	});
});

describe('validateLicense', () => {
	it('should accept a valid activation key and a valid cert', () => {
		expect(validateLicense(activation)).toEqual([]);
		expect(validateLicense({ ...cert, serverUrl: 'https://license.example.com/v1' })).toEqual([]);
	});

	it('should report each problem', () => {
		expect(validateLicense({ ...activation, value: 'not-a-uuid' })).toEqual([
			'The activation key is not a UUID.',
		]);
		expect(validateLicense({ ...cert, value: 'not base64!' })).toEqual(['The cert is not base64.']);
		expect(validateLicense({ ...cert, value: 'abcde' })).toEqual(['The cert is not base64.']);
		expect(validateLicense({ ...cert, value: 'abcdef=' })).toEqual(['The cert is not base64.']);
		expect(validateLicense({ ...activation, tenantId: '' })).toEqual([
			'N8N_LICENSE_TENANT_ID is missing.',
		]);
		expect(validateLicense({ ...activation, tenantId: '0' })).toEqual([
			'The tenant ID is not a positive integer.',
		]);
		expect(validateLicense({ ...activation, serverUrl: 'ftp://x' })).toEqual([
			'The server URL is not an http or https URL.',
		]);
	});

	it('should accept a cert in base64url without padding', () => {
		const value = CERT.replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
		expect(validateLicense({ ...cert, value })).toEqual([]);
	});

	it('should report a file with no key or with both keys', () => {
		expect(validateLicenseValues({ N8N_LICENSE_TENANT_ID: '1' })).toEqual([
			'It has no N8N_LICENSE_ACTIVATION_KEY and no N8N_LICENSE_CERT.',
		]);
		expect(
			validateLicenseValues({
				N8N_LICENSE_ACTIVATION_KEY: KEY,
				N8N_LICENSE_CERT: CERT,
				N8N_LICENSE_TENANT_ID: '1',
			}),
		).toEqual(['It has both N8N_LICENSE_ACTIVATION_KEY and N8N_LICENSE_CERT.']);
	});
});

describe('writeLicense', () => {
	it('should encrypt every value in a private file', () => {
		writeLicense('prod', { ...cert, serverUrl: 'https://license.example.com/v1' });

		const text = readFileSync(licenseFile('prod'), 'utf8');
		expect(text).not.toContain(CERT);
		expect(text).toMatch(/^N8N_LICENSE_TENANT_ID=enc:v1:/m);
		expect(text).toMatch(/^N8N_LICENSE_SERVER_URL=enc:v1:/m);
		expect(statSync(licenseFile('prod')).mode & 0o777).toBe(0o600);
		expect(readLicenseValues('prod')).toEqual({
			N8N_LICENSE_CERT: CERT,
			N8N_LICENSE_TENANT_ID: '2',
			N8N_LICENSE_SERVER_URL: 'https://license.example.com/v1',
		});
	});

	it('should replace the keys of a license with the same name', () => {
		writeLicense('prod', cert);
		writeLicense('prod', activation);
		expect(readLicenseValues('prod')).toEqual({
			N8N_LICENSE_ACTIVATION_KEY: KEY,
			N8N_LICENSE_TENANT_ID: '1',
		});
	});

	it('should keep the old license when the replacement fails', () => {
		writeLicense('prod', cert);
		const before = readFileSync(licenseFile('prod'), 'utf8');
		vi.stubEnv('RIG_SECRETS_BACKEND', 'not-a-backend');
		try {
			expect(() => writeLicense('prod', activation)).toThrow();
		} finally {
			vi.unstubAllEnvs();
		}
		expect(readFileSync(licenseFile('prod'), 'utf8')).toBe(before);
	});

	it('should make the first license the default', () => {
		expect(writeLicense('a', activation)).toBe(true);
		expect(writeLicense('b', cert)).toBe(false);
		expect(defaultLicense()).toBe('a');
		expect(writeLicense('c', cert, { makeDefault: true })).toBe(true);
		expect(defaultLicense()).toBe('c');
		expect(listLicenses()).toEqual(['a', 'b', 'c']);
	});
});

describe('deleteLicense', () => {
	it('should clear the default when it deletes the default license', () => {
		writeLicense('a', activation);
		writeLicense('b', cert);
		expect(deleteLicense('b')).toBe(false);
		expect(defaultLicense()).toBe('a');
		expect(deleteLicense('a')).toBe(true);
		expect(defaultLicense()).toBeUndefined();
		expect(listLicenses()).toEqual([]);
	});
});

describe('licenseForNewEnv', () => {
	it('should use the default license when no license is given', () => {
		expect(licenseForNewEnv(undefined)).toBeUndefined();
		writeLicense('a', activation);
		writeLicense('b', cert);
		expect(licenseForNewEnv(undefined)).toBe('a');
		expect(licenseForNewEnv('b')).toBe('b');
		expect(licenseForNewEnv(false)).toBeUndefined();
	});

	it('should refuse an unknown license', () => {
		writeLicense('prod', activation);
		expect(() => licenseForNewEnv('prd')).toThrow('License "prd" does not exist.');
	});

	it('should keep the license of an environment when the default changes', () => {
		writeLicense('a', activation);
		writeLicense('b', cert);
		createEnv('one', licenseForNewEnv(undefined));
		setDefaultLicense('b');
		expect(loadTopology(envPaths('one').envYaml).license).toBe('a');
	});
});

describe('listLicenses', () => {
	it('should ignore a directory with a license name', () => {
		writeLicense('a', activation);
		mkdirSync(licenseFile('b'), { recursive: true });
		expect(listLicenses()).toEqual(['a']);
		expect(() => licenseForNewEnv('b')).toThrow('License "b" does not exist.');
	});
});

describe('licenseChecks', () => {
	it('should warn when the default license is not valid', () => {
		writeLicense('prod', { ...activation, value: 'not-a-uuid' });
		expect(licenseChecks(undefined)).toEqual([
			expect.objectContaining({
				status: 'warn',
				label: 'Default',
				detail: 'prod is not valid: The activation key is not a UUID.',
			}),
		]);
	});
});

describe('describeLicense', () => {
	it('should describe a license that rig cannot read', () => {
		writeLicense('prod', activation);
		writeFileSync(licenseFile('prod'), 'N8N_LICENSE_ACTIVATION_KEY=enc:v1:AAAA\n');
		expect(describeLicense('prod')).toBe('prod · unreadable');
	});
});

describe('envsUsingLicense', () => {
	it('should list the environments that refer to the license', () => {
		writeLicense('a', activation);
		createEnv('one', 'a');
		createEnv('two');
		createEnv('three', 'a');
		expect(envsUsingLicense('a')).toEqual(['one', 'three']);
		expect(envsUsingLicense('b')).toEqual([]);
	});
});
