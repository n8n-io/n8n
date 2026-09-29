// Writes an OpenSSH host entry for the session Codespace, so tools that use the
// system ssh (the Claude Code desktop app, VS Code Remote-SSH, plain `ssh`) can
// connect by a fixed name.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const HOST_ALIAS = 'n8n-codespace';
const HOST_FILE = `${HOST_ALIAS}.conf`;
const INCLUDE_LINE = `Include ~/.ssh/${HOST_FILE}`;

/**
 * Replaces the host name in `gh codespace ssh --config` output with a fixed alias.
 * gh names the host `cs.<codespace>.<branch>`, so its name changes when the
 * checkout changes branch. A saved connection must not depend on that.
 */
export function aliasHostConfig(ghConfig, alias = HOST_ALIAS) {
	const hosts = ghConfig.match(/^Host .*$/gm) ?? [];
	if (hosts.length !== 1 || !/^\s*ProxyCommand /m.test(ghConfig)) {
		throw new Error(`Expected one host entry from gh codespace ssh --config, got ${hosts.length}`);
	}
	return ghConfig.replace(/^Host .*$/m, `Host ${alias}`).trimEnd() + '\n';
}

/**
 * Returns the ssh config with the Include line at the top, or undefined if the line
 * is already there. An Include after a Host block applies only to that block.
 */
export function withInclude(sshConfig, includeLine = INCLUDE_LINE) {
	if (sshConfig.split('\n').some((line) => line.trim() === includeLine)) return undefined;
	return `${includeLine}\n${sshConfig.length ? '\n' : ''}${sshConfig}`;
}

export function writeSshConfig(ghConfig, sshDir = join(homedir(), '.ssh')) {
	mkdirSync(sshDir, { recursive: true, mode: 0o700 });

	const hostPath = join(sshDir, HOST_FILE);
	writeFileSync(hostPath, aliasHostConfig(ghConfig), { mode: 0o600 });

	const configPath = join(sshDir, 'config');
	const current = existsSync(configPath) ? readFileSync(configPath, 'utf8') : '';
	const updated = withInclude(current);
	// The mode applies only when the file is new. An existing file keeps its mode.
	if (updated !== undefined) writeFileSync(configPath, updated, { mode: 0o600 });
	return { hostPath, configPath, includeAdded: updated !== undefined };
}
