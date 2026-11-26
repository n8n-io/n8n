import type { EnvSource } from './resolve';

/**
 * Name endings of values that rig encrypts in every env file, not only in
 * secrets.env. The match is on the end of the name, so `_KEY_FILE`,
 * `_KEY_PREFIX`, and `_KEY_ID` do not match. A false match, for example
 * `N8N_SSL_KEY` (a path), only encrypts and masks a value.
 * `OVERWRITE_DATA` covers `CREDENTIALS_OVERWRITE_DATA`, which holds credentials.
 */
const SENSITIVE_KEY =
	/(?:^|_)(?:KEY|PASS|PASSWORD|PASSWD|PASSWORD_HASH|SECRET|TOKEN|LICENSE_CERT|OVERWRITE_DATA)$/;

export function isSensitiveKey(key: string): boolean {
	return SENSITIVE_KEY.test(key.toUpperCase());
}

/**
 * Whether output masks a value. rig's own values, for example the local
 * Postgres password, always show: they are fixed local values, not your secrets.
 */
export function isMaskedValue(key: string, source: EnvSource | undefined): boolean {
	if (!source || source.layer === 'managed' || source.layer === 'default') return false;
	return source.layer === 'secrets' || isSensitiveKey(key);
}
