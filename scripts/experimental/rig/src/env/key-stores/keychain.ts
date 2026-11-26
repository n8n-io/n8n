import { displayPath } from '../../config/paths';
import { RigError } from '../../errors';
import { account, failure, type KeyStore, run, SERVICE } from './common';

/** The login keychain of macOS, through the `security` CLI. */
export const keychain: KeyStore = {
	label: 'macOS Keychain',
	location: () => `macOS Keychain, item "${SERVICE}" (${displayPath(account())})`,
	available: () => process.platform === 'darwin',
	read() {
		const result = run('security', ['find-generic-password', '-s', SERVICE, '-a', account(), '-w']);
		// 44: the item does not exist.
		if (result.status === 44) return undefined;
		if (result.error || result.status !== 0) {
			throw new RigError(
				`Cannot read the secrets key from the macOS Keychain: ${failure(result)}`,
				'Unlock the login keychain, then try again.',
			);
		}
		return result.stdout.trim();
	},
	write(hex) {
		// `security -i` reads the command from stdin, so the key is not in the process list.
		const command = `add-generic-password -U -s ${SERVICE} -a "${account()}" -l "${SERVICE} secrets key" -w ${hex}\n`;
		const result = run('security', ['-i'], command);
		if (result.error || result.status !== 0) {
			throw new RigError(`Cannot save the secrets key in the macOS Keychain: ${failure(result)}`);
		}
	},
	setupHint: 'The macOS Keychain is available only on macOS.',
};
