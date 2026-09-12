/**
 * Return true when HTTP Request should compile Credential Expired When.
 * Empty, false, and the literal "false" keep the default 401 rules.
 */
export function isCredentialExpiredWhenSet(raw: unknown): raw is string | true {
	if (raw === true || raw === 'true') {
		return true;
	}

	return typeof raw === 'string' && raw !== '' && raw !== 'false';
}
