import {
	isDeclaredVersion,
	resolveDefaultVersion,
	resolveTypeVersionForCreate,
	resolveTypeVersionForUpdate,
} from '../src/credential-versioning';
import { UnexpectedError } from '../src/errors';
import type { ICredentialType, ICredentialTypes } from '../src/interfaces';

type VersionInput = Pick<ICredentialType, 'name' | 'version' | 'defaultVersion'>;

const credentialType = (overrides: Partial<VersionInput>): VersionInput => ({
	name: 'test',
	...overrides,
});

describe('isDeclaredVersion', () => {
	it('accepts only 1 when version is undefined', () => {
		const type = credentialType({});
		expect(isDeclaredVersion(type, 1)).toBe(true);
		expect(isDeclaredVersion(type, 2)).toBe(false);
	});

	it('matches scalar version exactly', () => {
		const type = credentialType({ version: 2 });
		expect(isDeclaredVersion(type, 2)).toBe(true);
		expect(isDeclaredVersion(type, 1)).toBe(false);
	});

	it('matches any member of an array version', () => {
		const type = credentialType({ version: [1, 1.1, 2] });
		expect(isDeclaredVersion(type, 1)).toBe(true);
		expect(isDeclaredVersion(type, 1.1)).toBe(true);
		expect(isDeclaredVersion(type, 2)).toBe(true);
		expect(isDeclaredVersion(type, 3)).toBe(false);
	});

	it('returns false for any candidate when version is an empty array', () => {
		const type = credentialType({ version: [] });
		expect(isDeclaredVersion(type, 1)).toBe(false);
	});
});

describe('resolveDefaultVersion', () => {
	it('returns 1 when neither version nor defaultVersion is declared', () => {
		expect(resolveDefaultVersion(credentialType({}))).toBe(1);
	});

	it('returns the scalar version when only version is declared', () => {
		expect(resolveDefaultVersion(credentialType({ version: 2 }))).toBe(2);
	});

	it('returns the max of an array version when no defaultVersion is set', () => {
		expect(resolveDefaultVersion(credentialType({ version: [1, 1.1, 2] }))).toBe(2);
	});

	it('returns the explicit defaultVersion when declared and valid', () => {
		expect(resolveDefaultVersion(credentialType({ version: [1, 2], defaultVersion: 1 }))).toBe(1);
		expect(resolveDefaultVersion(credentialType({ version: 2, defaultVersion: 2 }))).toBe(2);
	});

	it('throws when defaultVersion is not in the declared version array', () => {
		expect(() =>
			resolveDefaultVersion(credentialType({ version: [1, 2], defaultVersion: 3 })),
		).toThrow(UnexpectedError);
	});

	it('throws when defaultVersion does not match a scalar version', () => {
		expect(() => resolveDefaultVersion(credentialType({ version: 1, defaultVersion: 2 }))).toThrow(
			UnexpectedError,
		);
	});

	it('throws when version is an empty array', () => {
		expect(() => resolveDefaultVersion(credentialType({ version: [] }))).toThrow(UnexpectedError);
	});

	it('error message identifies the credential type', () => {
		expect(() =>
			resolveDefaultVersion(credentialType({ name: 'mycreds', version: [1], defaultVersion: 5 })),
		).toThrow(/mycreds/);
	});
});

describe('resolveTypeVersionForCreate', () => {
	it('returns null for unversioned types', () => {
		expect(resolveTypeVersionForCreate(credentialType({}))).toBeNull();
	});

	it('returns the default version for versioned types', () => {
		expect(resolveTypeVersionForCreate(credentialType({ version: 2 }))).toBe(2);
		expect(resolveTypeVersionForCreate(credentialType({ version: [1, 2] }))).toBe(2);
		expect(
			resolveTypeVersionForCreate(credentialType({ version: [1, 2], defaultVersion: 1 })),
		).toBe(1);
	});

	it('throws when defaultVersion is set without a matching `version` declaration', () => {
		// `defaultVersion: 3` with implicit v1 is misconfigured — same loud
		// failure mode as `resolveDefaultVersion`.
		expect(() => resolveTypeVersionForCreate(credentialType({ defaultVersion: 3 }))).toThrow();
	});
});

describe('resolveTypeVersionForUpdate', () => {
	const versionedType = { name: 'newType', version: [1, 2], defaultVersion: 2 } as ICredentialType;
	const unversionedType = { name: 'plainType' } as ICredentialType;

	const credentialTypes = (returned: ICredentialType): ICredentialTypes =>
		({
			getByName: () => returned,
		}) as unknown as ICredentialTypes;

	it('preserves typeVersion when the type does not change', () => {
		const result = resolveTypeVersionForUpdate(credentialTypes(versionedType), 'same', {
			type: 'same',
			typeVersion: 1,
		});
		expect(result).toBe(1);
	});

	it('preserves null typeVersion when the type does not change', () => {
		const result = resolveTypeVersionForUpdate(credentialTypes(versionedType), 'same', {
			type: 'same',
			typeVersion: null,
		});
		expect(result).toBeNull();
	});

	it('resolves to the new type default when the type changes to a versioned type', () => {
		const result = resolveTypeVersionForUpdate(credentialTypes(versionedType), 'newType', {
			type: 'oldType',
			typeVersion: 1,
		});
		expect(result).toBe(2);
	});

	it('resolves to null when the type changes to an unversioned type', () => {
		const result = resolveTypeVersionForUpdate(credentialTypes(unversionedType), 'plainType', {
			type: 'oldType',
			typeVersion: 2,
		});
		expect(result).toBeNull();
	});
});
