import { CREDENTIAL_BLANKING_VALUE, CREDENTIAL_EMPTY_VALUE } from './constants';
import type { ICredentialDataDecryptedObject } from './interfaces';

/**
 * True when `value` is a credential redaction sentinel, including the
 * `=`-prefixed form produced by toggling a redacted password field into
 * expression mode.
 */
export function isCredentialSentinelValue(value: unknown): boolean {
	if (typeof value !== 'string') return false;
	const bare = value.startsWith('=') ? value.slice(1) : value;
	return bare === CREDENTIAL_BLANKING_VALUE || bare === CREDENTIAL_EMPTY_VALUE;
}

/**
 * Replace redaction sentinels with empty strings so they cannot be persisted
 * as the real secret (create has no saved value to restore from).
 */
export function stripCredentialSentinels(
	data: ICredentialDataDecryptedObject,
): ICredentialDataDecryptedObject {
	return stripSentinelValue(data) as ICredentialDataDecryptedObject;
}

function stripSentinelValue(value: unknown): unknown {
	if (isCredentialSentinelValue(value)) return '';
	if (Array.isArray(value)) return value.map(stripSentinelValue);
	if (value !== null && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value).map(([key, nested]) => [key, stripSentinelValue(nested)]),
		);
	}
	return value;
}
