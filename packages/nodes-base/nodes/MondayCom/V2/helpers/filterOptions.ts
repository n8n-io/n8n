import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { formatBoardLabel, isRealBoard } from './boardLocator';
import { MondayGraphQLClient } from '../transport/MondayGraphQLClient';

/**
 * Shared filter load-options and value-normalization helpers.
 *
 * Ported from the community package's filterOptions.ts. The folder-related
 * load-option functions that also live there in the community package arrive
 * with the resources that use them (workspace, folder, doc, form) in later
 * PRs of this series.
 */

const WORKSPACE_PAGE_SIZE = 100;
/** Bounded window: enough for real accounts without melting loadOptions. */
const MAX_WORKSPACE_PAGES = 10;

interface NamedRow {
	id: string;
	name: string;
}

/**
 * Lists workspaces (up to 1,000, sorted by name) for the multiOptions
 * workspace filters — those cannot be resource locators (multi-value), so
 * they keep this bounded window. Single-workspace pickers use the
 * workspaceResourceLocator (workspaceLocator.ts) with server-side search.
 */
export async function getWorkspaces(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const client = new MondayGraphQLClient(this);
	const rows: NamedRow[] = [];

	for (let page = 1; page <= MAX_WORKSPACE_PAGES; page++) {
		const data = await client.execute(
			'query ($limit: Int!, $page: Int!) { workspaces(limit: $limit, page: $page) { id name } }',
			0,
			{ limit: WORKSPACE_PAGE_SIZE, page },
		);
		const pageRows = (data.workspaces ?? []) as NamedRow[];
		rows.push(...pageRows);
		if (pageRows.length < WORKSPACE_PAGE_SIZE) break;
	}

	return rows
		.sort((a, b) => a.name.localeCompare(b.name))
		.map((row) => ({ name: row.name, value: row.id }));
}

const BOARD_LIST_LIMIT = 500;

interface BoardRow extends NamedRow {
	type?: string;
	workspace?: { name?: string } | null;
}

/**
 * Lists the 500 most recently used boards for the board filter, labeled
 * "Board (Workspace)" like every board picker. Docs and subitem boards are
 * excluded. On accounts with more boards, use expression mode with explicit
 * IDs instead.
 */
export async function getBoardList(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const client = new MondayGraphQLClient(this);
	const data = await client.execute(
		'query ($limit: Int!) { boards(limit: $limit, order_by: used_at, state: active) { id name type workspace { name } } }',
		0,
		{ limit: BOARD_LIST_LIMIT },
	);

	return ((data.boards ?? []) as BoardRow[]).filter(isRealBoard).map((row) => ({
		name: formatBoardLabel(row),
		value: row.id,
	}));
}

/**
 * Normalizes a dateTime parameter into a full ISO 8601 UTC timestamp.
 * monday's ISO8601DateTime scalar REJECTS anything without a timezone
 * designator (verified live 2026-07-19: "2026-07-22 00:00:00" and even
 * "2026-07-22T00:00:00" fail BAD_USER_INPUT; only offset/Z forms pass) —
 * and the n8n dateTime picker emits exactly that naive local format.
 * Naive values are interpreted in the n8n server's timezone (JS Date
 * semantics). Unparseable strings pass through unchanged so the API's
 * mapped BAD_USER_INPUT error still names the bad value.
 */
export function toIso8601(value: unknown): string | undefined {
	const raw = typeof value === 'string' ? value.trim() : '';
	if (!raw) return undefined;
	const parsed = new Date(raw);
	if (Number.isNaN(parsed.getTime())) return raw;
	return parsed.toISOString();
}

/**
 * Normalizes a multiOptions value into a string ID array. The dropdown yields
 * an array; expression mode may yield a comma-separated string (the "custom
 * CSV" input path) or an array of strings/numbers.
 */
export function normalizeIdList(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value.map(String).filter((id) => id.trim() !== '');
	}
	if (typeof value === 'string') {
		return value
			.split(',')
			.map((id) => id.trim())
			.filter((id) => id !== '');
	}
	return [];
}
