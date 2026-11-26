import { chmodSync, existsSync, readFileSync } from 'node:fs';

import { displayPath, secretsKeyFile } from '../../config/paths';
import { type KeyStore, writePrivate } from './common';

/** A 0600 file in the config dir. The fallback when there is no OS keystore. */
export const keyFile: KeyStore = {
	label: 'key file',
	location: () => `key file ${displayPath(secretsKeyFile())}`,
	available: () => true,
	read() {
		const file = secretsKeyFile();
		if (!existsSync(file)) return undefined;
		chmodSync(file, 0o600);
		return readFileSync(file, 'utf8').trim();
	},
	write(hex) {
		writePrivate(secretsKeyFile(), `${hex}\n`);
	},
	setupHint: '',
};
