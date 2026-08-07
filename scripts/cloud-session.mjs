#!/usr/bin/env node
// Manage cloud agent sessions: one Codespace per developer, one tmux session
// per agent. Requires `gh` with the codespace scope (gh auth refresh -s codespace).
//
//   pnpm session            attach the default session (creates codespace/session as needed)
//   pnpm session <name>     attach a named session — parallel agents on the same box
//   pnpm session ls         list codespaces and the tmux sessions inside
//   pnpm session stop       stop the codespace (compute billing stops; disk survives)
//   pnpm session rm         delete the codespace
import { execFileSync, spawnSync } from 'node:child_process';

const REPO = 'n8n-io/n8n';
const DEVCONTAINER = '.devcontainer/codespaces/devcontainer.json';
const MACHINE = process.env.CODESPACE_MACHINE ?? 'standardLinux32gb';

const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8' }).trim();
const ghTty = (...args) => spawnSync('gh', args, { stdio: 'inherit' });

function findCodespace() {
	const list = JSON.parse(gh('codespace', 'list', '-R', REPO, '--json', 'name,state'));
	return list[0];
}

function ensureCodespace() {
	let cs = findCodespace();
	if (!cs) {
		console.log(`No codespace on ${REPO} — creating one (first build takes a while)…`);
		const name = gh(
			'codespace', 'create', '-R', REPO,
			'--devcontainer-path', DEVCONTAINER, '-m', MACHINE,
		);
		cs = { name, state: 'Provisioning' };
	}
	return cs.name;
}

const [cmd = 'agent', ...rest] = process.argv.slice(2);

switch (cmd) {
	case 'ls': {
		const cs = findCodespace();
		if (!cs) {
			console.log(`No codespace on ${REPO}. Run \`pnpm session\` to create one.`);
			break;
		}
		console.log(`${cs.name} [${cs.state}]`);
		if (cs.state === 'Available') {
			ghTty('codespace', 'ssh', '-c', cs.name, '--', 'tmux ls 2>/dev/null || echo "  no active sessions"');
		}
		break;
	}
	case 'stop':
	case 'rm': {
		const cs = findCodespace();
		if (!cs) break;
		if (cmd === 'stop') gh('codespace', 'stop', '-c', cs.name);
		else ghTty('codespace', 'delete', '-c', cs.name, '--force');
		console.log(`${cmd === 'stop' ? 'Stopped' : 'Deleted'} ${cs.name}`);
		break;
	}
	default: {
		// treat cmd as the session name; each name = an independent agent session
		const session = cmd;
		const name = ensureCodespace();
		console.log(`Attaching to session '${session}' on ${name} (detach: Ctrl-b d)…`);
		ghTty(
			'codespace', 'ssh', '-c', name, '--', '-t',
			`tmux new -As ${session} 'cd /workspaces/n8n && claude ${rest.join(' ')}'`,
		);
	}
}
