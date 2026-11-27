import { sleep } from '@n8n/utils/sleep';
import {
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
	NodeOperationError,
} from 'n8n-workflow';
import type { Readable } from 'stream';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { boardResourceLocator } from '../../helpers/boardLocator';
import {
	buildBulkImportCsv,
	BULK_IMPORT_POLL_INTERVAL_MS,
	BULK_IMPORT_TERMINAL_STATES,
	BulkImportInputError,
	MAX_BACKFILL_ROWS,
	MAX_INGEST_ROWS,
	summarizeJobStatus,
} from '../../helpers/bulkImport';
import { fetchBulkImportJobStatus, fetchBulkImportReportRows } from '../../helpers/bulkImportJob';
import { extractMappedValues, fetchColumns } from '../../helpers/columnMapper';
import {
	assertPresignedStorageUrl,
	PRESIGNED_URL_REQUEST_OPTIONS,
	resolveBinaryUpload,
} from '../../helpers/fileTransfer';
import { fetchBoardGroupIds } from '../../helpers/multiLevel';
import type { MondayGraphQLClient } from '../../transport/MondayGraphQLClient';

const properties: INodeProperties[] = [
	boardResourceLocator,
	{
		displayName:
			"All input items become ONE import job: in Map Columns mode every incoming item is one CSV row (up to 10,000 per job). The import runs asynchronously on monday's side — with Wait for Completion the node polls every 10 seconds until the job finishes.",
		name: 'bulkImportNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Group Name or ID',
		name: 'bulkImportGroupId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getBoardGroups',
			loadOptionsDependsOn: ['boardId.value'],
		},
		default: '',
		description:
			'The group newly created items are added to; leave empty for the board\'s top group. With Upsert/Skip matching, matching is board-wide — this only places NEW items. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Import Type',
		name: 'bulkImportType',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Backfill (Admin Only)',
				value: 'backfill',
				description:
					'One-time initial board seeding: requires an account admin token, never triggers automations, writes nothing to the activity log, always creates new items. Up to 20,000 rows per job.',
			},
			{
				name: 'Ingest (Recommended)',
				value: 'ingest',
				description:
					'Behaves like normal board activity: automations fire, the activity log records changes, Upsert/Skip matching available. Up to 10,000 rows per job.',
			},
		],
		default: 'ingest',
		description: 'Which import mutation to use',
	},
	{
		displayName: 'Data Source',
		name: 'bulkImportSource',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'CSV File',
				value: 'file',
				description:
					'Upload a ready CSV from a binary field — header must be name (or name.l1…name.l5 for multi-level hierarchy files) plus exact column IDs',
			},
			{
				name: 'Map Columns',
				value: 'mapped',
				description: 'Build the CSV from the input items via a column mapping',
			},
		],
		default: 'mapped',
		description: 'Where the import rows come from',
	},
	{
		displayName: 'Columns',
		name: 'bulkImportColumns',
		type: 'resourceMapper',
		noDataExpression: true,
		default: { mappingMode: 'defineBelow', value: null },
		typeOptions: {
			loadOptionsDependsOn: ['boardId.value'],
			resourceMapper: {
				resourceMapperMethod: 'getBulkImportColumnFields',
				mode: 'add',
				fieldWords: { singular: 'column', plural: 'columns' },
				addAllFields: false,
				supportAutoMap: false,
			},
		},
		displayOptions: {
			show: { bulkImportSource: ['mapped'] },
		},
	},
	{
		displayName: 'Input Binary Field',
		name: 'bulkImportBinaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		hint: 'The name of the input binary field containing the CSV file to import',
		displayOptions: {
			show: { bulkImportSource: ['file'] },
		},
	},
	{
		displayName: 'On Match',
		name: 'bulkImportOnMatch',
		type: 'options',
		options: [
			{
				name: 'Always Create',
				value: 'none',
				description: 'Every row creates a new item',
			},
			{
				name: 'Skip',
				value: 'SKIP',
				description: 'Skip rows whose match value already exists on the board',
			},
			{
				name: 'Upsert',
				value: 'UPSERT',
				description:
					'Update the existing item when the match column value already exists on the board, otherwise create. Empty cells preserve the existing value; a cell containing exactly &lt;NULL&gt; clears it.',
			},
		],
		default: 'none',
		description:
			'How to handle rows whose match column value already exists on the board. Not available for multi-level hierarchy files (they always create).',
		displayOptions: { show: { bulkImportType: ['ingest'] } },
	},
	{
		displayName: 'Match Column Name or ID',
		name: 'bulkImportMatchColumnId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getBulkImportMatchColumns',
			loadOptionsDependsOn: ['boardId.value'],
		},
		default: '',
		required: true,
		description:
			'The column existing items are matched on (board-wide). If several rows share a match value, only the last row is applied; if several items match, the most recently created one is updated. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				bulkImportType: ['ingest'],
				bulkImportOnMatch: ['UPSERT', 'SKIP'],
			},
		},
	},
	{
		displayName: 'Wait for Completion',
		name: 'bulkImportWait',
		type: 'boolean',
		default: true,
		description:
			'Whether to wait for the import job to finish (polling every 10 seconds, up to Max Wait Time) and return its result. When off, save the job ID and poll manually with Get Bulk Import Status every 10 seconds.',
	},
	{
		displayName: 'Options',
		name: 'bulkImportOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Include Row Results',
				name: 'includeRowResults',
				type: 'boolean',
				default: false,
				description:
					"Whether to also output one item per imported row from monday's import report (serial number, status, item ID, error) — useful for routing failed rows. Requires Wait for Completion.",
			},
			{
				displayName: 'Max Wait Time',
				name: 'maxWaitTime',
				type: 'number',
				typeOptions: { minValue: 30 },
				default: 1800,
				description:
					"How long to wait for the job to finish, in seconds, before giving up with an error (the job itself keeps running on monday's side)",
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['item'],
		operation: ['bulkImport'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

/**
 * Item: Bulk Import — one asynchronous CSV import job per execution:
 * start ingest_items/backfill_items, PUT the CSV to the pre-signed URL
 * (valid 10 minutes, so the upload happens immediately), then optionally
 * poll fetch_job_status every 10s until a terminal state.
 */
export async function execute(
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
	// 10 minutes, so everything slow happens first. A file source is
	// streamed from binary storage rather than buffered.
	let csvBody: Buffer | Readable;
	let csvLength: number;
	let mappedMode = false;
	if (source === 'file') {
		const binaryPropertyName = this.getNodeParameter('bulkImportBinaryPropertyName', 0) as string;
		const upload = await resolveBinaryUpload(this, 0, binaryPropertyName);
		csvBody = upload.body;
		csvLength = upload.contentLength;
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
			csvBody = Buffer.from(built.csv, 'utf-8');
			csvLength = csvBody.length;
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
	assertPresignedStorageUrl(this.getNode(), jobInit.upload_url, 'upload', 0);

	// Pre-signed S3 PUT: no auth header, and no extra headers beyond the
	// standard ones — an unsigned x-amz-checksum-crc32 header makes S3
	// reject the upload (403). Content-Length is required for a stream body.
	await this.helpers.httpRequest({
		method: 'PUT',
		url: jobInit.upload_url,
		body: csvBody,
		headers: { 'Content-Type': 'text/csv', 'Content-Length': String(csvLength) },
		...PRESIGNED_URL_REQUEST_OPTIONS,
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
