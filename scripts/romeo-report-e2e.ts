/**
 * End-to-end demo: build Romeo's weekly activity report using @n8n/sdk.
 *
 * Pipeline (everything goes through the running n8n Hub):
 *   1. Resolve credentials   — GET /rest/credentials, pick Slack + GitHub by type
 *   2. Discover Romeo        — n8n.slack.user.getAll, match on display name
 *   3. GitHub activity       — n8n.httpRequest → GitHub events API (last 7 days)
 *   4. Slack activity        — n8n.slack.message.search → his messages since 2026-05-04
 *   5. Compose Block Kit     — pure local transform over the fetched data
 *   6. Deliver               — n8n.slack.message.post → DM the report to ourselves
 *
 * Run:
 *   N8N_URL=http://localhost:5678 N8N_TOKEN=<pat> pnpm tsx scripts/romeo-report-e2e.ts
 *
 * Defaults read from ~/.n8n-cli/config.json when env vars are missing.
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { createClient, type ExecutionResult } from '../packages/@n8n/sdk/src/index';

// ──────────────────────────────────────────────────────────────────
// Config
// ──────────────────────────────────────────────────────────────────

const SELF_SLACK_USER_ID = 'U09GV6R3QUX';
const ROMEO_GITHUB_LOGIN = 'romeobalta';
const ROMEO_DISPLAY_NAME = 'Romeo';
const ROMEO_REAL_NAME = 'Romeo Balta';
const REPORT_WINDOW_START = '2026-05-04';

function resolveConnection(): { baseUrl: string; token: string } {
	if (process.env.N8N_URL && process.env.N8N_TOKEN) {
		return { baseUrl: process.env.N8N_URL, token: process.env.N8N_TOKEN };
	}
	const path = join(homedir(), '.n8n-cli', 'config.json');
	const cfg = JSON.parse(readFileSync(path, 'utf-8')) as { url?: string; apiKey?: string };
	const baseUrl = process.env.N8N_URL ?? cfg.url;
	const token = process.env.N8N_TOKEN ?? cfg.apiKey;
	if (!baseUrl || !token) throw new Error('Missing N8N_URL / N8N_TOKEN and no ~/.n8n-cli/config.json');
	return { baseUrl, token };
}

const { baseUrl, token } = resolveConnection();

// ──────────────────────────────────────────────────────────────────
// SDK client (typed adapter for the calls we make in this demo)
// ──────────────────────────────────────────────────────────────────

interface DemoApi {
	httpRequest: (args: Record<string, unknown>) => Promise<ExecutionResult<unknown>>;
	slack: {
		user: {
			getAll: (args: Record<string, unknown>) => Promise<ExecutionResult<unknown>>;
		};
		message: {
			search: (args: Record<string, unknown>) => Promise<ExecutionResult<unknown>>;
			post: (args: Record<string, unknown>) => Promise<ExecutionResult<unknown>>;
		};
	};
}

// Override the auto-generated UUID with a human-readable label so the four
// resulting executions are easy to spot when grouped in the UI.
const sessionId =
	process.env.ROMEO_SDK_SESSION ??
	`romeo-sdk-${new Date().toISOString().replace(/[:.]/g, '-')}`;
console.log(`session: ${sessionId}`);

const n8n = createClient({
	baseUrl,
	token,
	caller: { kind: 'sdk', name: 'romeo-report', sessionId },
}) as unknown as DemoApi;

// ──────────────────────────────────────────────────────────────────
// Step 1 — Resolve credentials via /rest/credentials
// ──────────────────────────────────────────────────────────────────

interface CredentialSummary {
	id: string;
	name: string;
	type: string;
}

async function listCredentials(): Promise<CredentialSummary[]> {
	const res = await fetch(new URL('/rest/credentials', baseUrl), {
		headers: { 'X-N8N-API-KEY': token, Accept: 'application/json' },
	});
	if (!res.ok) throw new Error(`GET /rest/credentials failed: ${res.status}`);
	const body = (await res.json()) as { data: CredentialSummary[] } | CredentialSummary[];
	return Array.isArray(body) ? body : body.data;
}

function pickByType(creds: CredentialSummary[], type: string): CredentialSummary {
	const match = creds.find((c) => c.type === type);
	if (!match) throw new Error(`No credential of type "${type}" connected to this n8n instance.`);
	return match;
}

// ──────────────────────────────────────────────────────────────────
// Step 2 — Discover Romeo on Slack
// ──────────────────────────────────────────────────────────────────

interface SlackUserLite {
	id: string;
	name: string;
	real_name?: string;
	profile?: { display_name?: string; real_name?: string; email?: string; title?: string };
}

async function findRomeo(slackCredId: string): Promise<SlackUserLite> {
	const result = await n8n.slack.user.getAll({
		credentialId: slackCredId,
		authentication: 'oAuth2',
		returnAll: true,
	});
	const items = asArray<SlackUserLite>(result.output);
	const match = items.find((u) => {
		const dn = u.profile?.display_name ?? '';
		const rn = u.profile?.real_name ?? u.real_name ?? '';
		return dn === ROMEO_DISPLAY_NAME || rn === ROMEO_REAL_NAME;
	});
	if (!match) throw new Error(`Could not find Slack user "${ROMEO_REAL_NAME}" among ${items.length} users.`);
	return match;
}

// ──────────────────────────────────────────────────────────────────
// Step 3 — GitHub events (via n8n's HTTP Request node)
// ──────────────────────────────────────────────────────────────────

interface GithubEvent {
	type: string;
	created_at: string;
	repo: { name: string };
	payload: {
		ref?: string;
		action?: string;
		pull_request?: { number?: number; title?: string; html_url?: string };
		issue?: { title?: string };
		comment?: { body?: string };
	};
}

interface GithubSummary {
	events: GithubEvent[];
	pushCount: number;
	prsOpened: Array<{ number?: number; title?: string; html_url?: string }>;
	branchesCreated: string[];
	repos: string[];
}

async function fetchGithubActivity(): Promise<GithubSummary> {
	const result = await n8n.httpRequest({
		method: 'GET',
		url: `https://api.github.com/users/${ROMEO_GITHUB_LOGIN}/events`,
		sendQuery: true,
		queryParameters: { parameters: [{ name: 'per_page', value: '100' }] },
	});
	const all = asArray<GithubEvent>(result.output);
	const events = all.filter((e) => e.created_at >= REPORT_WINDOW_START);
	const pushCount = events.filter((e) => e.type === 'PushEvent').length;
	const prsOpened = events
		.filter((e) => e.type === 'PullRequestEvent' && e.payload.action === 'opened' && e.payload.pull_request)
		.map((e) => ({
			number: e.payload.pull_request?.number,
			title: e.payload.pull_request?.title,
			html_url: e.payload.pull_request?.html_url,
		}));
	const branchesCreated = events
		.filter((e) => e.type === 'CreateEvent' && typeof e.payload.ref === 'string')
		.map((e) => e.payload.ref as string);
	const repos = Array.from(new Set(events.map((e) => e.repo.name)));
	return { events, pushCount, prsOpened, branchesCreated, repos };
}

// ──────────────────────────────────────────────────────────────────
// Step 4 — Slack messages by Romeo since the window start
// ──────────────────────────────────────────────────────────────────

interface SlackSearchHit {
	ts: string;
	text: string;
	permalink?: string;
	channel?: { name?: string; is_im?: boolean };
}

async function fetchSlackActivity(slackCredId: string, slackHandle: string): Promise<SlackSearchHit[]> {
	const result = await n8n.slack.message.search({
		credentialId: slackCredId,
		authentication: 'oAuth2',
		query: `from:@${slackHandle} after:${REPORT_WINDOW_START}`,
		sort: 'desc',
		limit: 30,
	});
	return asArray<SlackSearchHit>(result.output);
}

// ──────────────────────────────────────────────────────────────────
// Step 5 — Compose the Block Kit message
// ──────────────────────────────────────────────────────────────────

interface ReportInput {
	user: SlackUserLite;
	gh: GithubSummary;
	slack: SlackSearchHit[];
}

function buildBlocks(input: ReportInput): unknown[] {
	const { user, gh, slack } = input;
	const channels = Array.from(
		new Set(slack.map((m) => m.channel?.name).filter((n): n is string => Boolean(n) && n.length > 0)),
	).slice(0, 6);

	const topPrLine = gh.prsOpened[0]
		? `*${gh.prsOpened[0].title ?? `PR #${gh.prsOpened[0].number}`}* — <${gh.prsOpened[0].html_url}|view on GitHub>`
		: '_No PRs opened in this window._';
	const branchLine =
		gh.branchesCreated.length > 0
			? gh.branchesCreated.map((b) => `\`${b}\``).join(' • ')
			: '_No new branches._';
	const channelLine = channels.length > 0 ? channels.map((c) => `#${c}`).join(' • ') : '_No public messages._';

	return [
		{
			type: 'header',
			text: { type: 'plain_text', text: `📊 ${user.profile?.real_name ?? user.name} — Weekly Activity`, emoji: true },
		},
		{
			type: 'context',
			elements: [
				{ type: 'mrkdwn', text: `*Period:* since ${REPORT_WINDOW_START}` },
				{ type: 'mrkdwn', text: '•' },
				{ type: 'mrkdwn', text: '*Pipeline:* `scripts/romeo-report-e2e.ts` via `@n8n/sdk`' },
			],
		},
		{ type: 'divider' },
		{
			type: 'header',
			text: { type: 'plain_text', text: '🐙 GitHub', emoji: true },
		},
		{
			type: 'section',
			fields: [
				{ type: 'mrkdwn', text: `*Events:*\n${gh.events.length}` },
				{ type: 'mrkdwn', text: `*Pushes:*\n${gh.pushCount}` },
				{ type: 'mrkdwn', text: `*PRs opened:*\n${gh.prsOpened.length}` },
				{ type: 'mrkdwn', text: `*Branches created:*\n${gh.branchesCreated.length}` },
				{ type: 'mrkdwn', text: `*Repos touched:*\n${gh.repos.map((r) => `\`${r}\``).join(' ') || '—'}` },
				{ type: 'mrkdwn', text: `*GitHub handle:*\n<https://github.com/${ROMEO_GITHUB_LOGIN}|${ROMEO_GITHUB_LOGIN}>` },
			],
		},
		{
			type: 'section',
			text: { type: 'mrkdwn', text: `*Latest PR opened:* ${topPrLine}` },
		},
		{
			type: 'section',
			text: { type: 'mrkdwn', text: `*New branches:* ${branchLine}` },
		},
		{ type: 'divider' },
		{
			type: 'header',
			text: { type: 'plain_text', text: '💬 Slack', emoji: true },
		},
		{
			type: 'section',
			fields: [
				{ type: 'mrkdwn', text: `*Messages:*\n${slack.length}` },
				{ type: 'mrkdwn', text: `*Slack handle:*\n@${user.name}` },
				{ type: 'mrkdwn', text: `*Real name:*\n${user.profile?.real_name ?? user.real_name ?? '—'}` },
				{ type: 'mrkdwn', text: `*Title:*\n${user.profile?.title ?? '—'}` },
			],
		},
		{
			type: 'section',
			text: { type: 'mrkdwn', text: `*Active channels:* ${channelLine}` },
		},
		...buildRecentMessageBlocks(slack.slice(0, 5)),
		{ type: 'divider' },
		{
			type: 'context',
			elements: [
				{ type: 'mrkdwn', text: `🛠 Built with \`@n8n/sdk\` • Hub at ${baseUrl}` },
				{ type: 'mrkdwn', text: '•' },
				{ type: 'mrkdwn', text: `📅 <!date^${Math.floor(Date.now() / 1000)}^Generated {date_short_pretty} at {time}|just now>` },
			],
		},
	];
}

function buildRecentMessageBlocks(messages: SlackSearchHit[]): unknown[] {
	if (messages.length === 0) return [];
	const lines = messages
		.map((m) => {
			const snippet = (m.text || '').replace(/\s+/g, ' ').slice(0, 140);
			const link = m.permalink ? `<${m.permalink}|jump>` : '';
			const channel = m.channel?.is_im ? 'DM' : `#${m.channel?.name ?? '?'}`;
			return `• \`${channel}\` ${snippet}${snippet.length === 140 ? '…' : ''} ${link}`.trim();
		})
		.join('\n');
	return [
		{
			type: 'section',
			text: { type: 'mrkdwn', text: `*Most recent messages:*\n${lines}` },
		},
	];
}

// ──────────────────────────────────────────────────────────────────
// Step 6 — Deliver the report
// ──────────────────────────────────────────────────────────────────

async function sendReport(slackCredId: string, blocks: unknown[], fallbackText: string) {
	return await n8n.slack.message.post({
		credentialId: slackCredId,
		authentication: 'oAuth2',
		select: 'user',
		user: { __rl: true, mode: 'id', value: SELF_SLACK_USER_ID },
		messageType: 'block',
		text: fallbackText,
		blocksUi: JSON.stringify({ blocks }),
		otherOptions: { includeLinkToWorkflow: false, mrkdwn: true },
	});
}

// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────

function asArray<T>(value: unknown): T[] {
	if (value === undefined || value === null) return [];
	return Array.isArray(value) ? (value as T[]) : [value as T];
}

function logStep(n: number, total: number, title: string): void {
	console.log(`\n[${n}/${total}] ${title}`);
}

// ──────────────────────────────────────────────────────────────────
// Orchestrator
// ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
	console.log(`▶ n8n Hub at ${baseUrl}`);

	logStep(1, 6, 'Resolve credentials');
	const credentials = await listCredentials();
	const slackCred = pickByType(credentials, 'slackOAuth2Api');
	const githubCred = pickByType(credentials, 'githubApi');
	console.log(`  Slack:  ${slackCred.name} (${slackCred.id})`);
	console.log(`  GitHub: ${githubCred.name} (${githubCred.id})`);

	logStep(2, 6, `Discover ${ROMEO_REAL_NAME} on Slack`);
	const romeo = await findRomeo(slackCred.id);
	console.log(`  Found ${romeo.profile?.real_name ?? romeo.name} (${romeo.id}) — title: ${romeo.profile?.title ?? '—'}`);

	logStep(3, 6, `GitHub activity for @${ROMEO_GITHUB_LOGIN}`);
	const gh = await fetchGithubActivity();
	console.log(`  ${gh.events.length} events • ${gh.pushCount} pushes • ${gh.prsOpened.length} PRs • ${gh.branchesCreated.length} branches`);
	for (const pr of gh.prsOpened) console.log(`    PR: #${pr.number} ${pr.title}`);
	for (const b of gh.branchesCreated) console.log(`    Branch: ${b}`);

	logStep(4, 6, `Slack activity for @${romeo.name}`);
	const slack = await fetchSlackActivity(slackCred.id, romeo.name);
	console.log(`  ${slack.length} messages`);

	logStep(5, 6, 'Compose Block Kit report');
	const blocks = buildBlocks({ user: romeo, gh, slack });
	console.log(`  ${blocks.length} blocks`);

	logStep(6, 6, 'Deliver report to self via Slack DM');
	const fallback = `${ROMEO_REAL_NAME} — Weekly Activity (${gh.events.length} GH events, ${slack.length} Slack msgs)`;
	const post = await sendReport(slackCred.id, blocks, fallback);
	console.log(`  status=${post.status} executionId=${post.executionId}`);
	console.log(`  ${post.executionUrl}`);

	console.log('\n✓ end-to-end complete — three surfaces, one engine: MCP → CLI → SDK');
}

main().catch((err: unknown) => {
	console.error('\n✗ pipeline failed:', err instanceof Error ? err.message : err);
	process.exit(1);
});
