#!/usr/bin/env node
// Seeds the Notion and Slack test content of the knowledge live retrieval PoC
// and writes the created ids to fixtures/items.json, which the harness and the
// agent fixtures read. See AGENTS.md in this folder.
//
// A re-run replaces the script's own earlier output: the seed page under the
// Notion root page, and the messages the seed user posted in the seed channels.
// It never touches other content.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	NOTION_PAGES,
	SEED_PREFIX,
	SLACK_CHANNELS,
	SLACK_THREADS,
	SUPPORT_KB_NEEDLES,
	SUPPORT_KB_PROPERTIES,
	SUPPORT_KB_TITLE,
	generateSupportKbRows,
} from './fixtures/content.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ITEMS_FILE = path.join(HERE, 'fixtures', 'items.json');

// The version the Notion v3 node sends, so the seeded shapes match what it reads.
const NOTION_API_VERSION = '2026-03-11';
// Notion allows about three requests per second on average.
const NOTION_MIN_INTERVAL_MS = 350;
// chat.postMessage allows about one message per second per channel.
const SLACK_POST_INTERVAL_MS = 1100;
const SLACK_MIN_INTERVAL_MS = 300;

const isTrue = (name) => (process.env[name] ?? 'false').toLowerCase() === 'true';
const SKIP_NOTION = isTrue('SKIP_NOTION');
const SKIP_SLACK = isTrue('SKIP_SLACK');
const KB_ROWS = Number(process.env.KB_ROWS ?? 300);
const SEED = Number(process.env.SEED ?? 1);

function fail(message) {
	console.error(message);
	process.exit(1);
}

if (!Number.isInteger(KB_ROWS) || KB_ROWS < 0)
	fail(`KB_ROWS must be a whole number, got '${process.env.KB_ROWS}'`);
if (!Number.isFinite(SEED)) fail(`SEED must be a number, got '${process.env.SEED}'`);
if (SKIP_NOTION && SKIP_SLACK) fail('Nothing to do: SKIP_NOTION and SKIP_SLACK are both true');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A throttled JSON client with retries on 429 and 5xx. The `name` only labels
 * errors. Secrets stay in the headers and never reach a log line.
 */
function createClient({ name, baseUrl, headers, minIntervalMs }) {
	let lastRequestAt = 0;
	return async function request(method, pathname, { body, query } = {}) {
		const url = new URL(pathname, baseUrl);
		for (const [key, value] of Object.entries(query ?? {})) {
			if (value !== undefined) url.searchParams.set(key, String(value));
		}
		for (let attempt = 0; attempt < 6; attempt++) {
			const wait = lastRequestAt + minIntervalMs - Date.now();
			if (wait > 0) await sleep(wait);
			lastRequestAt = Date.now();

			const response = await fetch(url, {
				method,
				headers: {
					...headers,
					...(body ? { 'Content-Type': 'application/json; charset=utf-8' } : {}),
				},
				body: body ? JSON.stringify(body) : undefined,
			});
			const payload = await response.json().catch(() => ({}));
			const rateLimited = response.status === 429 || payload.error === 'ratelimited';
			if (rateLimited || response.status >= 500) {
				const retryAfter = Number(response.headers.get('retry-after')) || 2 ** attempt;
				console.log(
					`${name}: ${rateLimited ? 'rate limited' : `status ${response.status}`}, retrying in ${retryAfter}s`,
				);
				await sleep(retryAfter * 1000);
				continue;
			}
			if (!response.ok || payload.ok === false) {
				const detail = payload.message ?? payload.error ?? JSON.stringify(payload);
				throw new Error(`${name} ${method} ${url.pathname} failed (${response.status}): ${detail}`);
			}
			return payload;
		}
		throw new Error(`${name} ${method} ${url.pathname}: gave up after six attempts`);
	};
}

// ---------------------------------------------------------------------------
// Notion
// ---------------------------------------------------------------------------

const richText = (content) => [{ type: 'text', text: { content: content.slice(0, 2000) } }];
const paragraphBlocks = (paragraphs) =>
	paragraphs.map((content) => ({
		object: 'block',
		type: 'paragraph',
		paragraph: { rich_text: richText(content) },
	}));

async function seedNotion() {
	const token = process.env.NOTION_SEED_TOKEN;
	const rootPageId = process.env.NOTION_SEED_ROOT_PAGE_ID;
	if (!token) fail('NOTION_SEED_TOKEN env var required (or SKIP_NOTION=true)');
	if (!rootPageId) fail('NOTION_SEED_ROOT_PAGE_ID env var required (or SKIP_NOTION=true)');

	const notion = createClient({
		name: 'Notion',
		baseUrl: 'https://api.notion.com',
		headers: { Authorization: `Bearer ${token}`, 'Notion-Version': NOTION_API_VERSION },
		minIntervalMs: NOTION_MIN_INTERVAL_MS,
	});

	async function listChildren(blockId) {
		const blocks = [];
		let cursor;
		do {
			const page = await notion('GET', `/v1/blocks/${blockId}/children`, {
				query: { page_size: 100, start_cursor: cursor },
			});
			blocks.push(...page.results);
			cursor = page.has_more ? page.next_cursor : undefined;
		} while (cursor);
		return blocks;
	}

	async function trash(kind, id) {
		const resource = kind === 'child_database' ? 'databases' : 'pages';
		try {
			await notion('PATCH', `/v1/${resource}/${id}`, { body: { in_trash: true } });
		} catch (error) {
			// Older API behaviour: `archived` is the trash flag.
			if (!String(error.message).includes('(400)')) throw error;
			await notion('PATCH', `/v1/${resource}/${id}`, { body: { archived: true } });
		}
	}

	async function clearEarlierOutput() {
		const children = await listChildren(rootPageId);
		let removed = 0;
		for (const block of children) {
			const title =
				block.type === 'child_page'
					? block.child_page?.title
					: block.type === 'child_database'
						? block.child_database?.title
						: undefined;
			if (!title?.startsWith(SEED_PREFIX)) continue;
			await trash(block.type, block.id);
			removed++;
		}
		console.log(`Notion: moved ${removed} earlier seed page(s) to the trash`);
	}

	async function createPage(parentPageId, title, paragraphs) {
		const page = await notion('POST', '/v1/pages', {
			body: {
				parent: { page_id: parentPageId },
				properties: { title: { title: richText(title) } },
				children: paragraphBlocks(paragraphs),
			},
		});
		return { id: page.id, url: page.url };
	}

	async function createRow(dataSourceId, row) {
		const page = await notion('POST', '/v1/pages', {
			body: {
				parent: { data_source_id: dataSourceId },
				properties: {
					Name: { title: richText(row.title) },
					Category: { select: { name: row.category } },
					Status: { select: { name: row.status } },
					Summary: { rich_text: richText(row.summary) },
				},
				children: paragraphBlocks(row.paragraphs),
			},
		});
		return { id: page.id, url: page.url };
	}

	await clearEarlierOutput();

	const seedPage = await createPage(rootPageId, `${SEED_PREFIX}Knowledge PoC`, [
		'Test content of the knowledge live retrieval PoC. Created by scripts/knowledge-live-harness/seed-sources.mjs in the n8n repository. Safe to delete.',
	]);
	console.log(`Notion: created seed page ${seedPage.url}`);

	const picked = [];
	const notPicked = [];
	const children = {};
	const pagesByKey = {};

	for (const definition of NOTION_PAGES) {
		const page = await createPage(seedPage.id, definition.title, definition.paragraphs);
		pagesByKey[definition.key] = page;
		const item = {
			key: definition.key,
			id: page.id,
			kind: definition.children ? 'container' : 'item',
			containerType: 'page',
			title: definition.title,
			url: page.url,
		};
		(definition.picked ? picked : notPicked).push(item);
		if (definition.children) {
			children[definition.key] = [];
			for (const child of definition.children) {
				const childPage = await createPage(page.id, child.title, child.paragraphs);
				children[definition.key].push({
					key: child.key,
					id: childPage.id,
					title: child.title,
					url: childPage.url,
				});
			}
		}
		console.log(`Notion: created "${definition.title}"`);
	}

	const database = await notion('POST', '/v1/databases', {
		body: {
			parent: { type: 'page_id', page_id: seedPage.id },
			title: richText(SUPPORT_KB_TITLE),
			initial_data_source: { properties: SUPPORT_KB_PROPERTIES },
		},
	});
	const dataSourceId = database.data_sources?.[0]?.id;
	if (!dataSourceId) throw new Error('Notion: the database response has no data source id');
	picked.push({
		key: 'support-kb',
		id: dataSourceId,
		kind: 'container',
		containerType: 'dataSource',
		title: SUPPORT_KB_TITLE,
		url: database.url,
	});
	console.log(
		`Notion: created "${SUPPORT_KB_TITLE}" (database ${database.id}, data source ${dataSourceId})`,
	);

	// The needle rows sit at fixed positions between the generated rows, so a
	// listing with a cap still reaches them in a predictable order.
	const rows = generateSupportKbRows(KB_ROWS, SEED);
	SUPPORT_KB_NEEDLES.forEach((needle, index) => {
		const position = Math.min(
			rows.length,
			Math.floor((rows.length * (index + 1)) / (SUPPORT_KB_NEEDLES.length + 1)),
		);
		rows.splice(position, 0, needle);
	});
	const needles = {};
	for (const [index, row] of rows.entries()) {
		const created = await createRow(dataSourceId, row);
		if (SUPPORT_KB_NEEDLES.includes(row))
			needles[row.key] = { id: created.id, title: row.title, url: created.url };
		if ((index + 1) % 25 === 0 || index + 1 === rows.length) {
			console.log(`Notion: created ${index + 1}/${rows.length} Support KB rows`);
		}
	}

	// The 2026 policy must be the most recently edited of the two, so the
	// disambiguation question has one correct answer. An appended block bumps
	// last_edited_time.
	await notion('PATCH', `/v1/blocks/${pagesByKey['refund-2026'].id}/children`, {
		body: { children: paragraphBlocks(['Last reviewed on 15 January 2026.']) },
	});

	return {
		rootPageId,
		seedPageId: seedPage.id,
		seedPageUrl: seedPage.url,
		databaseId: database.id,
		dataSourceId,
		kbRows: rows.length,
		picked,
		notPicked,
		children,
		needles,
	};
}

// ---------------------------------------------------------------------------
// Slack
// ---------------------------------------------------------------------------

async function seedSlack() {
	const token = process.env.SLACK_SEED_USER_TOKEN;
	if (!token) fail('SLACK_SEED_USER_TOKEN env var required (or SKIP_SLACK=true)');

	const slack = createClient({
		name: 'Slack',
		baseUrl: 'https://slack.com/api/',
		headers: { Authorization: `Bearer ${token}` },
		minIntervalMs: SLACK_MIN_INTERVAL_MS,
	});
	const read = (method, query) => slack('GET', method, { query });
	const write = (method, body) => slack('POST', method, { body });

	const me = await read('auth.test');
	const workspaceUrl = me.url;

	async function paginate(method, query, key) {
		const items = [];
		let cursor;
		do {
			const page = await read(method, { ...query, limit: 200, cursor });
			items.push(...(page[key] ?? []));
			cursor = page.response_metadata?.next_cursor || undefined;
		} while (cursor);
		return items;
	}

	async function findChannel(name) {
		const channels = await paginate(
			'conversations.list',
			{ types: 'public_channel', exclude_archived: false },
			'channels',
		);
		return channels.find((channel) => channel.name === name);
	}

	async function ensureChannel(name) {
		let channel = await findChannel(name);
		if (!channel) {
			channel = (await write('conversations.create', { name, is_private: false })).channel;
			console.log(`Slack: created #${name}`);
		} else if (channel.is_archived) {
			await write('conversations.unarchive', { channel: channel.id });
			console.log(`Slack: unarchived #${name}`);
		}
		if (!channel.is_member) await write('conversations.join', { channel: channel.id });
		return channel;
	}

	async function clearOwnMessages(channelId) {
		const roots = await paginate('conversations.history', { channel: channelId }, 'messages');
		let removed = 0;
		for (const root of roots) {
			if (root.user !== me.user_id) continue;
			if (root.reply_count) {
				const replies = await paginate(
					'conversations.replies',
					{ channel: channelId, ts: root.ts },
					'messages',
				);
				for (const reply of replies) {
					if (reply.ts === root.ts || reply.user !== me.user_id) continue;
					await write('chat.delete', { channel: channelId, ts: reply.ts });
					removed++;
				}
			}
			await write('chat.delete', { channel: channelId, ts: root.ts });
			removed++;
		}
		return removed;
	}

	async function post(channelId, text, threadTs) {
		const message = await write('chat.postMessage', {
			channel: channelId,
			text,
			...(threadTs ? { thread_ts: threadTs } : {}),
		});
		await sleep(SLACK_POST_INTERVAL_MS);
		return message.ts;
	}

	const picked = [];
	const notPicked = [];
	const threads = {};

	for (const definition of SLACK_CHANNELS) {
		const channel = await ensureChannel(definition.name);
		const removed = await clearOwnMessages(channel.id);
		if (removed > 0)
			console.log(`Slack: deleted ${removed} earlier seed message(s) in #${definition.name}`);

		for (const thread of SLACK_THREADS[definition.key] ?? []) {
			const [rootText, ...replies] = thread.messages;
			const rootTs = await post(channel.id, rootText);
			for (const reply of replies) await post(channel.id, reply, rootTs);
			const { permalink } = await read('chat.getPermalink', {
				channel: channel.id,
				message_ts: rootTs,
			});
			threads[thread.key] = { channel: channel.id, ts: rootTs, permalink };
		}

		const item = {
			key: definition.key,
			id: channel.id,
			kind: 'container',
			containerType: 'channel',
			title: `#${definition.name}`,
			url: `${workspaceUrl}archives/${channel.id}`,
		};
		(definition.picked ? picked : notPicked).push(item);
		console.log(`Slack: seeded #${definition.name} (${channel.id})`);
	}

	return { teamId: me.team_id, userId: me.user_id, workspaceUrl, picked, notPicked, threads };
}

// ---------------------------------------------------------------------------

async function readEarlierItems() {
	try {
		return JSON.parse(await readFile(ITEMS_FILE, 'utf8'));
	} catch {
		return {};
	}
}

async function main() {
	const earlier = await readEarlierItems();
	const items = {
		seededAt: new Date().toISOString(),
		seed: SEED,
		notion: SKIP_NOTION ? earlier.notion : await seedNotion(),
		slack: SKIP_SLACK ? earlier.slack : await seedSlack(),
	};

	await mkdir(path.dirname(ITEMS_FILE), { recursive: true });
	await writeFile(ITEMS_FILE, `${JSON.stringify(items, null, '\t')}\n`);

	console.log(`\nWrote ${path.relative(process.cwd(), ITEMS_FILE)}`);
	for (const [source, data] of Object.entries({ notion: items.notion, slack: items.slack })) {
		if (!data) continue;
		console.log(`${source} picked items:`);
		for (const item of data.picked)
			console.log(`  ${item.kind.padEnd(9)} ${item.title}  ${item.id}`);
	}
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
