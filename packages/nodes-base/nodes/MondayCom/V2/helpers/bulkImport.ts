import type { IDataObject } from 'n8n-workflow';

/**
 * Item: Bulk Import — pure helpers for the CSV-based ingest_items /
 * backfill_items workflow (API 2026-07+): CSV assembly from mapped values,
 * quote-aware CSV parsing for the per-row report, and job-status shaping.
 *
 * The import flow is asynchronous: start a job (mutation returns job_id +
 * a pre-signed S3 upload_url valid 10 minutes), PUT the CSV, then poll
 * fetch_job_status until a terminal state. All verified live 2026-07-17.
 */

/** Row caps enforced by monday per uploaded file. */
export const MAX_INGEST_ROWS = 10000;
export const MAX_BACKFILL_ROWS = 20000;

/** Poll fetch_job_status about every 10 seconds — monday's documented pace. */
export const BULK_IMPORT_POLL_INTERVAL_MS = 10000;

/** Job states that end the wait loop (live enum: BulkImportState). */
export const BULK_IMPORT_TERMINAL_STATES = new Set(['COMPLETED', 'FAILED', 'REJECTED']);

/**
 * Column types bulk import accepts as CSV values (docs "Supported column
 * types"). Rows containing other column types fail validation server-side;
 * the mapper never offers them.
 */
export const BULK_IMPORT_SUPPORTED_COLUMN_TYPES = new Set([
	'board_relation',
	'checkbox',
	'date',
	'dropdown',
	'email',
	'link',
	'location',
	'long_text',
	'numbers',
	'people',
	'phone',
	'status',
	'text',
	'timeline',
]);

/** Column types on_match.match_column_id accepts (docs + verified live). */
export const BULK_IMPORT_MATCH_COLUMN_TYPES = new Set([
	'date',
	'email',
	'link',
	'long_text',
	'name',
	'numbers',
	'phone',
	'status',
	'text',
]);

/** Wraps a CSV cell in quotes when it contains a separator, quote, or newline. */
export function csvEscape(value: string): string {
	if (/[",\r\n]/.test(value)) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

/**
 * Converts one mapped value into its CSV cell text. Bulk import wants
 * display-text formats (status label, ISO date, ...), not column_values
 * JSON. Booleans map to the checkbox truthy/falsy words; dateTime picker
 * values are trimmed to the date part the API requires.
 */
export function formatCsvCell(columnType: string | undefined, value: unknown): string {
	if (value === null || value === undefined) return '';
	if (typeof value === 'boolean') return value ? 'true' : 'false';
	const text = String(value);
	if (columnType === 'date') {
		const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
		if (match) return match[1];
	}
	return text;
}

export interface BulkImportCsvResult {
	csv: string;
	/** Data rows (excluding the header). */
	rowCount: number;
	/** Column IDs in header order, after the leading name column. */
	columnIds: string[];
}

/**
 * Builds the import CSV from per-input-item mapped values. The header is
 * `name` followed by every mapped column ID, ordered by the board's column
 * order (stable across rows — the mapping schema is static, only values
 * vary per item). Throws on unknown/unsupported columns and empty names so
 * bad files never reach the upload step.
 */
export function buildBulkImportCsv(
	mappedRows: Array<Record<string, unknown>>,
	columnTypes: Record<string, string>,
	columnOrder: string[],
): BulkImportCsvResult {
	const columnIdSet = new Set<string>();
	for (const row of mappedRows) {
		for (const key of Object.keys(row)) {
			if (key !== 'name') columnIdSet.add(key);
		}
	}

	const unknown = [...columnIdSet].filter((id) => !(id in columnTypes));
	if (unknown.length > 0) {
		throw new BulkImportInputError(
			`Unknown column ID(s) for this board: ${unknown.join(', ')}. Re-open the column mapping after changing the board.`,
		);
	}
	const unsupported = [...columnIdSet].filter(
		(id) => !BULK_IMPORT_SUPPORTED_COLUMN_TYPES.has(columnTypes[id]),
	);
	if (unsupported.length > 0) {
		throw new BulkImportInputError(
			`Column type not supported by bulk import: ${unsupported
				.map((id) => `${id} (${columnTypes[id]})`)
				.join(', ')}`,
		);
	}

	const orderIndex = new Map(columnOrder.map((id, index) => [id, index]));
	const columnIds = [...columnIdSet].sort(
		(a, b) =>
			(orderIndex.get(a) ?? Number.MAX_SAFE_INTEGER) -
			(orderIndex.get(b) ?? Number.MAX_SAFE_INTEGER),
	);

	const lines = [['name', ...columnIds].map(csvEscape).join(',')];
	for (const [rowIndex, row] of mappedRows.entries()) {
		const name = formatCsvCell('name', row.name).trim();
		if (name === '') {
			throw new BulkImportInputError(
				`Input item ${rowIndex + 1} has no item name — map the Name column for every row`,
			);
		}
		const cells = [name, ...columnIds.map((id) => formatCsvCell(columnTypes[id], row[id]))];
		lines.push(cells.map(csvEscape).join(','));
	}

	return { csv: lines.join('\n') + '\n', rowCount: mappedRows.length, columnIds };
}

/** Thrown by the pure builders; the node maps it to a NodeOperationError. */
export class BulkImportInputError extends Error {}

/**
 * Minimal quote-aware CSV parser for monday's import report files
 * (serialNo,status,itemId,error + one error column per failed column).
 * Handles quoted cells with doubled quotes and embedded newlines/commas.
 */
export function parseCsv(text: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let cell = '';
	let inQuotes = false;

	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		if (inQuotes) {
			if (char === '"') {
				if (text[i + 1] === '"') {
					cell += '"';
					i++;
				} else {
					inQuotes = false;
				}
			} else {
				cell += char;
			}
			continue;
		}
		if (char === '"') {
			inQuotes = true;
		} else if (char === ',') {
			row.push(cell);
			cell = '';
		} else if (char === '\n' || char === '\r') {
			if (char === '\r' && text[i + 1] === '\n') i++;
			row.push(cell);
			cell = '';
			// Skip fully empty trailing lines.
			if (row.length > 1 || row[0] !== '') rows.push(row);
			row = [];
		} else {
			cell += char;
		}
	}
	if (cell !== '' || row.length > 0) {
		row.push(cell);
		if (row.length > 1 || row[0] !== '') rows.push(row);
	}
	return rows;
}

/**
 * Parses the per-row import report into output objects keyed by the report
 * header. serialNo is the 1-based data-row number in the uploaded file.
 */
export function parseReportRows(text: string): IDataObject[] {
	const rows = parseCsv(text);
	if (rows.length < 2) return [];
	const [header, ...dataRows] = rows;
	return dataRows.map((cells) => {
		const record: IDataObject = {};
		header.forEach((key, index) => {
			const value = cells[index] ?? '';
			if (key === 'serialNo') {
				const numeric = Number(value);
				record[key] = Number.isNaN(numeric) ? value : numeric;
			} else {
				record[key] = value === '' ? null : value;
			}
		});
		return record;
	});
}

/** Raw ItemsJobStatus shape as returned by fetch_job_status. */
export interface RawItemsJobStatus extends IDataObject {
	status?: string;
	counts?: IDataObject;
	progress_percentage?: number;
	failure_reason?: string | null;
	failure_message?: string | null;
	fully_imported?: boolean;
	report_created?: boolean;
	report_url?: string | null;
}

/**
 * Shapes an ItemsJobStatus into the node's summary output row. report_url
 * is deliberately dropped — it expires after 10 minutes, so the node always
 * downloads the report itself instead of handing the URL downstream.
 * Note: fully_imported only tracks failed rows — a job with invalid rows
 * still reports fully_imported: true (verified live), hence the counts.
 */
export function summarizeJobStatus(jobId: string, raw: RawItemsJobStatus): IDataObject {
	const counts = (raw.counts ?? {}) as IDataObject;
	return {
		jobId,
		status: raw.status ?? null,
		counts: {
			submitted: counts.submitted ?? null,
			invalid: counts.invalid ?? null,
			skipped: counts.skipped ?? null,
			created: counts.created ?? null,
			updated: counts.updated ?? null,
			failed: counts.failed ?? null,
		},
		progressPercentage: raw.progress_percentage ?? null,
		fullyImported: raw.fully_imported ?? null,
		failureReason: raw.failure_reason ?? null,
		failureMessage: raw.failure_message ?? null,
		reportCreated: raw.report_created ?? null,
	};
}
