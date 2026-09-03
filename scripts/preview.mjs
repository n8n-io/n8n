#!/usr/bin/env node
// Preview instances for pull requests: one codespace per PR, created from the
// master prebuild, serving the PR head behind the org's GitHub auth.
// Requires `gh` with the codespace scope (gh auth refresh -s codespace).
//
//   pnpm preview up <pr>        create or start the box, then serve the PR head
//   pnpm preview refresh <pr>   move to the current PR head and restart
//   pnpm preview down <pr>      delete the box
//   pnpm preview ls             list preview boxes
//
//   --json       print {pr, sha, codespace, url} for a workflow to consume
//   --dry-run    resolve the PR and print the commands, touching nothing
import { execFileSync, spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

import { shareWithOrg } from './serve-ready.mjs';

const REPO = 'n8n-io/n8n';
// Must match a config that has a prebuild, or create takes ~20 min instead of a
// couple. Prebuilds are per-devcontainer-path, so a new config is cold until one is
// configured for it in repo settings and has run. Override to borrow another
// config's prebuild, e.g. PREVIEW_DEVCONTAINER=.devcontainer/codespaces/devcontainer.json
// with PREVIEW_MACHINE=premiumLinux, which is what that config's hostRequirements needs.
const DEVCONTAINER = process.env.PREVIEW_DEVCONTAINER ?? '.devcontainer/preview/devcontainer.json';
// The preview devcontainer asks for 2 cpus / 8gb / 32gb, which keeps the smallest
// type available. Set PREVIEW_MACHINE=standardLinux32gb to compare against 4 cores.
const MACHINE = process.env.PREVIEW_MACHINE ?? 'basicLinux32gb';
const IDLE_TIMEOUT = '30m';
const RETENTION_PERIOD = '24h';
// Only used to build the URL printed here. The in-box script reads the codespace's
// own N8N_PORT and prints the authoritative URL, so override both or neither.
const PORT = process.env.N8N_PORT ?? '5678';
const PREFIX = 'preview/pr-';
// GitHub hands VS Code a per-codespace forwarding domain, but it is not readable
// from here. Every box uses this one; the in-box script prints the resolved value.
const FORWARDING_DOMAIN = 'app.github.dev';

// The display name is the lookup key, so a preview can never be confused with a
// developer's own `pnpm session` box on the same repo.
const displayNameFor = (pr) => `${PREFIX}${pr}`;

const ghTty = (...args) => spawnSync('gh', args, { stdio: 'inherit' });

function fail(message) {
	console.error(message);
	process.exit(1);
}

function ghJson(args, retry = false) {
	try {
		return JSON.parse(execFileSync('gh', args, { encoding: 'utf8' }).trim());
	} catch (error) {
		if (!retry && error.message.includes('This API operation needs the "codespace" scope')) {
			console.log('Requesting codespace scope…');
			ghTty('auth', 'refresh', '-h', 'github.com', '-s', 'codespace');
			return ghJson(args, true);
		}
		throw new Error(error.message);
	}
}

const listPreviews = () =>
	ghJson(['codespace', 'list', '-R', REPO, '--json', 'name,displayName,state,lastUsedAt']).filter(
		(cs) => cs.displayName?.startsWith(PREFIX),
	);

// Match on the display name. `list[0]` would take whichever box comes first,
// including one that belongs to a developer's session.
const findPreview = (pr) => listPreviews().find((cs) => cs.displayName === displayNameFor(pr));

function prHead(pr) {
	const head = ghJson([
		'pr',
		'view',
		pr,
		'-R',
		REPO,
		'--json',
		'headRefName,headRefOid,isCrossRepository,state',
	]);
	if (head.isCrossRepository)
		fail(
			`PR #${pr} comes from a fork. A codespace's token is scoped to ${REPO}, so it cannot check out a fork head.`,
		);
	if (head.state !== 'OPEN') console.log(`Note: PR #${pr} is ${head.state}.`);
	return head;
}

// Check out the exact head SHA, not the branch tip: the branch can move while this
// runs, and the preview has to match the SHA the PR comment points at.
const serveCommand = (head) =>
	[
		'cd /workspaces/n8n',
		`git fetch origin ${head.headRefName}`,
		`git checkout --detach ${head.headRefOid}`,
		// Cheap when nothing changed. Skipping it is how a preview ends up running
		// against stale dependencies after a lockfile change.
		'pnpm install --frozen-lockfile',
		'pnpm preview:serve',
	].join(' && ');

const createArgs = (pr, head) => [
	'codespace',
	'create',
	'-R',
	REPO,
	'-b',
	head.headRefName,
	'-d',
	displayNameFor(pr),
	'--devcontainer-path',
	DEVCONTAINER,
	'-m',
	MACHINE,
	'--idle-timeout',
	IDLE_TIMEOUT,
	'--retention-period',
	RETENTION_PERIOD,
];

function report(pr, head, codespace, json, orgVisible = false) {
	const url = `https://${codespace}-${PORT}.${FORWARDING_DOMAIN}`;
	if (json)
		console.log(
			JSON.stringify({ pr: Number(pr), sha: head.headRefOid, codespace, url, orgVisible }),
		);
	else console.log(`\nPreview for PR #${pr}: ${url}${orgVisible ? ' (org-visible)' : ''}`);
}

// `gh codespace create` returns when the record exists, not when the box can accept
// a connection, and sshd lags the Available state by a few seconds more. Probe with a
// no-op so a connection problem never looks like a failed build.
async function waitForSsh(name, timeoutMs = 600_000) {
	const deadline = Date.now() + timeoutMs;
	let attempt = 0;
	let lastError = 'no attempt completed';
	while (Date.now() < deadline) {
		const probe = spawnSync('gh', ['codespace', 'ssh', '-c', name, '--', 'true'], {
			stdio: ['ignore', 'ignore', 'pipe'],
			encoding: 'utf8',
		});
		if (probe.status === 0) return;
		lastError = (probe.stderr ?? '').trim().split('\n').pop() || `exit ${probe.status}`;
		if (attempt++ === 0) console.log(`Waiting for ${name} to accept ssh…`);
		await sleep(5000);
	}
	fail(
		`${name} did not accept ssh within ${Math.round(timeoutMs / 1000)}s — last error: ${lastError}`,
	);
}

async function serve(pr, cs, head, { json, dryRun }) {
	const command = serveCommand(head);
	if (dryRun) {
		console.log(`Would ssh to ${cs.name} and run:\n  ${command}`);
		console.log(`Would then share port ${PORT} with the org.`);
		report(pr, head, cs.name, json);
		return;
	}

	await waitForSsh(cs.name);

	console.log(`Serving ${head.headRefOid.slice(0, 7)} on ${cs.name}…`);
	const { status } = ghTty('codespace', 'ssh', '-c', cs.name, '--', command);
	if (status !== 0) fail('Serving failed — see the output above.');

	// Share from here rather than inside the box: this gh already held the codespace
	// scope to create it, while the codespace's own token is only repo-scoped.
	// GitHub also makes every forwarded port private again at each container start.
	const share = shareWithOrg(PORT, cs.name);
	if (!share.shared)
		console.error(
			`Port ${PORT} is still private: ${share.error} — retry with \`gh codespace ports visibility ${PORT}:org -c ${cs.name}\``,
		);
	report(pr, head, cs.name, json, share.shared);
}

async function up(pr, options) {
	const head = prHead(pr);
	let cs = findPreview(pr);

	if (!cs) {
		if (options.dryRun) {
			console.log(`Would create a box for PR #${pr} (${head.headRefName}):`);
			console.log(`  gh ${createArgs(pr, head).join(' ')}`);
			console.log(`Then ssh to it and run:\n  ${serveCommand(head)}`);
			// No box yet, so there is no name and no URL to report.
			console.log('The URL is only known once the box exists.');
			return;
		}
		console.log(`Creating a preview box for PR #${pr} (${head.headRefName})…`);
		// Run interactive: the devcontainer asks for access to the private skills
		// repo, so gh prints an authorization URL and waits for an answer.
		const { status } = ghTty(...createArgs(pr, head));
		if (status !== 0)
			fail('Codespace create failed. Authorize the permissions prompt above, then retry.');
		cs = findPreview(pr);
		if (!cs) fail(`Created a box for PR #${pr} but could not find it — run \`pnpm preview ls\`.`);
	} else if (cs.state !== 'Available') {
		// There is no `gh codespace start`; ssh starts a stopped box.
		console.log(`${cs.name} is ${cs.state} — ssh will start it (~30-60 s)…`);
	}

	await serve(pr, cs, head, options);
}

async function refresh(pr, options) {
	const cs = findPreview(pr);
	if (!cs) fail(`No preview box for PR #${pr}. Run \`pnpm preview up ${pr}\` first.`);
	await serve(pr, cs, prHead(pr), options);
}

function down(pr, { dryRun }) {
	const cs = findPreview(pr);
	if (!cs) {
		console.log(`No preview box for PR #${pr}.`);
		return;
	}
	if (dryRun) {
		console.log(`Would delete ${cs.name} (PR #${pr}).`);
		return;
	}
	const { status } = ghTty('codespace', 'delete', '-c', cs.name, '--force');
	if (status !== 0) process.exit(status ?? 1);
	console.log(`Deleted ${cs.name} (PR #${pr})`);
}

function ls() {
	const previews = listPreviews();
	if (!previews.length) {
		console.log(`No preview boxes on ${REPO}.`);
		return;
	}
	for (const cs of previews)
		console.log(`${cs.displayName}\t${cs.state}\t${cs.name}\tlast used ${cs.lastUsedAt}`);
}

const args = process.argv.slice(2);
const options = { json: args.includes('--json'), dryRun: args.includes('--dry-run') };
const [cmd, pr] = args.filter((arg) => !arg.startsWith('--'));

const requirePr = () => {
	if (!/^\d+$/.test(pr ?? '')) fail(`Give a PR number, e.g. \`pnpm preview ${cmd} 1234\`.`);
	return pr;
};

switch (cmd) {
	case 'up':
		await up(requirePr(), options);
		break;
	case 'refresh':
		await refresh(requirePr(), options);
		break;
	case 'down':
		down(requirePr(), options);
		break;
	case 'ls':
		ls();
		break;
	default:
		fail('Usage: pnpm preview <up|refresh|down|ls> [pr] [--json] [--dry-run]');
}
