/**
 * Sandra Zollner — weekly digest via @n8n/sdk (verbatim, his/her own words only).
 *
 * Same end-to-end pattern as romeo-report-e2e.ts but targeted at:
 *   - Slack: @sandra.zollner (U0A2AHJKNDS, Senior Software Engineer · Payday)
 *   - GitHub: sandra0503
 *
 * Run:
 *   pnpm exec tsx scripts/sandra-report-e2e.ts
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { createClient, type ExecutionResult } from '../packages/@n8n/sdk/src/index';

const SELF_SLACK_USER_ID = 'U09GV6R3QUX';
const TARGET_REAL_NAME = 'Sandra Zollner';
const TARGET_SLACK_HANDLE = 'sandra.zollner';
const TARGET_SLACK_USER_ID = 'U0A2AHJKNDS';
const TARGET_GH_LOGIN = 'sandra0503';
const WINDOW_START = '2026-05-05'; // last 7 days from 2026-05-12

function resolveConnection(): { baseUrl: string; token: string } {
	if (process.env.N8N_URL && process.env.N8N_TOKEN) {
		return { baseUrl: process.env.N8N_URL, token: process.env.N8N_TOKEN };
	}
	const cfg = JSON.parse(
		readFileSync(join(homedir(), '.n8n-cli', 'config.json'), 'utf-8'),
	) as { url?: string; apiKey?: string };
	const baseUrl = process.env.N8N_URL ?? cfg.url;
	const token = process.env.N8N_TOKEN ?? cfg.apiKey;
	if (!baseUrl || !token) throw new Error('Missing N8N_URL / N8N_TOKEN');
	return { baseUrl, token };
}

const { baseUrl, token } = resolveConnection();

interface DemoApi {
	httpRequest: (args: Record<string, unknown>) => Promise<ExecutionResult<unknown>>;
	slack: {
		message: {
			search: (args: Record<string, unknown>) => Promise<ExecutionResult<unknown>>;
			post: (args: Record<string, unknown>) => Promise<ExecutionResult<unknown>>;
		};
	};
}

const n8n = createClient({
	baseUrl,
	token,
	caller: { kind: 'sdk', name: 'sandra-report-e2e' },
}) as unknown as DemoApi;

async function fetchCredentials(): Promise<{ slackId: string }> {
	const res = await fetch(new URL('/rest/credentials', baseUrl), {
		headers: { 'X-N8N-API-KEY': token, Accept: 'application/json' },
	});
	const body = (await res.json()) as { data?: Array<{ id: string; type: string }> };
	const list = body.data ?? [];
	const slack = list.find((c) => c.type === 'slackOAuth2Api');
	if (!slack) throw new Error('No slackOAuth2Api credential found.');
	return { slackId: slack.id };
}

interface GithubEvent {
	type: string;
	created_at: string;
	repo: { name: string };
	payload: {
		ref?: string;
		action?: string;
		pull_request?: { number?: number; title?: string; html_url?: string };
		commits?: Array<{ message?: string }>;
	};
}

interface SlackHit {
	ts: string;
	text: string;
	permalink?: string;
	channel?: { name?: string; is_im?: boolean };
}

function asArray<T>(value: unknown): T[] {
	if (value === undefined || value === null) return [];
	return Array.isArray(value) ? (value as T[]) : [value as T];
}

async function main(): Promise<void> {
	console.log(`▶ n8n Hub at ${baseUrl}`);

	console.log('\n[1/5] Resolve credentials');
	const { slackId } = await fetchCredentials();
	console.log(`  Slack credential: ${slackId}`);

	console.log(`\n[2/5] GitHub activity for @${TARGET_GH_LOGIN}`);
	const gh = await n8n.httpRequest({
		method: 'GET',
		url: `https://api.github.com/users/${TARGET_GH_LOGIN}/events`,
		sendQuery: true,
		queryParameters: { parameters: [{ name: 'per_page', value: '100' }] },
	});
	const ghEvents = asArray<GithubEvent>(gh.output).filter(
		(e) => e.created_at >= `${WINDOW_START}T00:00:00Z`,
	);
	const pushes = ghEvents.filter((e) => e.type === 'PushEvent').length;
	const prsOpened = ghEvents.filter(
		(e) => e.type === 'PullRequestEvent' && e.payload.action === 'opened',
	);
	const branches = ghEvents
		.filter((e) => e.type === 'CreateEvent')
		.map((e) => e.payload.ref)
		.filter((r): r is string => Boolean(r));
	const repos = Array.from(new Set(ghEvents.map((e) => e.repo.name)));
	console.log(`  ${ghEvents.length} events • ${pushes} pushes • ${prsOpened.length} PRs • ${branches.length} branches`);

	console.log(`\n[3/5] Slack activity for @${TARGET_SLACK_HANDLE}`);
	const slack = await n8n.slack.message.search({
		credentialId: slackId,
		authentication: 'oAuth2',
		query: `from:@${TARGET_SLACK_HANDLE} after:${WINDOW_START}`,
		sort: 'desc',
		returnAll: false,
		limit: 50,
	});
	const messages = asArray<SlackHit>(slack.output);
	console.log(`  ${messages.length} messages`);

	console.log('\n[4/5] Compose Block Kit (verbatim, no editorial)');
	const byChannel: Record<string, number> = {};
	for (const m of messages) {
		const ch = m.channel?.name ?? (m.channel?.is_im ? 'DM' : 'unknown');
		byChannel[ch] = (byChannel[ch] ?? 0) + 1;
	}
	const channelLines = Object.entries(byChannel)
		.sort((a, b) => b[1] - a[1])
		.map(([c, n]) => `• ${c === 'DM' ? 'DM' : '#' + c}: ${n}`)
		.join('\n');

	const longest = [...messages]
		.filter((m) => typeof m.text === 'string' && m.text.length > 60)
		.sort((a, b) => b.text.length - a.text.length)
		.slice(0, 8);

	const quoteBlocks = longest.map((m) => {
		const ch = m.channel?.name ? `#${m.channel.name}` : m.channel?.is_im ? 'DM' : '#?';
		const txt = m.text.replace(/\s+/g, ' ').slice(0, 400);
		const link = m.permalink ? ` <${m.permalink}|jump>` : '';
		return {
			type: 'section',
			text: { type: 'mrkdwn', text: `_${ch}:_\n> ${txt}${link}` },
		};
	});

	const ghLines = [
		`*Public events:* ${ghEvents.length}`,
		`*Pushes:* ${pushes}`,
		`*PRs opened:* ${prsOpened.length}`,
		`*Branches:* ${branches.length}`,
		`*Repos:* ${repos.length > 0 ? repos.map((r) => '`' + r + '`').join(' ') : '—'}`,
	].join('\n');

	const blocks: unknown[] = [
		{
			type: 'header',
			text: {
				type: 'plain_text',
				text: `📊 ${TARGET_REAL_NAME} — digest (her own words)`,
				emoji: true,
			},
		},
		{
			type: 'context',
			elements: [
				{ type: 'mrkdwn', text: `*Window:* since ${WINDOW_START} (7 days)` },
				{ type: 'mrkdwn', text: '•' },
				{ type: 'mrkdwn', text: '*Sent via:* `@n8n/sdk` (`scripts/sandra-report-e2e.ts`)' },
			],
		},
		{ type: 'divider' },
		{
			type: 'section',
			fields: [
				{ type: 'mrkdwn', text: `*Slack messages:*\n${messages.length}` },
				{ type: 'mrkdwn', text: `*Slack handle:*\n@${TARGET_SLACK_HANDLE}` },
				{
					type: 'mrkdwn',
					text: `*GitHub handle:*\n<https://github.com/${TARGET_GH_LOGIN}|${TARGET_GH_LOGIN}>`,
				},
				{ type: 'mrkdwn', text: `*Title:*\nSenior Software Engineer · Payday` },
			],
		},
		{ type: 'section', text: { type: 'mrkdwn', text: `*GitHub stats:*\n${ghLines}` } },
	];

	if (channelLines) {
		blocks.push({ type: 'divider' });
		blocks.push({
			type: 'section',
			text: { type: 'mrkdwn', text: `*Channel distribution:*\n${channelLines}` },
		});
	}

	if (quoteBlocks.length > 0) {
		blocks.push({ type: 'divider' });
		blocks.push({
			type: 'header',
			text: { type: 'plain_text', text: 'Direct quotes (verbatim)', emoji: true },
		});
		blocks.push(...quoteBlocks);
	}

	if (prsOpened.length > 0) {
		blocks.push({ type: 'divider' });
		blocks.push({
			type: 'header',
			text: { type: 'plain_text', text: 'PRs opened in window', emoji: true },
		});
		blocks.push({
			type: 'section',
			text: {
				type: 'mrkdwn',
				text: prsOpened
					.map((e) => {
						const pr = e.payload.pull_request!;
						const title = pr.title ?? `PR #${pr.number}`;
						return `• <${pr.html_url}|${title}>`;
					})
					.join('\n'),
			},
		});
	}

	blocks.push({ type: 'divider' });
	blocks.push({
		type: 'context',
		elements: [
			{
				type: 'mrkdwn',
				text: `Pipeline: \`httpRequest\` (GitHub) → \`slack.message.search\` → local compose → \`slack.message.post\`. caller: sdk / sandra-report-e2e`,
			},
		],
	});

	console.log(`  ${blocks.length} blocks`);

	console.log('\n[5/5] Deliver to self via Slack DM');
	const post = await n8n.slack.message.post({
		credentialId: slackId,
		authentication: 'oAuth2',
		select: 'user',
		user: { __rl: true, mode: 'id', value: SELF_SLACK_USER_ID },
		messageType: 'block',
		text: `${TARGET_REAL_NAME} — digest (${messages.length} Slack msgs, ${ghEvents.length} GH events)`,
		blocksUi: JSON.stringify({ blocks }),
		otherOptions: { includeLinkToWorkflow: false, mrkdwn: true },
	});
	console.log(`  status=${post.status} executionId=${post.executionId}`);
	console.log(`  ${post.executionUrl}`);
	console.log(`\n✓ done — caller=sdk, target=${TARGET_REAL_NAME}, ID=${TARGET_SLACK_USER_ID}`);
}

main().catch((err: unknown) => {
	console.error('✗ failed:', err instanceof Error ? err.message : err);
	process.exit(1);
});
