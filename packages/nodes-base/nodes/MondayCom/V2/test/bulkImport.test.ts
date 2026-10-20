import { describe, expect, it } from 'vitest';

import {
	BULK_IMPORT_MATCH_COLUMN_TYPES,
	BULK_IMPORT_SUPPORTED_COLUMN_TYPES,
	buildBulkImportCsv,
	BulkImportInputError,
	csvEscape,
	formatCsvCell,
	MAX_BACKFILL_ROWS,
	MAX_INGEST_ROWS,
	parseCsv,
	parseReportRows,
	summarizeJobStatus,
} from '../helpers/bulkImport';

describe('csvEscape', () => {
	it('passes plain values through', () => {
		expect(csvEscape('hello')).toBe('hello');
		expect(csvEscape('')).toBe('');
	});

	it('quotes separators, quotes and newlines', () => {
		expect(csvEscape('a,b')).toBe('"a,b"');
		expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
		expect(csvEscape('line1\nline2')).toBe('"line1\nline2"');
		expect(csvEscape('line1\r\nline2')).toBe('"line1\r\nline2"');
	});
});

describe('formatCsvCell', () => {
	it('maps null/undefined to empty', () => {
		expect(formatCsvCell('text', null)).toBe('');
		expect(formatCsvCell('text', undefined)).toBe('');
	});

	it('maps booleans to checkbox words', () => {
		expect(formatCsvCell('checkbox', true)).toBe('true');
		expect(formatCsvCell('checkbox', false)).toBe('false');
	});

	it('trims dateTime picker values to the date part', () => {
		expect(formatCsvCell('date', '2026-08-01T15:30:00')).toBe('2026-08-01');
		expect(formatCsvCell('date', '2026-08-01')).toBe('2026-08-01');
		// Non-ISO passes through so the API can report the validation error.
		expect(formatCsvCell('date', 'tomorrow')).toBe('tomorrow');
	});

	it('stringifies numbers', () => {
		expect(formatCsvCell('numbers', 42.5)).toBe('42.5');
	});

	it('preserves the <NULL> clearing sentinel', () => {
		expect(formatCsvCell('text', '<NULL>')).toBe('<NULL>');
	});
});

describe('buildBulkImportCsv', () => {
	const columnTypes = {
		name: 'name',
		text1: 'text',
		status1: 'status',
		date1: 'date',
		num1: 'numbers',
	};
	const columnOrder = ['name', 'text1', 'status1', 'date1', 'num1'];

	it('builds header from mapped columns in board order', () => {
		const { csv, rowCount, columnIds } = buildBulkImportCsv(
			[
				{ name: 'Row 1', num1: 10, text1: 'hello' },
				{ name: 'Row 2', status1: 'Done' },
			],
			columnTypes,
			columnOrder,
		);
		expect(columnIds).toEqual(['text1', 'status1', 'num1']);
		expect(rowCount).toBe(2);
		expect(csv).toBe('name,text1,status1,num1\nRow 1,hello,,10\nRow 2,,Done,\n');
	});

	it('escapes cells with commas and quotes', () => {
		const { csv } = buildBulkImportCsv(
			[{ name: 'Has, comma', text1: 'say "hi"' }],
			columnTypes,
			columnOrder,
		);
		expect(csv).toBe('name,text1\n"Has, comma","say ""hi"""\n');
	});

	it('throws on unknown column IDs', () => {
		expect(() =>
			buildBulkImportCsv([{ name: 'Row', ghost: 'x' }], columnTypes, columnOrder),
		).toThrowError(BulkImportInputError);
	});

	it('throws on unsupported column types', () => {
		expect(() =>
			buildBulkImportCsv([{ name: 'Row', filecol: 'x' }], { ...columnTypes, filecol: 'file' }, [
				...columnOrder,
				'filecol',
			]),
		).toThrowError(/not supported by bulk import/);
	});

	it('throws when a row has no name', () => {
		expect(() =>
			buildBulkImportCsv([{ name: 'ok' }, { text1: 'no name' }], columnTypes, columnOrder),
		).toThrowError(/Input item 2 has no item name/);
	});

	it('trims date values from the dateTime picker', () => {
		const { csv } = buildBulkImportCsv(
			[{ name: 'Row', date1: '2026-08-01T00:00:00' }],
			columnTypes,
			columnOrder,
		);
		expect(csv).toContain('Row,2026-08-01');
	});
});

describe('parseCsv', () => {
	it('parses simple rows', () => {
		expect(parseCsv('a,b\n1,2\n')).toEqual([
			['a', 'b'],
			['1', '2'],
		]);
	});

	it('handles quoted cells with commas, escaped quotes, and newlines', () => {
		expect(parseCsv('a,b\n"x,y","say ""hi"""\n"line1\nline2",z\n')).toEqual([
			['a', 'b'],
			['x,y', 'say "hi"'],
			['line1\nline2', 'z'],
		]);
	});

	it('handles CRLF line endings and missing trailing newline', () => {
		expect(parseCsv('a,b\r\n1,2')).toEqual([
			['a', 'b'],
			['1', '2'],
		]);
	});
});

describe('parseReportRows', () => {
	// Real report shape observed live 2026-07-17.
	const report =
		'serialNo,status,itemId,error,color1,date1\n' +
		'1,success,12559470820,,,\n' +
		'2,validation_error,,"[color1]: Label ""NotALabel"" is invalid for column ""color1""","Label ""NotALabel"" is invalid for column ""color1""",\n';

	it('keys rows by the report header', () => {
		const rows = parseReportRows(report);
		expect(rows).toHaveLength(2);
		expect(rows[0]).toEqual({
			serialNo: 1,
			status: 'success',
			itemId: '12559470820',
			error: null,
			color1: null,
			date1: null,
		});
		expect(rows[1].serialNo).toBe(2);
		expect(rows[1].status).toBe('validation_error');
		expect(rows[1].itemId).toBeNull();
		expect(rows[1].error).toContain('Label "NotALabel" is invalid');
	});

	it('returns empty for header-only or empty reports', () => {
		expect(parseReportRows('serialNo,status,itemId,error\n')).toEqual([]);
		expect(parseReportRows('')).toEqual([]);
	});
});

describe('summarizeJobStatus', () => {
	it('shapes the ItemsJobStatus into the summary row without report_url', () => {
		expect(
			summarizeJobStatus('job-1', {
				status: 'COMPLETED',
				counts: { submitted: 3, invalid: 1, skipped: 0, created: 2, updated: 0, failed: 0 },
				progress_percentage: 100,
				failure_reason: null,
				failure_message: null,
				fully_imported: true,
				report_created: true,
				report_url: 'https://s3.example/expiring',
			}),
		).toEqual({
			jobId: 'job-1',
			status: 'COMPLETED',
			counts: { submitted: 3, invalid: 1, skipped: 0, created: 2, updated: 0, failed: 0 },
			progressPercentage: 100,
			fullyImported: true,
			failureReason: null,
			failureMessage: null,
			reportCreated: true,
		});
	});

	it('nulls missing fields', () => {
		expect(summarizeJobStatus('job-2', {})).toEqual({
			jobId: 'job-2',
			status: null,
			counts: {
				submitted: null,
				invalid: null,
				skipped: null,
				created: null,
				updated: null,
				failed: null,
			},
			progressPercentage: null,
			fullyImported: null,
			failureReason: null,
			failureMessage: null,
			reportCreated: null,
		});
	});
});

describe('constants', () => {
	it('matches the documented caps and supported types', () => {
		expect(MAX_INGEST_ROWS).toBe(10000);
		expect(MAX_BACKFILL_ROWS).toBe(20000);
		expect(BULK_IMPORT_SUPPORTED_COLUMN_TYPES.has('status')).toBe(true);
		expect(BULK_IMPORT_SUPPORTED_COLUMN_TYPES.has('file')).toBe(false);
		expect(BULK_IMPORT_MATCH_COLUMN_TYPES.has('name')).toBe(true);
		expect(BULK_IMPORT_MATCH_COLUMN_TYPES.has('dropdown')).toBe(false);
	});
});
