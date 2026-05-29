import { UnexpectedError } from './errors';
import type { ICredentialType, ICredentialTypes } from './interfaces';

/**
 * True when `candidate` is a version the type declares as supported.
 * Undeclared `version` means the type is implicitly v1 only.
 */
export function isDeclaredVersion(
	type: Pick<ICredentialType, 'version'>,
	candidate: number,
): boolean {
	if (type.version === undefined) return candidate === 1;
	if (typeof type.version === 'number') return candidate === type.version;
	if (type.version.length === 0) return false;
	return type.version.includes(candidate);
}

/**
 * Resolves the version a newly created credential should be persisted at.
 * Throws on malformed declarations (empty version array, or defaultVersion
 * not in the declared set) so misconfiguration fails loudly rather than
 * silently pinning credentials to an undeclared version.
 */
export function resolveDefaultVersion(
	type: Pick<ICredentialType, 'name' | 'version' | 'defaultVersion'>,
): number {
	if (Array.isArray(type.version) && type.version.length === 0) {
		throw new UnexpectedError(
			`Credential type "${type.name}" declares version as an empty array. ` +
				'Either omit version (implicit v1) or list at least one supported version.',
		);
	}
	if (type.defaultVersion !== undefined) {
		if (!isDeclaredVersion(type, type.defaultVersion)) {
			throw new UnexpectedError(
				`Credential type "${type.name}" declares defaultVersion ` +
					`${type.defaultVersion} which is not in its version declaration ` +
					`(${JSON.stringify(type.version ?? 1)}).`,
			);
		}
		return type.defaultVersion;
	}
	if (typeof type.version === 'number') return type.version;
	if (Array.isArray(type.version)) return Math.max(...type.version);
	return 1;
}

/**
 * Resolves the typeVersion for an update operation. Preserves the existing
 * value when the type is unchanged; re-resolves against the new type's
 * default when the type changes (since the existing value may not be a
 * declared version of the new type).
 */
export function resolveTypeVersionForUpdate(
	credentialTypes: ICredentialTypes,
	incomingType: string,
	existing: { type: string; typeVersion: number | null },
): number | null {
	if (incomingType === existing.type) return existing.typeVersion;
	const newType = credentialTypes.getByName(incomingType);
	const hasVersioning = newType.defaultVersion !== undefined || newType.version !== undefined;
	return hasVersioning ? resolveDefaultVersion(newType) : null;
}
