#!/usr/bin/env node
// Manage cloud agent sessions: one Codespace per developer, one tmux session +
// git worktree per agent, so parallel sessions never trample each other's tree.
// Requires `gh` with the codespace scope (gh auth refresh -s codespace).
//
//   pnpm session            attach the default session (main checkout, /workspaces/n8n)
//   pnpm session <name>     attach a named session in its own worktree (/workspaces/wt-<name>)
//   pnpm session ls         list codespaces and the tmux sessions inside
//   pnpm session tunnel [port…]  forward ports (default 5678, 8080) to localhost; Ctrl-C to stop
//   pnpm session stop       stop the codespace (compute billing stops; disk survives)
//   pnpm session rm         delete the codespace
import { execFileSync, spawnSync } from 'node:child_process';

const REPO = 'n8n-io/n8n';
const DEVCONTAINER = '.devcontainer/codespaces/devcontainer.json';
const MACHINE = process.env.CODESPACE_MACHINE ?? 'premiumLinux'; // 8-core/32GB
const FALLBACK_MACHINE = 'standardLinux32gb'; // 4-core/16GB, until org policy allows bigger

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
		const create = (machine) =>
			gh('codespace', 'create', '-R', REPO, '--devcontainer-path', DEVCONTAINER, '-m', machine);
		let name;
		try {
			name = create(MACHINE);
		} catch {
			console.log(`Machine type ${MACHINE} unavailable — falling back to ${FALLBACK_MACHINE}`);
			name = create(FALLBACK_MACHINE);
		}
		cs = { name };
	}
	return cs.name;
}

// Worktrees share the pnpm store but not the turbo cache; a shared TURBO_CACHE_DIR
// (seeded from the main checkout) keeps new-worktree builds at cache-hit speed.
// No single quotes allowed here: the whole prelude rides inside tmux's '…' arg.
const CACHE = 'export TURBO_CACHE_DIR=/workspaces/.turbo-cache; [ -d "$TURBO_CACHE_DIR" ] || cp -r /workspaces/n8n/.turbo/cache "$TURBO_CACHE_DIR" 2>/dev/null || mkdir -p "$TURBO_CACHE_DIR"';

function remoteCommand(session, extraArgs) {
	const claude = `claude ${extraArgs}`.trim();
	if (session === 'agent') return `${CACHE}; cd /workspaces/n8n && ${claude}`;
	const wt = `/workspaces/wt-${session}`;
	const branch = `session/${session}`;
	return [
		CACHE,
		`if [ ! -d "${wt}" ]; then echo "Setting up worktree ${wt}…"`,
		`git -C /workspaces/n8n worktree add "${wt}" -b "${branch}" 2>/dev/null || git -C /workspaces/n8n worktree add "${wt}" "${branch}"`,
		`(cd "${wt}" && pnpm install); fi`,
		`cd "${wt}" && ${claude}`,
	].join('; ');
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
		console.log(`Forwarding ${ports.map((p) => `localhost:${p}`).join(', ')} from ${cs.name} — Ctrl-C to stop…`);
		// ssh -L over `gh codespace ports forward`: gh binds all interfaces (LAN-exposed),
		// ssh binds loopback only. ExitOnForwardFailure fails fast if a port is taken.
		const { status } = ghTty(
			'codespace', 'ssh', '-c', cs.name, '--', '-N', '-o', 'ExitOnForwardFailure=yes',
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
		console.log(`Attaching to session '${cmd}' on ${name} (detach: Ctrl-b d)…`);
		const { status } = ghTty(
			'codespace', 'ssh', '-c', name, '--', '-t',
			`tmux new -As ${cmd} '${remoteCommand(cmd, rest.join(' '))}'`,
		);
		process.exitCode = status ?? 1;
	}
}
