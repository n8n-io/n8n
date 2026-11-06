// Read the codespace identity from the files Codespaces writes, not from the env.
// Codespaces gives CODESPACE_NAME and GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN to
// VS Code sessions only. In this compose-based config, other processes can get an
// empty copy. The files in /workspaces/.codespaces/shared are always correct.
import { readFileSync } from 'node:fs';

const SHARED = '/workspaces/.codespaces/shared';

function readShared(dir, file) {
	try {
		return readFileSync(`${dir}/${file}`, 'utf8');
	} catch {
		return '';
	}
}

/** Returns a codespace variable, or undefined if it is missing or empty. */
export function codespaceEnv(name, sharedDir = SHARED) {
	if (process.env[name]) return process.env[name];

	try {
		const fromJson = JSON.parse(readShared(sharedDir, 'environment-variables.json') || '{}')[name];
		if (fromJson) return fromJson;
	} catch (error) {
		console.warn(`Ignoring ${sharedDir}/environment-variables.json: ${error.message}`);
	}

	// The file has KEY=VALUE lines. Use the last line, as a shell does.
	const line = readShared(sharedDir, '.env')
		.split('\n')
		.findLast((l) => l.startsWith(`${name}=`));
	return line?.slice(name.length + 1).trim() || undefined;
}

/**
 * Returns a Codespaces user or repository secret, or undefined.
 *
 * Secrets live in a different file from `codespaceEnv`'s, base64-encoded, and
 * Codespaces exports them to VS Code sessions only. A tmux or ssh shell gets
 * nothing. `.devcontainer/codespaces/codespaces-env.sh` decodes them for
 * interactive bash; this is the same rule for a Node caller, so keep the two in
 * step: skip a key with a character outside [A-Za-z0-9_], skip a value that does
 * not decode, and let the last line win.
 */
export function codespaceSecret(name, sharedDir = SHARED) {
	if (process.env[name]) return process.env[name];
	if (/[^A-Za-z0-9_]/.test(name)) return undefined;

	const line = readShared(sharedDir, '.env-secrets')
		.split('\n')
		.findLast((l) => l.startsWith(`${name}=`));
	if (!line) return undefined;

	try {
		return Buffer.from(line.slice(name.length + 1).trim(), 'base64').toString('utf8') || undefined;
	} catch {
		return undefined;
	}
}

export const codespaceName = (sharedDir) => codespaceEnv('CODESPACE_NAME', sharedDir);

export const forwardingDomain = (sharedDir) =>
	codespaceEnv('GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN', sharedDir) ?? 'app.github.dev';
