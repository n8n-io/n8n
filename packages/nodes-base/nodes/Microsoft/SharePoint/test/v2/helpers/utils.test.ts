import type { INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import {
	odataFieldEqualsClause,
	SHAREPOINT_ILLEGAL_FILE_NAME_CHARS,
	validateSharePointFileName,
} from '../../../v2/helpers/utils';

describe('Microsoft SharePoint v2 — validateSharePointFileName', () => {
	const node = mock<INode>();

	it('accepts an ordinary file name', () => {
		expect(() => validateSharePointFileName(node, 'report.pdf', 0)).not.toThrow();
	});

	it.each([undefined, '', '   '])('rejects a missing or blank name (%j)', (fileName) => {
		expect(() => validateSharePointFileName(node, fileName as string | undefined, 0)).toThrow(
			'File name must be set!',
		);
	});

	it.each(SHAREPOINT_ILLEGAL_FILE_NAME_CHARS)('rejects a name containing %s', (char) => {
		expect(() => validateSharePointFileName(node, `a${char}b.txt`, 0)).toThrow(
			`contains characters that SharePoint doesn't allow: ${char}`,
		);
	});

	it('names every offending character at once', () => {
		expect(() => validateSharePointFileName(node, 'a:b*c.txt', 0)).toThrow(
			"contains characters that SharePoint doesn't allow: * :",
		);
	});

	it('suggests a colon-free timestamp format only when a colon is present', () => {
		try {
			validateSharePointFileName(node, 'report 12:30.pdf', 0);
			expect.unreachable('should have thrown');
		} catch (error) {
			expect((error as { description?: string }).description).toContain('colon-free format');
		}

		try {
			validateSharePointFileName(node, 'report?.pdf', 0);
			expect.unreachable('should have thrown');
		} catch (error) {
			expect((error as { description?: string }).description).not.toContain('colon-free format');
		}
	});
});

describe('Microsoft SharePoint v2 — odataFieldEqualsClause', () => {
	it('quotes the value as a string literal', () => {
		expect(odataFieldEqualsClause('Title', 'Report')).toBe("fields/Title eq 'Report'");
	});

	it('doubles single quotes inside the value', () => {
		expect(odataFieldEqualsClause('Author', "O'Brien")).toBe("fields/Author eq 'O''Brien'");
		expect(odataFieldEqualsClause('Note', "a'b'c")).toBe("fields/Note eq 'a''b''c'");
	});

	it('keeps a value that is only quotes intact', () => {
		expect(odataFieldEqualsClause('Note', "''")).toBe("fields/Note eq ''''''");
	});

	it.each([null, undefined])('compares %s against the empty string, like v1', (value) => {
		expect(odataFieldEqualsClause('Title', value)).toBe("fields/Title eq ''");
	});

	it('stringifies non-string values', () => {
		expect(odataFieldEqualsClause('Count', 3)).toBe("fields/Count eq '3'");
		expect(odataFieldEqualsClause('Done', false)).toBe("fields/Done eq 'false'");
	});

	it('leaves characters the URL layer owns untouched', () => {
		expect(odataFieldEqualsClause('Title', 'a & b % c + d')).toBe(
			"fields/Title eq 'a & b % c + d'",
		);
	});
});
