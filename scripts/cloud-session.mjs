#!/usr/bin/env node
// Manage cloud agent sessions: one Codespace per developer, one tmux session +
// git worktree per agent, so parallel sessions never trample each other's tree.
// Requires `gh` with the codespace scope (gh auth refresh -s codespace).
//
//   pnpm session                   attach Claude Code in the main checkout
//   pnpm session <name>            attach Claude Code in a separate worktree
//   pnpm session:shell [name]      attach a shell
//   pnpm session:opencode [name]   attach OpenCode in auto mode
//   pnpm session ls                list Codespaces and tmux sessions
//   pnpm session tunnel [port…]    forward ports to localhost
//   pnpm session stop              stop the Codespace
//   pnpm session rm                delete the Codespace
import { execFileSync, spawnSync } from 'node:child_process';

import { MARKETPLACE, PLUGINS } from '../.devcontainer/codespaces/plugins.mjs';

const REPO = 'n8n-io/n8n';
const DEVCONTAINER = '.devcontainer/codespaces/devcontainer.json';
// Keep scripted sessions fast. The dev container also permits smaller Codespaces.
const MACHINE = 'premiumLinux';

const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8' }).trim();
const ghTty = (...args) => spawnSync('gh', args, { stdio: 'inherit' });

function findCodespace(retry = false) {
	try {
		const list = JSON.parse(gh('codespace', 'list', '-R', REPO, '--json', 'name,state'));
		return list[0];
	} catch (ex) {
		if (ex.message.includes('This API operation needs the "codespace" scope') && !retry) {
			requestCodespaceScope();
			return findCodespace(true);
		} else {
			throw new Error(ex.message);
		}
	}
}

function requestCodespaceScope() {
	console.log('Requesting codespace scope');
	ghTty('auth', 'refresh', '-h', 'github.com', '-s', 'codespace');
}

function ensureCodespace() {
	const existing = findCodespace();
	if (existing) return existing.name;

	console.log(`No codespace on ${REPO} — creating one (first build takes a while)…`);
	// Run interactive. The devcontainer requests access to the private skills repo,
	// so gh prints an authorization URL and waits. A captured run cannot answer it.
	const { status } = ghTty(
		'codespace',
		'create',
		'-R',
		REPO,
		'--devcontainer-path',
		DEVCONTAINER,
		'-m',
		MACHINE,
	);
	if (status !== 0) {
		console.error('Codespace create failed. Authorize the permissions prompt above, then retry.');
		process.exit(1);
	}
	const created = findCodespace();
	if (!created) {
		console.error('Created a codespace but could not find it — run `pnpm session ls`.');
		process.exit(1);
	}
	return created.name;
}

// These values run inside a single-quoted tmux argument. Do not use single quotes.
// tmux does not start a login shell. Load shared secrets before each tool starts.
// Remove worker credentials because interactive tools do not use them.
const SESSION_SECRETS =
	'. /usr/local/lib/codespaces-env.sh 2>/dev/null || true; unset AGENT_WORKER_TOKEN N8N_DEQUEUE_URL SLACK_BOT_TOKEN';
const OPENCODE_CONFIG =
	'export OPENCODE_CONFIG_CONTENT="{\\"provider\\":{\\"openrouter\\":{\\"options\\":{\\"apiKey\\":\\"{env:OPENROUTER_API_KEY}\\"}}}}"';
// Worktrees share the pnpm store but not the turbo cache; a shared TURBO_CACHE_DIR
// (seeded from the main checkout) keeps new-worktree builds at cache-hit speed.
const CACHE =
	'export TURBO_CACHE_DIR=/workspaces/.turbo-cache; [ -d "$TURBO_CACHE_DIR" ] || cp -r /workspaces/n8n/.turbo/cache "$TURBO_CACHE_DIR" 2>/dev/null || mkdir -p "$TURBO_CACHE_DIR"';
// On a freshly created codespace, post-start.mjs installs the skills plugins via a
// network clone that takes tens of seconds. If `claude` boots first it builds its
// skill registry before a plugin exists on disk, and /reload-plugins can't
// recover it in-process — so the first session silently loses those skills.
// Run the idempotent installs here to block until every plugin is on disk (a fast
// no-op once cached). Mirrors the env vars post-start.mjs sets for the private
// HTTPS clone; failures are tolerated so a plugin hiccup never blocks the session.
const ENSURE_PLUGINS = [
	'export CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1 CLAUDE_CODE_PLUGIN_KEEP_MARKETPLACE_ON_FAILURE=1',
	`claude plugin marketplace add ${MARKETPLACE} >/dev/null 2>&1 || true`,
	...PLUGINS.map((plugin) => `claude plugin install ${plugin} >/dev/null 2>&1 || true`),
].join('; ');

function remoteCommand(session, launcher, extraArgs) {
	const executable = launcher === 'opencode' ? 'opencode --auto' : launcher;
	const command =
		launcher === 'shell'
			? 'export N8N_SKIP_CODESPACE_SECRETS=1; exec "${SHELL:-/bin/bash}" -l'
			: `${executable} ${extraArgs}`.trim();
	const prelude = [
		SESSION_SECRETS,
		launcher === 'opencode' ? OPENCODE_CONFIG : 'unset OPENROUTER_API_KEY',
		CACHE,
		...(launcher === 'claude' ? [ENSURE_PLUGINS] : []),
	].join('; ');
	if (session === 'agent') return `${prelude}; cd /workspaces/n8n && ${command}`;
	const wt = `/workspaces/wt-${session}`;
	const branch = `session/${session}`;
	return [
		prelude,
		`if [ ! -d "${wt}" ]; then echo "Setting up worktree ${wt}…"`,
		`git -C /workspaces/n8n worktree add "${wt}" -b "${branch}" 2>/dev/null || git -C /workspaces/n8n worktree add "${wt}" "${branch}"`,
		`(cd "${wt}" && pnpm install); fi`,
		`cd "${wt}" && ${command}`,
	].join('; ');
}

const args = process.argv.slice(2);
let launcher = 'claude';
if (args[0] === '--shell') launcher = 'shell';
else if (args[0] === '--opencode') launcher = 'opencode';
if (launcher !== 'claude') args.shift();
const [cmd = 'agent', ...rest] = args;

switch (cmd) {
	case 'ls': {
		const cs = findCodespace();
		if (!cs) {
			console.log(`No codespace on ${REPO}. Run \`pnpm session\` to create one.`);
			break;
		}
		console.log(`${cs.name} [${cs.state}]`);
		if (cs.state === 'Available') {
			ghTty(
				'codespace',
				'ssh',
				'-c',
				cs.name,
				'--',
				'tmux ls 2>/dev/null || echo "  no active sessions"',
			);
		}
		break;
	}
	case 'tunnel': {
		// Local ports must match remote ones: the Vite dev UI (8080) points its API
		// base at localhost:5678 (N8N_PORT's default), so an asymmetric or partial
		// mapping breaks it.
		const ports = rest.length ? rest : ['5678', '8080'];
		if (ports.some((p) => !/^\d+$/.test(p) || +p < 1 || +p > 65535)) {
			console.error(`Ports must be 1-65535, got: ${ports.join(' ')}`);
			process.exit(1);
		}
		const cs = findCodespace();
		if (!cs) {
			console.log(`No codespace on ${REPO}. Run \`pnpm session\` first.`);
			break;
		}
		if (cs.state !== 'Available') {
			console.error(`${cs.name} is ${cs.state} — run \`pnpm session\` to start it first.`);
			process.exit(1);
		}
		console.log(
			`Forwarding ${ports.map((p) => `localhost:${p}`).join(', ')} from ${cs.name} — Ctrl-C to stop…`,
		);
		// ssh -L over `gh codespace ports forward`: gh binds all interfaces (LAN-exposed),
		// ssh binds loopback only. ExitOnForwardFailure fails fast if a port is taken.
		const { status } = ghTty(
			'codespace',
			'ssh',
			'-c',
			cs.name,
			'--',
			'-N',
			'-o',
			'ExitOnForwardFailure=yes',
			...ports.flatMap((p) => ['-L', `${p}:localhost:${p}`]),
		);
		process.exitCode = status ?? 1;
		break;
	}
	case 'stop':
	case 'rm': {
		const cs = findCodespace();
		if (!cs) break;
		if (cmd === 'stop') {
			gh('codespace', 'stop', '-c', cs.name);
		} else {
			const { status } = ghTty('codespace', 'delete', '-c', cs.name, '--force');
			if (status !== 0) process.exit(status ?? 1);
		}
		console.log(`${cmd === 'stop' ? 'Stopped' : 'Deleted'} ${cs.name}`);
		break;
	}
	default: {
		// treat cmd as the session name; each name = an independent agent in its own worktree
		if (!/^[\w-]+$/.test(cmd)) {
			console.error(`Invalid session name '${cmd}' — use letters, digits, - or _`);
			process.exit(1);
		}
		const name = ensureCodespace();
		const tmuxSession = launcher === 'claude' ? cmd : `${cmd}-${launcher}`;
		console.log(`Attaching to ${launcher} session '${tmuxSession}' on ${name} (detach: Ctrl-b d)…`);
		const { status } = ghTty(
			'codespace',
			'ssh',
			'-c',
			name,
			'--',
			'-t',
			`tmux new -As ${tmuxSession} '${remoteCommand(cmd, launcher, rest.join(' '))}'`,
		);
		process.exitCode = status ?? 1;
	}
}
