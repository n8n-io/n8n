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
//   --json       print {pr, sha, codespace, url} on stdout (progress goes to stderr)
//   --dry-run    resolve the PR and print the commands, touching nothing
import { execFileSync, spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

import { previewSlugs } from './preview-labels.mjs';
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

// The location defaults to the GH runner location, which might send it to
// use a region that doesn't have prebuilds set up. Hard code to Europe but allow overriding.
const LOCATION = process.env.PREVIEW_LOCATION || 'WestEurope';

const args = process.argv.slice(2);
const options = { json: args.includes('--json'), dryRun: args.includes('--dry-run') };
const [cmd, pr] = args.filter((arg) => !arg.startsWith('--'));

// The display name is the lookup key, so a preview can never be confused with a
// developer's own `pnpm session` box on the same repo.
const displayNameFor = (pr) => `${PREFIX}${pr}`;

// In --json mode stdout carries one machine-readable line and nothing else, so
// progress has to go to stderr. A caller parsing stdout gets no other output.
const log = (...parts) => (options.json ? console.error(...parts) : console.log(...parts));

// Send the child's stdout to our stderr in --json mode: `gh codespace ssh` inherits
// stdio, so the whole in-box build would otherwise land on the JSON channel.
const ghTty = (...args) =>
	spawnSync('gh', args, { stdio: ['inherit', options.json ? 2 : 'inherit', 'inherit'] });

function fail(message) {
	console.error(message);
	process.exit(1);
}

// A token failure names an endpoint, not a fix, and two of these are not about
// scopes at all. Map each to the thing that resolves it.
function tokenErrorHint(message) {
	const [org] = REPO.split('/');
	if (message.includes('forbids access via a personal access token (classic)'))
		return `${org} refuses classic tokens. Use a fine-grained one — see the CODESPACE_PREVIEW_TOKEN section of .github/WORKFLOWS.md.`;
	if (message.includes('Resource not accessible by personal access token')) {
		let missing = 'Codespaces (read and write)';
		if (message.includes('/codespaces/machines')) missing = 'Codespaces metadata (read)';
		else if (/\/(start|stop)\b/.test(message))
			missing = 'Codespaces lifecycle admin (read and write)';
		return `This fine-grained token is missing the ${missing} permission — see the CODESPACE_PREVIEW_TOKEN section of .github/WORKFLOWS.md.`;
	}
	return undefined;
}

function ghJson(args, retry = false) {
	try {
		return JSON.parse(execFileSync('gh', args, { encoding: 'utf8' }).trim());
	} catch (error) {
		if (!retry && error.message.includes('This API operation needs the "codespace" scope')) {
			// `gh auth refresh` opens a browser and waits for an answer, so it can only
			// run against a terminal. Without one it would hang the caller forever.
			if (!process.stdin.isTTY)
				fail(
					'This token has no codespace scope, and `gh auth refresh` needs a terminal. Supply a token that already carries the scope.',
				);
			log('Requesting codespace scope…');
			ghTty('auth', 'refresh', '-h', 'github.com', '-s', 'codespace');
			return ghJson(args, true);
		}
		const hint = tokenErrorHint(error.message);
		if (hint) fail(hint);
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
		'headRefName,headRefOid,isCrossRepository,state,labels',
	]);
	if (head.isCrossRepository)
		fail(
			`PR #${pr} comes from a fork. A codespace's token is scoped to ${REPO}, so it cannot check out a fork head.`,
		);
	if (head.state !== 'OPEN') log(`Note: PR #${pr} is ${head.state}.`);
	return head;
}

// Check out the exact head SHA, not the branch tip: the branch can move while this
// runs, and the preview has to match the SHA the PR comment points at.
const serveCommand = (head) => {
	// Pass the slugs, never the environment they stand for: this string reaches the
	// box's process list, and preview:enterprise resolves to a licence key there.
	const slugs = previewSlugs(head.labels);
	const labelEnv = slugs.length ? `PREVIEW_LABELS=${slugs.join(',')} ` : '';

	return [
		'cd /workspaces/n8n',
		`git fetch origin ${head.headRefName}`,
		`git checkout --detach ${head.headRefOid}`,
		// The serve script comes from the checked-out PR head, so a PR cut before this
		// tooling landed on master does not have it. Say so, instead of letting pnpm
		// report a missing script.
		// An `||` here would also fire when an earlier step in this && chain failed,
		// reporting the wrong cause. `if` keeps the test self-contained.
		'if [ ! -f scripts/preview-serve.mjs ]; then echo "This PR predates the preview tooling. Rebase it on master and retry."; exit 1; fi',
		// Cheap when nothing changed. Skipping it is how a preview ends up running
		// against stale dependencies after a lockfile change.
		'pnpm install --frozen-lockfile',
		`${labelEnv}pnpm preview:serve`,
	].join(' && ');
};

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
	'--location',
	LOCATION,
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
		if (attempt++ === 0) log(`Waiting for ${name} to accept ssh…`);
		await sleep(5000);
	}
	fail(
		`${name} did not accept ssh within ${Math.round(timeoutMs / 1000)}s — last error: ${lastError}`,
	);
}

// `waitForHealth` polls 127.0.0.1 inside the box, which goes green before the
// Codespaces agent notices the listener and registers the forward. Sharing a port
// that is not forwarded yet fails, so keep trying until it is.
async function shareWhenForwarded(port, name, timeoutMs = 120_000) {
	const deadline = Date.now() + timeoutMs;
	let share = shareWithOrg(port, name);
	let waited = false;
	while (!share.shared && Date.now() < deadline) {
		if (!waited) {
			log(`Waiting for port ${port} to be forwarded before sharing it…`);
			waited = true;
		}
		await sleep(3000);
		share = shareWithOrg(port, name);
	}
	return share;
}

async function serve(pr, cs, head, { json, dryRun }) {
	const command = serveCommand(head);
	if (dryRun) {
		log(`Would ssh to ${cs.name} and run:\n  ${command}`);
		log(`Would then share port ${PORT} with the org.`);
		report(pr, head, cs.name, json);
		return;
	}

	await waitForSsh(cs.name);

	log(`Serving ${head.headRefOid.slice(0, 7)} on ${cs.name}…`);
	const { status } = ghTty('codespace', 'ssh', '-c', cs.name, '--', command);
	if (status !== 0) fail('Serving failed — see the output above.');

	// Share from here rather than inside the box: this gh already held the codespace
	// scope to create it, while the codespace's own token is only repo-scoped.
	// GitHub also makes every forwarded port private again at each container start.
	const share = await shareWhenForwarded(PORT, cs.name);
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
			log(`Would create a box for PR #${pr} (${head.headRefName}):`);
			log(`  gh ${createArgs(pr, head).join(' ')}`);
			log(`Then ssh to it and run:\n  ${serveCommand(head)}`);
			// No box yet, so there is no name and no URL to report.
			log('The URL is only known once the box exists.');
			return;
		}
		log(`Creating a preview box for PR #${pr} (${head.headRefName})…`);
		// Run interactive: the devcontainer asks for access to the private skills
		// repo, so gh prints an authorization URL and waits for an answer.
		const { status } = ghTty(...createArgs(pr, head));
		if (status !== 0)
			fail('Codespace create failed. Authorize the permissions prompt above, then retry.');
		cs = findPreview(pr);
		if (!cs) fail(`Created a box for PR #${pr} but could not find it — run \`pnpm preview ls\`.`);
	} else if (cs.state !== 'Available') {
		// There is no `gh codespace start`; ssh starts a stopped box.
		log(`${cs.name} is ${cs.state} — ssh will start it (~30-60 s)…`);
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
		log(`No preview box for PR #${pr}.`);
		return;
	}
	if (dryRun) {
		log(`Would delete ${cs.name} (PR #${pr}).`);
		return;
	}
	const { status } = ghTty('codespace', 'delete', '-c', cs.name, '--force');
	if (status !== 0) process.exit(status ?? 1);
	log(`Deleted ${cs.name} (PR #${pr})`);
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

/**
 * Grabs the given PR number from command or tries to default to
 * the PR number of the branch currently checked out.
 * */
async function requirePr() {
	const noPrSpecified = !/^\d+$/.test(pr ?? '');

	if (pr && noPrSpecified) {
		fail(`Invalid PR number format. Usage example: \`pnpm preview ${cmd} 1234\``);
	}

	if (noPrSpecified) {
		// `gh pr view` exits non-zero when the branch has no PR, which is not an
		// error here: fall through to the message below instead of a stack trace.
		try {
			const prInfoForCurrentBranch = ghJson(['pr', 'view', '--json', 'number']);
			if (prInfoForCurrentBranch && Number.isInteger(prInfoForCurrentBranch.number)) {
				return prInfoForCurrentBranch.number;
			}
		} catch {}
	}

	if (noPrSpecified) {
		fail(
			`Give a PR number, e.g. \`pnpm preview ${cmd} 1234\` or check out a branch that has an open PR and run \`pnpm preview ${cmd}\`.`,
		);
	}
	return pr;
}

switch (cmd) {
	case 'up':
		await up(await requirePr(), options);
		break;
	case 'refresh':
		await refresh(await requirePr(), options);
		break;
	case 'down':
		down(await requirePr(), options);
		break;
	case 'ls':
		ls();
		break;
	default:
		fail('Usage: pnpm preview <up|refresh|down|ls> [pr] [--json] [--dry-run]');
}
