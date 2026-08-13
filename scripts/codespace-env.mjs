// Read the codespace identity from the files Codespaces writes, not from the env.
// Codespaces gives CODESPACE_NAME and GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN to
// VS Code sessions only. In this compose-based config, other processes can get an
// empty copy. The files in /workspaces/.codespaces/shared are always correct.
import { readFileSync } from 'node:fs';

const SHARED = '/workspaces/.codespaces/shared';

function readShared(file) {
	try {
		return readFileSync(`${SHARED}/${file}`, 'utf8');
	} catch {
		return '';
	}
}

/** Returns a codespace variable, or undefined if it is missing or empty. */
export function codespaceEnv(name) {
	if (process.env[name]) return process.env[name];

	try {
		const fromJson = JSON.parse(readShared('environment-variables.json') || '{}')[name];
		if (fromJson) return fromJson;
	} catch {}

	// The file has KEY=VALUE lines. Use the last line, as a shell does.
	const line = readShared('.env')
		.split('\n')
		.findLast((l) => l.startsWith(`${name}=`));
	return line?.slice(name.length + 1).trim() || undefined;
}

export const codespaceName = () => codespaceEnv('CODESPACE_NAME');

export const forwardingDomain = () =>
	codespaceEnv('GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN') ?? 'app.github.dev';
