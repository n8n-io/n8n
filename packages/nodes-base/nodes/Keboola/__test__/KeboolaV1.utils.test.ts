import { UnexpectedError } from 'n8n-workflow';

import { fixtures } from './fixtures/utils.fixtures';
import {
	buildCsvFromItems,
	parseCsv,
	createTableIdentifiers,
	parsePrimaryKeys,
	extractColumnsFromItems,
	validateBucketId,
	createUploadUrl,
	formatUploadSuccessMessage,
} from '../V1/KeboolaV1.utils';

describe('buildCsvFromItems', () => {
	test('converts items to CSV string', () => {
		const { csvItems, csvColumns } = fixtures;
		const result = buildCsvFromItems(csvItems, csvColumns);
		expect(result).toBe('id,name\n1,Alice\n2,Bob');
	});

	test('escapes commas and quotes', () => {
		const { escapedItems, csvColumns } = fixtures;
		const result = buildCsvFromItems(escapedItems, csvColumns);
		expect(result).toBe('id,name\n1,"Alice, ""the Brave"""');
	});

	test('throws on empty input', () => {
		expect(() => buildCsvFromItems([], ['id'])).toThrow(UnexpectedError);
	});
});

describe('parseCsv', () => {
	test('parses CSV to array of objects', () => {
		const { csvRaw, csvColumns, csvParsed } = fixtures;
		const result = parseCsv(csvRaw, csvColumns);
		expect(result).toEqual(csvParsed);
	});
});

describe('createTableIdentifiers', () => {
	test('returns identifiers and incremental flag', () => {
		const { uploadParams, expectedIdentifiers } = fixtures;
		const result = createTableIdentifiers(uploadParams);
		expect(result).toEqual(expectedIdentifiers);
	});
});

describe('parsePrimaryKeys', () => {
	test('splits and trims primary keys', () => {
		expect(parsePrimaryKeys('id, name ,email')).toEqual(['id', 'name', 'email']);
	});

	test('returns empty array for empty input', () => {
		expect(parsePrimaryKeys('')).toEqual([]);
	});
});

describe('extractColumnsFromItems', () => {
	test('extracts keys from first item', () => {
		const { columnItems } = fixtures;
		expect(extractColumnsFromItems(columnItems)).toEqual(['a', 'b']);
	});

	test('throws if items are empty', () => {
		expect(() => extractColumnsFromItems([])).toThrow(UnexpectedError);
	});
});

describe('validateBucketId', () => {
	test('splits bucket ID into stage and name', () => {
		expect(validateBucketId('in.c-demo')).toEqual({ stage: 'in', name: 'demo' });
	});

	test('throws on invalid format', () => {
		expect(() => validateBucketId('bad_format')).toThrow(UnexpectedError);
	});
});

describe('createUploadUrl', () => {
	test('replaces connection domain with import domain', () => {
		expect(createUploadUrl('https://connection.keboola.com')).toBe(
			'https://import.keboola.com/upload-file',
		);
	});
});

describe('formatUploadSuccessMessage', () => {
	test('returns formatted message', () => {
		expect(formatUploadSuccessMessage(5, 'in.c-bucket.table')).toBe(
			'Uploaded 5 rows to in.c-bucket.table',
		);
	});
});
