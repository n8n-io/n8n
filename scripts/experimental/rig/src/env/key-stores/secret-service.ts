import { displayPath } from '../../config/paths';
import { RigError } from '../../errors';
import { account, failure, type KeyStore, run, SERVICE } from './common';

let available: boolean | undefined;

/** For tests: check the Secret Service again on the next use. */
export function resetSecretServiceCheck(): void {
	available = undefined;
}

function lookup() {
	return run('secret-tool', ['lookup', 'service', SERVICE, 'account', account()]);
}

/** The freedesktop Secret Service on Linux, through the `secret-tool` CLI. */
export const secretService: KeyStore = {
	label: 'Secret Service',
	location: () => `Secret Service, service "${SERVICE}" (${displayPath(account())})`,
	available() {
		if (process.platform !== 'linux') return false;
		if (available === undefined) {
			const result = lookup();
			// Exit code 1 without a message means "not found". A message means no keyring.
			available =
				!result.error &&
				(result.status === 0 || (result.status === 1 && result.stderr.trim() === ''));
		}
		return available;
	},
	read() {
		const result = lookup();
		if (result.status === 1 && result.stderr.trim() === '') return undefined;
		if (result.error || result.status !== 0) {
			throw new RigError(
				`Cannot read the secrets key from the Secret Service: ${failure(result)}`,
				'Unlock your keyring, then try again.',
			);
		}
		return result.stdout.trim();
	},
	write(hex) {
		// secret-tool reads the secret from stdin.
		const result = run(
			'secret-tool',
			['store', `--label=${SERVICE} secrets key`, 'service', SERVICE, 'account', account()],
			hex,
		);
		if (result.error || result.status !== 0) {
			throw new RigError(`Cannot save the secrets key in the Secret Service: ${failure(result)}`);
		}
	},
	setupHint:
		'Install secret-tool (libsecret-tools or libsecret) and a keyring such as GNOME Keyring or KWallet, and log in to a desktop session.',
};
