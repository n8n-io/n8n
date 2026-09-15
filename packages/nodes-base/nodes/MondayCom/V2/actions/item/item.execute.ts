import { sleep } from '@n8n/utils/sleep';
import {
	NodeOperationError,
	UserError,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
} from 'n8n-workflow';

import {
	buildAccountSearchPlan,
	flattenSearchResults,
	SEARCH_OPERATION_ENTITY,
	type AccountSearchFilters,
} from '../../helpers/accountSearch';
import {
	BULK_IMPORT_POLL_INTERVAL_MS,
	BULK_IMPORT_TERMINAL_STATES,
	buildBulkImportCsv,
	BulkImportInputError,
	MAX_BACKFILL_ROWS,
	MAX_INGEST_ROWS,
	parseReportRows,
	summarizeJobStatus,
	type RawItemsJobStatus,
} from '../../helpers/bulkImport';
import {
	extractMappedValues,
	fetchColumns,
	fetchColumnTypes,
	resolveSubitemBoardId,
} from '../../helpers/columnMapper';
import { buildColumnValues } from '../../helpers/columnValueMappers';
import { normalizeIdList, toIso8601 } from '../../helpers/filterOptions';
import {
	buildFilterRules,
	findRollupStatusRuleColumns,
	findUnsupportedOperatorRules,
	formatUnsupportedOperatorMessage,
	type FilterRuleInput,
} from '../../helpers/itemFilters';
import {
	BATTERY_VALUE_FRAGMENT,
	buildAllGroupsRule,
	COLUMN_VALUES_CALCULATED_ARG,
	fetchBoardGroupIds,
	formatBatteryText,
	LINKED_VALUE_DETAIL_FRAGMENTS,
	LINKED_VALUE_FRAGMENTS,
	type BatteryEntry,
} from '../../helpers/multiLevel';
import { fetchAllByCursor } from '../../helpers/pagination';
import { extractUserRowIds } from '../../helpers/userLocator';
import { DEFAULT_LIMIT } from '../../transport/constants';
import type { MondayGraphQLClient } from '../../transport/MondayGraphQLClient';

/**
 * Resolves the archive-vs-delete choice for the unified Archive or Delete
 * operations. Legacy operation values (archiveItem/deleteItem) map directly;
 * the unified value reads the Action parameter (default: archive — the safe
 * choice by design).
 */
export function resolveArchiveOrDeleteAction(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): 'archive' | 'delete' {
	if (operation === 'archiveItem') return 'archive';
	if (operation === 'deleteItem') return 'delete';
	const action = this.getNodeParameter('archiveOrDeleteAction', itemIndex, 'archive') as string;
	return action === 'delete' ? 'delete' : 'archive';
}

/**
 * Resolves the column_values object shared by Item: Create and Item: Update —
 * either the typed column mapper (friendly per-type inputs) or a raw
 * API-format JSON object. Returns undefined when nothing was set.
 */
async function resolveColumnValues(
	this: IExecuteFunctions,
	itemIndex: number,
	boardId: string,
): Promise<IDataObject | undefined> {
	const mode = this.getNodeParameter('columnValuesMode', itemIndex) as string;

	if (mode === 'json') {
		const raw = this.getNodeParameter('columnValuesJson', itemIndex, '{}');
		if (typeof raw === 'object' && raw !== null) {
			return raw as IDataObject;
		}
		if (typeof raw === 'string' && raw.trim() !== '' && raw.trim() !== '{}') {
			try {
				return JSON.parse(raw) as IDataObject;
			} catch {
				throw new NodeOperationError(
					this.getNode(),
					'Column Values (JSON) must be a valid JSON object keyed by column ID',
					{ itemIndex },
				);
			}
		}
		return undefined;
	}

	const mapped = extractMappedValues(this.getNodeParameter('columns', itemIndex, {}));
	if (Object.keys(mapped).length === 0) return undefined;
	const columnTypes = await fetchColumnTypes(this, boardId, itemIndex);
	return buildColumnValues(mapped, columnTypes);
}

/** Item: Create — create_item with column values from the shared builder. */
export async function createItem(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject> {
	// Unified Create: Subitem mode routes to create_subitem. Legacy saved
	// workflows have no createAs key and default to a top-level item.
	const createAs = this.getNodeParameter('createAs', itemIndex, 'item') as string;
	if (createAs === 'subitem') {
		return await createSubitem.call(this, client, itemIndex);
	}

	const boardId = this.getNodeParameter('boardId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const name = this.getNodeParameter('name', itemIndex) as string;
	const groupId = this.getNodeParameter('groupId', itemIndex, '') as string;
	const createOptions = this.getNodeParameter('createOptions', itemIndex, {}) as IDataObject;
	const columnValues = await resolveColumnValues.call(this, itemIndex, boardId);

	const data = await client.execute(
		`mutation ($boardId: ID!, $groupId: String, $itemName: String!, $columnValues: JSON, $createLabels: Boolean) {
			create_item(
				board_id: $boardId,
				group_id: $groupId,
				item_name: $itemName,
				column_values: $columnValues,
				create_labels_if_missing: $createLabels
			) {
				id
				name
				url
				state
				board { id name }
				group { id title }
				column_values(${COLUMN_VALUES_CALCULATED_ARG}) { id type text value ${BATTERY_VALUE_FRAGMENT} ${LINKED_VALUE_FRAGMENTS} }
			}
		}`,
		itemIndex,
		{
			boardId,
			groupId: groupId || null,
			itemName: name,
			// The API's JSON scalar arrives as a string.
			columnValues: columnValues ? JSON.stringify(columnValues) : null,
			createLabels: createOptions.createLabelsIfMissing === true,
		},
	);

	return (data.create_item ?? {}) as IDataObject;
}

/**
 * Item: Create in Subitem mode (and the legacy Create Subitem operation) —
 * create_subitem under a parent item, through the same column builder as
 * Create. Mapper values are typed against the SUBITEM board, resolved via
 * the parent board's subtasks column — on multi-level boards that resolves
 * to the parent board itself (one shared schema at every depth), and the
 * parent may be a subitem (nesting up to 5 levels).
 */
export async function createSubitem(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject> {
	const parentBoardId = this.getNodeParameter('boardId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const parentItemId = this.getNodeParameter('itemId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const name = this.getNodeParameter('name', itemIndex) as string;
	const createOptions = this.getNodeParameter('createOptions', itemIndex, {}) as IDataObject;

	// Column types must come from the subitem board, not the parent's.
	// Only needed in mapper mode; raw JSON passes through untyped.
	const mode = this.getNodeParameter('columnValuesMode', itemIndex) as string;
	let valuesBoardId = parentBoardId;
	if (mode === 'mapper') {
		const mapped = extractMappedValues(this.getNodeParameter('columns', itemIndex, {}));
		if (Object.keys(mapped).length > 0) {
			const subitemBoardId = await resolveSubitemBoardId(this, parentBoardId, itemIndex);
			if (!subitemBoardId) {
				throw new NodeOperationError(
					this.getNode(),
					'This board has no subitems board yet — create the first subitem without column values, or use Raw JSON',
					{ itemIndex },
				);
			}
			valuesBoardId = subitemBoardId;
		}
	}
	const columnValues = await resolveColumnValues.call(this, itemIndex, valuesBoardId);

	const data = await client.execute(
		`mutation ($parentItemId: ID!, $itemName: String!, $columnValues: JSON, $createLabels: Boolean) {
			create_subitem(
				parent_item_id: $parentItemId,
				item_name: $itemName,
				column_values: $columnValues,
				create_labels_if_missing: $createLabels
			) {
				id
				name
				url
				state
				board { id name }
				group { id title }
				parent_item { id name }
				column_values(${COLUMN_VALUES_CALCULATED_ARG}) { id type text value ${BATTERY_VALUE_FRAGMENT} ${LINKED_VALUE_FRAGMENTS} }
			}
		}`,
		itemIndex,
		{
			parentItemId,
			itemName: name,
			columnValues: columnValues ? JSON.stringify(columnValues) : null,
			createLabels: createOptions.createLabelsIfMissing === true,
		},
	);

	return (data.create_subitem ?? {}) as IDataObject;
}

/**
 * Item: Update — change_multiple_column_values via the same column builder
 * as Create; the mapper additionally exposes the name column for renames.
 */
export async function updateItem(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject> {
	const boardId = this.getNodeParameter('boardId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const itemId = this.getNodeParameter('itemId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const createOptions = this.getNodeParameter('createOptions', itemIndex, {}) as IDataObject;
	const columnValues = await resolveColumnValues.call(this, itemIndex, boardId);

	if (!columnValues || Object.keys(columnValues).length === 0) {
		throw new NodeOperationError(this.getNode(), 'Set at least one column value to update', {
			itemIndex,
		});
	}

	const data = await client.execute(
		`mutation ($boardId: ID!, $itemId: ID!, $columnValues: JSON!, $createLabels: Boolean) {
			change_multiple_column_values(
				board_id: $boardId,
				item_id: $itemId,
				column_values: $columnValues,
				create_labels_if_missing: $createLabels
			) {
				id
				name
				url
				state
				board { id name }
				group { id title }
				column_values(${COLUMN_VALUES_CALCULATED_ARG}) { id type text value ${BATTERY_VALUE_FRAGMENT} ${LINKED_VALUE_FRAGMENTS} }
			}
		}`,
		itemIndex,
		{
			boardId,
			itemId,
			columnValues: JSON.stringify(columnValues),
			createLabels: createOptions.createLabelsIfMissing === true,
		},
	);

	return (data.change_multiple_column_values ?? {}) as IDataObject;
}

/** Product cap for Item: Clear Column Values — items and columns per execution. */
export const MAX_CLEAR_ITEMS = 10;
export const MAX_CLEAR_COLUMNS = 10;

/**
 * Builds the single aliased request that clears the given columns on every
 * item: one change_multiple_column_values per item, all in one mutation.
 * Setting a column to null resets it to its empty/default value (verified
 * live for text, numbers, date, link, status, checkbox and file columns).
 * Exported for unit tests.
 */
export function buildClearColumnValuesMutation(
	itemIds: string[],
	columnIds: string[],
): { query: string; variables: Record<string, unknown> } {
	const columnValues = JSON.stringify(
		Object.fromEntries(columnIds.map((columnId) => [columnId, null])),
	);
	const variables: Record<string, unknown> = { boardId: undefined, columnValues };
	const varDefs = ['$boardId: ID!', '$columnValues: JSON!'];
	const aliases: string[] = [];

	itemIds.forEach((itemId, index) => {
		varDefs.push(`$item${index}: ID!`);
		variables[`item${index}`] = itemId;
		aliases.push(
			`item${index}: change_multiple_column_values(board_id: $boardId, item_id: $item${index}, column_values: $columnValues) { id name }`,
		);
	});

	return {
		query: `mutation (${varDefs.join(', ')}) {\n\t${aliases.join('\n\t')}\n}`,
		variables,
	};
}

/**
 * Item: Clear Column Values — resets up to 10 columns on up to 10 items back
 * to their empty/default values in ONE aliased API request. Not atomic: if a
 * later item in the batch fails, earlier aliases may already have executed.
 */
export async function clearColumnValues(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject[]> {
	const boardId = this.getNodeParameter('boardId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const itemIds = normalizeIdList(this.getNodeParameter('clearItemIds', itemIndex));
	const columnIds = normalizeIdList(this.getNodeParameter('clearColumnIds', itemIndex));

	if (itemIds.length === 0) {
		throw new NodeOperationError(this.getNode(), 'Provide at least one item ID to clear', {
			itemIndex,
		});
	}
	if (itemIds.length > MAX_CLEAR_ITEMS) {
		throw new NodeOperationError(
			this.getNode(),
			`Too many items: ${itemIds.length} provided, but Clear Column Values handles at most ${MAX_CLEAR_ITEMS} per execution. Split the list across multiple runs.`,
			{ itemIndex },
		);
	}
	if (columnIds.length === 0) {
		throw new NodeOperationError(this.getNode(), 'Select at least one column to clear', {
			itemIndex,
		});
	}
	if (columnIds.length > MAX_CLEAR_COLUMNS) {
		throw new NodeOperationError(
			this.getNode(),
			`Too many columns: ${columnIds.length} selected, but Clear Column Values handles at most ${MAX_CLEAR_COLUMNS} per execution`,
			{ itemIndex },
		);
	}

	const { query, variables } = buildClearColumnValuesMutation(itemIds, columnIds);
	variables.boardId = boardId;
	const { data, errors } = await client.executeBulk(query, itemIndex, variables);

	const failures: Array<{ itemId: string; message: string }> = [];
	const rows = itemIds.map((itemId, index) => {
		const payload = data[`item${index}`] as IDataObject | null | undefined;
		if (payload) {
			return {
				itemId: (payload.id as string) ?? itemId,
				name: payload.name ?? null,
				success: true,
				clearedColumnIds: columnIds,
			} as IDataObject;
		}
		const failure = errors.find((error) => error.path?.[0] === `item${index}`);
		const message = failure?.message ?? 'Unknown error';
		failures.push({ itemId, message });
		return {
			itemId,
			success: false,
			error: message,
			errorCode: failure?.extensions?.code ?? failure?.error_code ?? null,
		} as IDataObject;
	});

	if (failures.length > 0 && !this.continueOnFail()) {
		const detail = failures.map((failure) => `${failure.itemId} (${failure.message})`).join(', ');
		throw new NodeOperationError(
			this.getNode(),
			`${failures.length} of ${itemIds.length} items failed to clear: ${detail}. The other items in the batch were still cleared.`,
			{ itemIndex },
		);
	}

	return rows;
}

/** Selection set for fetch_job_status — shared by the wait loop and the status op. */
const ITEMS_JOB_STATUS_QUERY = `query ($jobId: ID!) {
	fetch_job_status(job_id: $jobId) {
		... on ItemsJobStatus {
			status
			counts { submitted invalid skipped created updated failed }
			progress_percentage
			failure_reason
			failure_message
			fully_imported
			report_created
			report_url
		}
	}
}`;

/** One fetch_job_status poll. */
async function fetchBulkImportJobStatus(
	client: MondayGraphQLClient,
	itemIndex: number,
	jobId: string,
): Promise<RawItemsJobStatus> {
	const data = await client.execute(ITEMS_JOB_STATUS_QUERY, itemIndex, { jobId });
	return (data.fetch_job_status ?? {}) as RawItemsJobStatus;
}

/**
 * Downloads and parses monday's per-row import report. The report URL is a
 * pre-signed S3 GET that expires after 10 minutes — always fetched
 * immediately, never emitted downstream. Rows in mapped mode pair back to
 * the input item they came from (serialNo is the 1-based data-row number).
 */
async function fetchBulkImportReportRows(
	this: IExecuteFunctions,
	jobId: string,
	reportUrl: string,
	pairToInputRows: boolean,
	fallbackItemIndex: number,
	inputItemCount: number,
): Promise<INodeExecutionData[]> {
	const reportText = (await this.helpers.httpRequest({
		url: reportUrl,
	})) as string;

	return parseReportRows(String(reportText)).map((row) => {
		const serialNo = typeof row.serialNo === 'number' ? row.serialNo : undefined;
		const pairedIndex =
			pairToInputRows && serialNo !== undefined && serialNo >= 1 && serialNo <= inputItemCount
				? serialNo - 1
				: fallbackItemIndex;
		return {
			json: { jobId, ...row },
			pairedItem: { item: pairedIndex },
		};
	});
}

/**
 * Item: Bulk Import — one asynchronous CSV import job per execution:
 * start ingest_items/backfill_items, PUT the CSV to the pre-signed URL
 * (valid 10 minutes, so the upload happens immediately), then optionally
 * poll fetch_job_status every 10s until a terminal state.
 */
export async function bulkImportItems(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	inputItemCount: number,
): Promise<INodeExecutionData[]> {
	const boardId = this.getNodeParameter('boardId', 0, undefined, {
		extractValue: true,
	}) as string;
	const groupIdParam = this.getNodeParameter('bulkImportGroupId', 0, '') as string;
	const importType = this.getNodeParameter('bulkImportType', 0) as string;
	const source = this.getNodeParameter('bulkImportSource', 0) as string;
	const wait = this.getNodeParameter('bulkImportWait', 0) as boolean;
	const options = this.getNodeParameter('bulkImportOptions', 0, {}) as IDataObject;

	const isBackfill = importType === 'backfill';
	const rowCap = isBackfill ? MAX_BACKFILL_ROWS : MAX_INGEST_ROWS;

	// Assemble the CSV before starting the job — the upload URL only lives
	// 10 minutes, so everything slow happens first.
	let csvBuffer: Buffer;
	let mappedMode = false;
	if (source === 'file') {
		const binaryPropertyName = this.getNodeParameter('bulkImportBinaryPropertyName', 0) as string;
		this.helpers.assertBinaryData(0, binaryPropertyName);
		csvBuffer = await this.helpers.getBinaryDataBuffer(0, binaryPropertyName);
	} else {
		mappedMode = true;
		if (inputItemCount > rowCap) {
			throw new NodeOperationError(
				this.getNode(),
				`Too many rows: ${inputItemCount} input items, but ${isBackfill ? 'backfill' : 'ingest'} accepts at most ${rowCap} rows per job. Split the input into smaller batches.`,
				{ itemIndex: 0 },
			);
		}
		const mappedRows: Array<Record<string, unknown>> = [];
		for (let i = 0; i < inputItemCount; i++) {
			mappedRows.push(extractMappedValues(this.getNodeParameter('bulkImportColumns', i, {})));
		}
		const columns = await fetchColumns(this, boardId, 0);
		const columnTypes = Object.fromEntries(columns.map((column) => [column.id, column.type]));
		try {
			const built = buildBulkImportCsv(
				mappedRows,
				columnTypes,
				columns.map((column) => column.id),
			);
			csvBuffer = Buffer.from(built.csv, 'utf-8');
		} catch (error) {
			if (error instanceof BulkImportInputError) {
				throw new NodeOperationError(this.getNode(), error.message, { itemIndex: 0 });
			}
			// Anything else came from the GraphQL client — already a mapped NodeApiError.
			throw error;
		}
	}

	// group_id is required by the API; empty picker = the board's top group.
	let groupId = groupIdParam;
	if (!groupId) {
		const groupIds = await fetchBoardGroupIds(client, 0, boardId);
		if (groupIds.length === 0) {
			throw new NodeOperationError(this.getNode(), `Board ${boardId} has no groups`, {
				itemIndex: 0,
			});
		}
		groupId = groupIds[0];
	}

	// on_match only exists on ingest_items (backfill always creates).
	const onMatchBehaviour = isBackfill
		? 'none'
		: (this.getNodeParameter('bulkImportOnMatch', 0, 'none') as string);
	let onMatch: IDataObject | null = null;
	if (onMatchBehaviour !== 'none') {
		const matchColumnId = this.getNodeParameter('bulkImportMatchColumnId', 0) as string;
		onMatch = { behaviour: onMatchBehaviour, match_column_id: matchColumnId };
	}

	const startMutation = isBackfill
		? `mutation ($boardId: ID!, $groupId: ID!) {
				backfill_items(board_id: $boardId, group_id: $groupId) { job_id upload_url }
			}`
		: `mutation ($boardId: ID!, $groupId: ID!, $onMatch: OnMatchInput) {
				ingest_items(board_id: $boardId, group_id: $groupId, on_match: $onMatch) { job_id upload_url }
			}`;
	const startVariables: Record<string, unknown> = { boardId, groupId };
	if (!isBackfill) startVariables.onMatch = onMatch;

	const startData = await client.execute(startMutation, 0, startVariables);
	const jobInit = (startData[isBackfill ? 'backfill_items' : 'ingest_items'] ?? {}) as {
		job_id?: string;
		upload_url?: string;
	};
	if (!jobInit.job_id || !jobInit.upload_url) {
		throw new NodeOperationError(
			this.getNode(),
			'monday.com did not return a job ID and upload URL for the import job',
			{ itemIndex: 0 },
		);
	}
	const jobId = jobInit.job_id;

	// Pre-signed S3 PUT: no auth header, and no extra headers at all — an
	// unsigned x-amz-checksum-crc32 header makes S3 reject the upload (403).
	await this.helpers.httpRequest({
		method: 'PUT',
		url: jobInit.upload_url,
		body: csvBuffer,
		headers: { 'Content-Type': 'text/csv' },
	});

	if (!wait) {
		return [
			{
				json: { jobId, status: 'UPLOAD_PENDING', boardId, groupId, importType },
				pairedItem: { item: 0 },
			},
		];
	}

	const maxWaitTimeMs = ((options.maxWaitTime as number) ?? 1800) * 1000;
	const startedAt = Date.now();
	let status = await fetchBulkImportJobStatus(client, 0, jobId);
	while (!BULK_IMPORT_TERMINAL_STATES.has(status.status ?? '')) {
		if (Date.now() - startedAt >= maxWaitTimeMs) {
			throw new NodeOperationError(
				this.getNode(),
				`Import job ${jobId} did not finish within ${maxWaitTimeMs / 1000}s (last status: ${status.status ?? 'unknown'}). The job keeps running on monday's side — check it with the Get Bulk Import Status operation.`,
				{ itemIndex: 0 },
			);
		}
		await sleep(BULK_IMPORT_POLL_INTERVAL_MS);
		status = await fetchBulkImportJobStatus(client, 0, jobId);
	}

	if (status.status === 'FAILED' || status.status === 'REJECTED') {
		const reason = [status.failure_reason, status.failure_message].filter(Boolean).join(' — ');
		throw new NodeOperationError(
			this.getNode(),
			`Import job ${jobId} ${status.status === 'REJECTED' ? 'was rejected' : 'failed'}${reason ? `: ${reason}` : ''}`,
			{ itemIndex: 0 },
		);
	}

	const results: INodeExecutionData[] = [
		{ json: summarizeJobStatus(jobId, status), pairedItem: { item: 0 } },
	];

	if (options.includeRowResults === true && status.report_created && status.report_url) {
		results.push(
			...(await fetchBulkImportReportRows.call(
				this,
				jobId,
				status.report_url,
				mappedMode,
				0,
				inputItemCount,
			)),
		);
	}

	return results;
}

/**
 * Item: Get Bulk Import Status — one fetch_job_status poll for a job ID
 * from a previous Bulk Import run (the no-wait path).
 */
export async function getBulkImportJobStatus(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const jobId = (this.getNodeParameter('bulkImportJobId', itemIndex) as string).trim();
	if (!jobId) {
		throw new NodeOperationError(this.getNode(), 'Job ID is required', { itemIndex });
	}
	const options = this.getNodeParameter('bulkImportStatusOptions', itemIndex, {}) as IDataObject;

	const status = await fetchBulkImportJobStatus(client, itemIndex, jobId);
	if (status.status === undefined) {
		throw new NodeOperationError(this.getNode(), `No import job found for job ID ${jobId}`, {
			itemIndex,
		});
	}

	const results: INodeExecutionData[] = [
		{ json: summarizeJobStatus(jobId, status), pairedItem: { item: itemIndex } },
	];

	if (options.includeRowResults === true && status.report_created && status.report_url) {
		results.push(
			...(await fetchBulkImportReportRows.call(
				this,
				jobId,
				status.report_url,
				false,
				itemIndex,
				0,
			)),
		);
	}

	return results;
}

/** Product cap for bulk Item: Archive or Delete — item IDs per execution. */
export const MAX_BULK_ARCHIVE_DELETE_ITEMS = 50;

/**
 * Builds the single aliased request that archives or deletes every item in
 * the list: one archive_item/delete_item per ID, all in one mutation. The
 * batch is NOT atomic — a failing alias returns null (with a per-alias error
 * carrying its path) while the other aliases still execute (verified live).
 * Exported for unit tests.
 */
export function buildBulkArchiveOrDeleteMutation(
	action: 'archive' | 'delete',
	itemIds: string[],
): { query: string; variables: Record<string, unknown> } {
	const mutationField = action === 'archive' ? 'archive_item' : 'delete_item';
	const variables: Record<string, unknown> = {};
	const varDefs: string[] = [];
	const aliases: string[] = [];

	itemIds.forEach((itemId, index) => {
		varDefs.push(`$item${index}: ID!`);
		variables[`item${index}`] = itemId;
		aliases.push(`item${index}: ${mutationField}(item_id: $item${index}) { id name state }`);
	});

	return {
		query: `mutation (${varDefs.join(', ')}) {\n\t${aliases.join('\n\t')}\n}`,
		variables,
	};
}

/**
 * Item: Archive or Delete in Multiple Items mode — up to 50 item IDs in ONE
 * aliased API request. Per-ID failures are mapped back to their item via the
 * error path; with continueOnFail they become error rows, otherwise the run
 * fails with a summary that names the failed IDs (the rest were still
 * processed — the batch is not atomic).
 */
export async function archiveOrDeleteManyItems(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
	action: 'archive' | 'delete',
): Promise<IDataObject[]> {
	const itemIds = [...new Set(normalizeIdList(this.getNodeParameter('bulkItemIds', itemIndex)))];

	if (itemIds.length === 0) {
		throw new NodeOperationError(this.getNode(), `Provide at least one item ID to ${action}`, {
			itemIndex,
		});
	}
	if (itemIds.length > MAX_BULK_ARCHIVE_DELETE_ITEMS) {
		throw new NodeOperationError(
			this.getNode(),
			`Too many items: ${itemIds.length} provided, but Archive or Delete handles at most ${MAX_BULK_ARCHIVE_DELETE_ITEMS} unique item IDs per execution. Split the list across multiple runs.`,
			{ itemIndex },
		);
	}

	const { query, variables } = buildBulkArchiveOrDeleteMutation(action, itemIds);
	const { data, errors } = await client.executeBulk(query, itemIndex, variables);

	const failures: Array<{ itemId: string; message: string }> = [];
	const rows = itemIds.map((itemId, index) => {
		const payload = data[`item${index}`] as IDataObject | null | undefined;
		if (payload) {
			return { ...payload, action } as IDataObject;
		}
		const failure = errors.find((error) => error.path?.[0] === `item${index}`);
		const message = failure?.message ?? 'Unknown error';
		failures.push({ itemId, message });
		return {
			itemId,
			action,
			error: message,
			errorCode: failure?.extensions?.code ?? failure?.error_code ?? null,
		} as IDataObject;
	});

	if (failures.length > 0 && !this.continueOnFail()) {
		const detail = failures.map((failure) => `${failure.itemId} (${failure.message})`).join(', ');
		throw new NodeOperationError(
			this.getNode(),
			`${failures.length} of ${itemIds.length} items failed to ${action}: ${detail}. The other items in the batch were still processed.`,
			{ itemIndex },
		);
	}

	return rows;
}

/**
 * Column types move_item_to_board's columns_mapping cannot include — the
 * API rejects the whole mapping with an opaque "Columns mapping is not in
 * the expected format" error (name and subtasks verified live 2026-07-19;
 * formula per the API docs). These columns are handled by the move itself.
 */
export const MOVE_UNMAPPABLE_COLUMN_TYPES = new Set(['formula', 'name', 'subtasks']);

/**
 * Builds the complete columns_mapping that move_item_to_board requires. The
 * API rejects partial mappings outright, so the configured pairs are
 * validated against both boards' columns and every remaining mappable
 * source column is filled in with target: null — which is what monday's own
 * move dialog submits for unmapped columns (their values are dropped).
 * Exported for unit tests.
 */
export function completeMoveColumnsMapping(
	picked: Array<{ source: string; target?: string | null }>,
	sourceColumns: Array<{ id: string; type: string }>,
	targetColumns: Array<{ id: string; type: string }>,
): Array<{ source: string; target: string | null }> {
	const sourceById = new Map(sourceColumns.map((column) => [column.id, column]));
	const targetIds = new Set(targetColumns.map((column) => column.id));

	const mapping: Array<{ source: string; target: string | null }> = [];
	const mappedSourceIds = new Set<string>();
	for (const pair of picked) {
		const sourceColumn = sourceById.get(pair.source);
		if (!sourceColumn) {
			throw new UserError(`Column "${pair.source}" does not exist on the item's board`);
		}
		if (MOVE_UNMAPPABLE_COLUMN_TYPES.has(sourceColumn.type)) {
			throw new UserError(
				`The "${pair.source}" column (type ${sourceColumn.type}) cannot be mapped — the move handles it automatically`,
			);
		}
		if (mappedSourceIds.has(pair.source)) {
			throw new UserError(`Column "${pair.source}" is mapped more than once`);
		}
		const target = pair.target ?? null;
		if (target !== null && target !== '' && !targetIds.has(target)) {
			throw new UserError(`Column "${target}" does not exist on the target board`);
		}
		mappedSourceIds.add(pair.source);
		mapping.push({ source: pair.source, target: target === '' ? null : target });
	}

	for (const column of sourceColumns) {
		if (!mappedSourceIds.has(column.id) && !MOVE_UNMAPPABLE_COLUMN_TYPES.has(column.type)) {
			mapping.push({ source: column.id, target: null });
		}
	}
	return mapping;
}

/**
 * Item: Move — move_item_to_group within the board, or move_item_to_board
 * with an optional columns_mapping for cross-board moves. The mapping comes
 * from the guided mapper rows when any are configured, otherwise from the
 * raw-JSON escape hatch in Options (which is also what legacy saved
 * workflows use); either way it is completed to the full-board mapping the
 * API demands. Exported for unit tests.
 */
export async function moveItem(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject> {
	const itemId = this.getNodeParameter('itemId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const destination = this.getNodeParameter('moveDestination', itemIndex) as string;

	if (destination === 'group') {
		const targetGroupId = this.getNodeParameter('targetGroupId', itemIndex) as string;
		const data = await client.execute(
			`mutation ($itemId: ID!, $groupId: String!) {
				move_item_to_group(item_id: $itemId, group_id: $groupId) {
					id
					name
					url
					board { id name }
					group { id title }
				}
			}`,
			itemIndex,
			{ itemId, groupId: targetGroupId },
		);
		return (data.move_item_to_group ?? {}) as IDataObject;
	}

	const targetBoardId = this.getNodeParameter('targetBoardId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const targetGroupId = this.getNodeParameter('targetBoardGroupId', itemIndex) as string;
	const moveOptions = this.getNodeParameter('moveOptions', itemIndex, {}) as IDataObject;
	const mappingUi = this.getNodeParameter('columnsMappingUi', itemIndex, {}) as {
		mappings?: Array<{ source?: string; target?: string }>;
	};

	let pickedMapping: Array<{ source: string; target: string | null }> | undefined;
	const uiRows = mappingUi.mappings ?? [];
	if (uiRows.length > 0) {
		pickedMapping = uiRows.map((row, rowIndex) => {
			const source = typeof row.source === 'string' ? row.source.trim() : '';
			const target = typeof row.target === 'string' ? row.target.trim() : '';
			if (!source || !target) {
				throw new NodeOperationError(
					this.getNode(),
					`Columns Mapping row ${rowIndex + 1} needs both a source and a target column`,
					{ itemIndex },
				);
			}
			return { source, target };
		});
	} else {
		const rawMapping = moveOptions.columnsMapping;
		if (rawMapping !== undefined && rawMapping !== null && rawMapping !== '') {
			const parsed = typeof rawMapping === 'string' ? safeJsonParse(rawMapping) : rawMapping;
			if (!Array.isArray(parsed)) {
				throw new NodeOperationError(
					this.getNode(),
					'Columns Mapping must be a JSON array of {"source", "target"} pairs',
					{ itemIndex },
				);
			}
			if (parsed.length > 0) {
				pickedMapping = parsed as Array<{ source: string; target: string | null }>;
			}
		}
	}

	// The API rejects partial mappings ("Columns mapping is not in the
	// expected format"), so complete the configured pairs against both
	// boards' real columns before sending.
	let columnsMapping: Array<{ source: string; target: string | null }> | undefined;
	if (pickedMapping) {
		const sourceBoardId = this.getNodeParameter('boardId', itemIndex, undefined, {
			extractValue: true,
		}) as string;
		const boardData = await client.execute(
			'query ($ids: [ID!]) { boards(ids: $ids) { id columns { id type } } }',
			itemIndex,
			{ ids: [sourceBoardId, targetBoardId] },
		);
		const boards = (boardData.boards ?? []) as Array<{
			id: string;
			columns?: Array<{ id: string; type: string }>;
		}>;
		const sourceColumns = boards.find((board) => board.id === String(sourceBoardId))?.columns ?? [];
		const targetColumns = boards.find((board) => board.id === String(targetBoardId))?.columns ?? [];
		try {
			columnsMapping = completeMoveColumnsMapping(pickedMapping, sourceColumns, targetColumns);
		} catch (error) {
			throw new NodeOperationError(this.getNode(), (error as Error).message, { itemIndex });
		}
	}

	const data = await client.execute(
		`mutation ($boardId: ID!, $groupId: ID!, $itemId: ID!, $columnsMapping: [ColumnMappingInput!]) {
			move_item_to_board(
				board_id: $boardId,
				group_id: $groupId,
				item_id: $itemId,
				columns_mapping: $columnsMapping
			) {
				id
				name
				url
				board { id name }
				group { id title }
			}
		}`,
		itemIndex,
		{
			boardId: targetBoardId,
			groupId: targetGroupId,
			itemId,
			columnsMapping: columnsMapping ?? null,
		},
	);
	return (data.move_item_to_board ?? {}) as IDataObject;
}

export function safeJsonParse(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return undefined;
	}
}

interface RawItemColumnValue extends IDataObject {
	text?: string | null;
	column?: { title?: string; settings_str?: string } | null;
	battery_value?: BatteryEntry[] | null;
	display_value?: string | null;
}

/**
 * Flattens column values into { [column title]: text }. Status rollups
 * (BatteryValue, multi-level boards) have no text — their label counts are
 * rendered as "Done: 2, Stuck: 1" via the column's status labels.
 * Linked-item columns (dependency / board_relation / mirror) also have no
 * text — they fall back to display_value, the comma-separated linked item
 * names ("" = no links, flattened to null). Exported for unit tests.
 */
export function flattenItemColumns(columnValues: RawItemColumnValue[]): IDataObject {
	const columns: IDataObject = {};
	for (const columnValue of columnValues) {
		const title = columnValue.column?.title ?? (columnValue.id as string);
		if (columnValue.battery_value) {
			columns[title] = formatBatteryText(
				columnValue.battery_value,
				columnValue.column?.settings_str,
			);
			continue;
		}
		columns[title] = columnValue.text ?? (columnValue.display_value || null);
	}
	return columns;
}

/**
 * Builds the Item: Get query. Column values are scoped to the Select
 * Columns option when set (empty = all columns — the ids argument is only
 * sent when columns were picked, which cuts complexity cost and payload on
 * big boards). Include All Item Info adds the metadata fields the base
 * selection deliberately excludes. Exported for unit tests.
 */
export function buildGetItemQuery(
	itemId: string,
	options: IDataObject,
): { query: string; variables: Record<string, unknown> } {
	const columnIds = normalizeIdList(options.columnIds);
	const scoped = columnIds.length > 0;

	const extraFields = [
		options.includeAllItemInfo === true
			? 'creator { id name email } email relative_link subscribers { id name }'
			: '',
		options.includeSubitems === true
			? 'subitems { id name state url parent_item { id name } }'
			: '',
		options.includeUpdates === true ? 'updates { id body created_at creator { id name } }' : '',
	].join('\n');

	const columnArgs = scoped
		? `ids: $columnIds, ${COLUMN_VALUES_CALCULATED_ARG}`
		: COLUMN_VALUES_CALCULATED_ARG;

	return {
		query: `query ($ids: [ID!]${scoped ? ', $columnIds: [String!]' : ''}) {
			items(ids: $ids) {
				id
				name
				state
				url
				created_at
				updated_at
				board { id name }
				group { id title }
				parent_item { id name }
				column_values(${columnArgs}) {
					id type text value column { title settings_str }
					${BATTERY_VALUE_FRAGMENT}
					${LINKED_VALUE_FRAGMENTS}
				}
				${extraFields}
			}
		}`,
		variables: scoped ? { ids: [itemId], columnIds } : { ids: [itemId] },
	};
}

/**
 * Item: Get — items(ids:) with optional subitems/updates/full metadata, and
 * a Simplify Column Values Response mode that flattens column values into
 * { [column title]: text }. Works at any depth of a multi-level board
 * (subitems are items on the same board); rollup column values are included
 * via the CALCULATED capability.
 */
export async function getItem(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject> {
	const itemId = this.getNodeParameter('itemId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const simplify = this.getNodeParameter('simplify', itemIndex, true) as boolean;
	const options = this.getNodeParameter('getItemOptions', itemIndex, {}) as IDataObject;

	const { query, variables } = buildGetItemQuery(itemId, options);
	const data = await client.execute(query, itemIndex, variables);

	const item = ((data.items ?? []) as IDataObject[])[0];
	if (!item) {
		throw new NodeOperationError(this.getNode(), `Item ${itemId} not found`, { itemIndex });
	}
	if (!simplify) return item;

	const columns = flattenItemColumns((item.column_values ?? []) as RawItemColumnValue[]);
	const rest = { ...item };
	delete rest.column_values;
	return { ...rest, columns };
}

/**
 * Search: one request against the entity's field on the cross-entity
 * `search` root query. Which entity type is searched follows from the
 * operation (SEARCH_OPERATION_ENTITY). Scale-safe by design: server-side
 * relevance search, hard-capped at 20 results, no pagination (see
 * accountSearch.ts for the verified API contract).
 */
export async function searchAcrossAccount(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
	operation: string,
): Promise<IDataObject[]> {
	const entity = SEARCH_OPERATION_ENTITY[operation];
	const searchText = (this.getNodeParameter('searchQuery', itemIndex) as string).trim();
	const includeLiveData = this.getNodeParameter('includeLiveData', itemIndex, false) === true;
	const options = this.getNodeParameter('searchOptions', itemIndex, {}) as IDataObject;

	if (!searchText) {
		throw new NodeOperationError(this.getNode(), 'Query is required', {
			itemIndex,
			description: 'Provide the text to search for.',
		});
	}

	const filters: AccountSearchFilters = {
		boardIds: normalizeIdList(options.boardIds),
		workspaceIds: normalizeIdList(options.workspaceIds),
		creatorIds: extractUserRowIds(options.creatorIds),
		itemIds: normalizeIdList(options.itemIds),
		timelineType: options.timelineType as string | undefined,
		timelineProductKind: options.timelineProductKind as string | undefined,
		createdAfter: toIso8601(options.createdAfter),
		createdBefore: toIso8601(options.createdBefore),
		updatedAfter: toIso8601(options.updatedAfter),
		updatedBefore: toIso8601(options.updatedBefore),
	};

	const plan = buildAccountSearchPlan(
		searchText,
		[entity],
		includeLiveData,
		(options.searchLimit as number) ?? 10,
		options.strategy as string | undefined,
		filters,
	);

	const data = await client.execute(plan.query, itemIndex, plan.variables);
	return flattenSearchResults(data.search as IDataObject | undefined, [entity], includeLiveData);
}

interface ColumnValueRow extends IDataObject {
	id: string;
	type?: string;
	text?: string | null;
	value?: string | null;
	column?: { title?: string; settings_str?: string } | null;
	battery_value?: BatteryEntry[] | null;
	is_leaf?: boolean;
	display_value?: string | null;
	linked_item_ids?: string[] | null;
	linked_items?: Array<{ id: string; name: string }> | null;
	dependency_links?: Array<{
		linked_item_id: string;
		dependency_type?: number | null;
		lag?: number | null;
	}> | null;
}

/**
 * Shapes the Get Column Value output: parsed text plus the raw API value.
 * `value` arrives as a JSON-encoded string — decode it so workflows can
 * address fields directly (e.g. {{$json.value.index}}); `valueRaw` keeps
 * the original string for round-tripping into raw-JSON updates. Status
 * rollups (BatteryValue, multi-level boards) have no text/value — they get
 * label-count text plus batteryValue/isLeaf fields instead. Linked-item
 * columns (dependency / board_relation / mirror) also have no text/value —
 * text falls back to display_value (the linked items' names), and the raw
 * link data lands in displayValue/linkedItemIds/linkedItems (+
 * dependencyLinks for dependency columns).
 */
export function formatColumnValueOutput(
	item: { id?: string; name?: string },
	columnValue: ColumnValueRow | undefined,
	columnId: string,
): IDataObject {
	let value: unknown = null;
	if (columnValue?.value != null) {
		value = safeJsonParse(columnValue.value);
		if (value === undefined) value = columnValue.value;
	}
	const output: IDataObject = {
		itemId: item.id ?? null,
		itemName: item.name ?? null,
		columnId,
		columnTitle: columnValue?.column?.title ?? null,
		columnType: columnValue?.type ?? null,
		text: columnValue?.text ?? null,
		value: value as IDataObject,
		valueRaw: columnValue?.value ?? null,
	};
	if (columnValue?.battery_value) {
		output.text = formatBatteryText(columnValue.battery_value, columnValue.column?.settings_str);
		output.batteryValue = columnValue.battery_value as unknown as IDataObject[];
		// is_leaf: false = calculated from children; true = static leaf value.
		output.isLeaf = columnValue.is_leaf ?? null;
	}
	if (columnValue?.display_value !== undefined) {
		output.text = columnValue.text ?? (columnValue.display_value || null);
		output.displayValue = columnValue.display_value ?? '';
		if (columnValue.linked_item_ids) {
			output.linkedItemIds = columnValue.linked_item_ids;
		}
		if (columnValue.linked_items) {
			output.linkedItems = columnValue.linked_items as unknown as IDataObject[];
		}
		if (columnValue.dependency_links) {
			output.dependencyLinks = columnValue.dependency_links as unknown as IDataObject[];
		}
	}
	return output;
}

/**
 * Item: Get Column Value — items(ids:) { column_values(ids:) }, one column.
 * A column with no value set still yields a record (text/value null), so
 * downstream nodes can branch on emptiness without erroring.
 */
export async function getColumnValue(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject> {
	const itemId = this.getNodeParameter('itemId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const columnId = this.getNodeParameter('columnId', itemIndex) as string;

	const data = await client.execute(
		`query ($ids: [ID!], $columnIds: [String!]) {
			items(ids: $ids) {
				id
				name
				column_values(ids: $columnIds, ${COLUMN_VALUES_CALCULATED_ARG}) {
					id type text value column { title settings_str }
					${BATTERY_VALUE_FRAGMENT}
					${LINKED_VALUE_DETAIL_FRAGMENTS}
				}
			}
		}`,
		itemIndex,
		{ ids: [itemId], columnIds: [columnId] },
	);

	const item = ((data.items ?? []) as Array<IDataObject & { column_values?: ColumnValueRow[] }>)[0];
	if (!item) {
		throw new NodeOperationError(this.getNode(), `Item ${itemId} not found`, { itemIndex });
	}
	const columnValue = (item.column_values ?? []).find((row) => row.id === columnId);
	if (!columnValue) {
		throw new NodeOperationError(
			this.getNode(),
			`Column ${columnId} not found on the item's board`,
			{ itemIndex },
		);
	}
	return formatColumnValueOutput(item as { id?: string; name?: string }, columnValue, columnId);
}

/**
 * Item: Get Many — cursor pagination via items_page / next_items_page.
 * Group and column-value filtering plus sorting all go through query_params,
 * which keeps a single cursor across the whole query. Emits one item per
 * record, plus an optional trailing { nextCursor } item for resuming.
 *
 * Include Subitems (multi-level boards) adds hierarchy_scope_config:
 * "allItems" — subject to two verified API bugs handled here: order_by is
 * silently ignored under that scope (blocked with an error), and an
 * unfiltered all-items query returns an empty page (worked around with a
 * tautological all-groups rule).
 */
export async function getManyItems(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject[]> {
	const boardId = this.getNodeParameter('boardId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;
	// No "Return All" — a bounded limit only, under Options with a default
	// (node-wide convention). The helper still walks the cursor internally
	// (100/request) until the limit is reached.
	const limit = (options.limit as number) ?? DEFAULT_LIMIT;
	const groupIds = normalizeIdList(options.groupIds);
	const columnIds = normalizeIdList(options.columnIds);
	const startingCursor = (options.startingCursor ?? '') as string;
	const includeCursor = options.includeCursor === true;
	const includeSubitems = options.includeSubitems === true;

	if (includeSubitems && options.sortBy && !startingCursor) {
		throw new NodeOperationError(
			this.getNode(),
			'Sort By Column cannot be combined with Include Subitems — the API silently ignores sorting when subitems are included. Remove one of the two options.',
			{ itemIndex },
		);
	}

	const filterRows =
		(this.getNodeParameter('itemFilters', itemIndex, {}) as { rules?: FilterRuleInput[] }).rules ??
		[];

	const rules: IDataObject[] = [];
	if (groupIds.length > 0) {
		rules.push({ column_id: 'group', compare_value: groupIds, operator: 'any_of' });
	}
	if (filterRows.length > 0) {
		// Column settings are needed to resolve status/dropdown label text
		// into the label indexes the API filters by.
		const columns = await fetchColumns(this, boardId, itemIndex);
		// Rollup status columns (BatteryValue) return silently wrong filter
		// results — the picker hides them, this guards expression-set IDs.
		const rollupStatusColumns = findRollupStatusRuleColumns(filterRows, columns);
		if (rollupStatusColumns.length > 0) {
			throw new NodeOperationError(
				this.getNode(),
				`Cannot filter on ${rollupStatusColumns.join(', ')}: status columns that roll up child values (multi-level boards) return unreliable filter results in the monday API. Filter on a different column, or filter the output in n8n instead.`,
				{ itemIndex },
			);
		}
		// Stale dropdown selections (n8n keeps the operator when the column
		// changes) and expression-mode column IDs can pair a column with an
		// operator its type rejects — fail with the supported list up front.
		const unsupportedOperatorRules = findUnsupportedOperatorRules(filterRows, columns);
		if (unsupportedOperatorRules.length > 0) {
			throw new NodeOperationError(
				this.getNode(),
				formatUnsupportedOperatorMessage(unsupportedOperatorRules),
				{ itemIndex },
			);
		}
		rules.push(...buildFilterRules(filterRows, columns));
	}
	if (includeSubitems && rules.length === 0 && !startingCursor) {
		// Verified API bug: the all-items scope returns an empty page when no
		// rules are set at all. A rule matching every group is a no-op filter.
		rules.push(buildAllGroupsRule(await fetchBoardGroupIds(client, itemIndex, boardId)));
	}

	const orderBy = options.sortBy
		? [{ column_id: options.sortBy, direction: options.sortDirection ?? 'asc' }]
		: undefined;

	let queryParams: IDataObject | null = null;
	if (rules.length > 0 || orderBy) {
		queryParams = {};
		if (rules.length > 0) {
			queryParams.rules = rules;
			queryParams.operator = options.filtersMatch ?? 'and';
		}
		if (orderBy) {
			queryParams.order_by = orderBy;
		}
	}

	// Column IDs come from the picker or an expression; serialize them as a
	// JSON string array, which is valid GraphQL list syntax for [String!].
	// Empty selection = all columns. The item name is a top-level field, so
	// it is always present regardless of this selection. CALCULATED is
	// always requested — without it, rollup columns (multi-level boards)
	// are silently missing from column_values.
	const columnArgs =
		columnIds.length > 0
			? `(ids: ${JSON.stringify(columnIds)}, ${COLUMN_VALUES_CALCULATED_ARG})`
			: `(${COLUMN_VALUES_CALCULATED_ARG})`;
	const itemFields = `
		id
		name
		state
		url
		created_at
		updated_at
		group { id title }
		${includeSubitems ? 'parent_item { id name }' : ''}
		column_values${columnArgs} { id type text value ${BATTERY_VALUE_FRAGMENT} ${LINKED_VALUE_FRAGMENTS} }
	`;

	interface ItemsPagePayload {
		boards?: Array<{ items_page?: { cursor: string | null; items: IDataObject[] } }>;
	}

	// The hierarchy scope only exists on the first query; follow-up
	// next_items_page calls inherit it through the cursor.
	const scopeArg = includeSubitems ? ', hierarchy_scope_config: "allItems"' : '';

	const { rows, nextCursor } = await fetchAllByCursor({
		client,
		itemIndex,
		firstQuery: `query ($boardId: [ID!], $limit: Int!, $queryParams: ItemsQuery) {
			boards(ids: $boardId) {
				items_page(limit: $limit, query_params: $queryParams${scopeArg}) {
					cursor
					items { ${itemFields} }
				}
			}
		}`,
		firstVariables: {
			boardId: [boardId],
			queryParams,
		},
		extractFirstPage: (data) => {
			const page = (data as ItemsPagePayload).boards?.[0]?.items_page;
			return page ? { cursor: page.cursor, items: page.items } : undefined;
		},
		itemFields,
		limit,
		startCursor: startingCursor || undefined,
	});

	return includeCursor ? [...rows, { nextCursor }] : rows;
}
