import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import * as helpers from '../v2/helpers';

const mockNode: INode = {
	id: 'test-node',
	name: 'Supabase',
	type: 'n8n-nodes-base.supabase',
	typeVersion: 2,
	position: [0, 0],
	parameters: {},
};

// ─────────────────────────────────────────────
// Unit tests: quoteIdentifier
// ─────────────────────────────────────────────

describe('quoteIdentifier', () => {
	it('wraps a valid identifier in double quotes', () => {
		expect(helpers.quoteIdentifier('my_column', mockNode)).toBe('"my_column"');
	});

	it('accepts identifiers starting with underscore', () => {
		expect(helpers.quoteIdentifier('_private', mockNode)).toBe('"_private"');
	});

	it('accepts identifiers with dollar signs', () => {
		expect(helpers.quoteIdentifier('col$1', mockNode)).toBe('"col$1"');
	});

	it('throws on identifiers starting with a digit', () => {
		expect(() => helpers.quoteIdentifier('1bad', mockNode)).toThrow(NodeOperationError);
	});

	it('throws on identifiers with spaces', () => {
		expect(() => helpers.quoteIdentifier('col name', mockNode)).toThrow(NodeOperationError);
	});

	it('throws on identifiers with hyphens', () => {
		expect(() => helpers.quoteIdentifier('col-name', mockNode)).toThrow(NodeOperationError);
	});

	it('throws on identifiers with semicolons (injection attempt)', () => {
		expect(() => helpers.quoteIdentifier('col; DROP TABLE users; --', mockNode)).toThrow(
			NodeOperationError,
		);
	});

	it('throws on empty string', () => {
		expect(() => helpers.quoteIdentifier('', mockNode)).toThrow(NodeOperationError);
	});
});

// ─────────────────────────────────────────────
// Unit tests: buildWhereClause
// ─────────────────────────────────────────────

describe('buildWhereClause', () => {
	it('joins conditions with AND for allFilters', () => {
		const result = helpers.buildWhereClause(
			[
				{ keyName: 'age', condition: 'gt', keyValue: '18' },
				{ keyName: 'status', condition: 'eq', keyValue: 'active' },
			],
			'allFilters',
			1,
			mockNode,
		);
		expect(result.clause).toBe('"age" > $1 AND "status" = $2');
		expect(result.params).toEqual(['18', 'active']);
	});

	it('joins conditions with OR for anyFilter', () => {
		const result = helpers.buildWhereClause(
			[
				{ keyName: 'age', condition: 'lt', keyValue: '10' },
				{ keyName: 'age', condition: 'gt', keyValue: '90' },
			],
			'anyFilter',
			1,
			mockNode,
		);
		expect(result.clause).toBe('"age" < $1 OR "age" > $2');
		expect(result.params).toEqual(['10', '90']);
	});

	it('handles neq, gte, lte conditions', () => {
		const result = helpers.buildWhereClause(
			[
				{ keyName: 'score', condition: 'neq', keyValue: '0' },
				{ keyName: 'score', condition: 'gte', keyValue: '5' },
				{ keyName: 'score', condition: 'lte', keyValue: '100' },
			],
			'allFilters',
			1,
			mockNode,
		);
		expect(result.clause).toBe('"score" <> $1 AND "score" >= $2 AND "score" <= $3');
		expect(result.params).toEqual(['0', '5', '100']);
	});

	it('replaces * with % for like', () => {
		const result = helpers.buildWhereClause(
			[{ keyName: 'name', condition: 'like', keyValue: 'Jo*n' }],
			'allFilters',
			1,
			mockNode,
		);
		expect(result.clause).toBe('"name" LIKE $1');
		expect(result.params).toEqual(['Jo%n']);
	});

	it('replaces * with % for ilike', () => {
		const result = helpers.buildWhereClause(
			[{ keyName: 'email', condition: 'ilike', keyValue: '*@example.com' }],
			'allFilters',
			1,
			mockNode,
		);
		expect(result.clause).toBe('"email" ILIKE $1');
		expect(result.params).toEqual(['%@example.com']);
	});

	it('handles IS NULL without a parameter', () => {
		const result = helpers.buildWhereClause(
			[{ keyName: 'deleted_at', condition: 'is', keyValue: 'null' }],
			'allFilters',
			1,
			mockNode,
		);
		expect(result.clause).toBe('"deleted_at" IS NULL');
		expect(result.params).toEqual([]);
	});

	it('handles IS TRUE / IS FALSE / IS UNKNOWN', () => {
		const trueResult = helpers.buildWhereClause(
			[{ keyName: 'active', condition: 'is', keyValue: 'true' }],
			'allFilters',
			1,
			mockNode,
		);
		expect(trueResult.clause).toBe('"active" IS TRUE');

		const falseResult = helpers.buildWhereClause(
			[{ keyName: 'active', condition: 'is', keyValue: 'false' }],
			'allFilters',
			1,
			mockNode,
		);
		expect(falseResult.clause).toBe('"active" IS FALSE');

		const unknownResult = helpers.buildWhereClause(
			[{ keyName: 'flag', condition: 'is', keyValue: 'unknown' }],
			'allFilters',
			1,
			mockNode,
		);
		expect(unknownResult.clause).toBe('"flag" IS UNKNOWN');
	});

	it('throws for invalid IS literal', () => {
		expect(() =>
			helpers.buildWhereClause(
				[{ keyName: 'col', condition: 'is', keyValue: 'maybe' }],
				'allFilters',
				1,
				mockNode,
			),
		).toThrow(NodeOperationError);
	});

	it('generates correct @@ expression for fts full-text search', () => {
		const result = helpers.buildWhereClause(
			[{ keyName: 'body', condition: 'fts', keyValue: 'hello' }],
			'allFilters',
			1,
			mockNode,
		);
		expect(result.clause).toBe('"body" @@ to_tsquery($1)');
		expect(result.params).toEqual(['hello']);
	});

	it('generates correct @@ expressions for plfts, phfts, wfts', () => {
		const plfts = helpers.buildWhereClause(
			[{ keyName: 'body', condition: 'plfts', keyValue: 'hello world' }],
			'allFilters',
			1,
			mockNode,
		);
		expect(plfts.clause).toBe('"body" @@ plainto_tsquery($1)');

		const phfts = helpers.buildWhereClause(
			[{ keyName: 'body', condition: 'phfts', keyValue: 'hello world' }],
			'allFilters',
			1,
			mockNode,
		);
		expect(phfts.clause).toBe('"body" @@ phraseto_tsquery($1)');

		const wfts = helpers.buildWhereClause(
			[{ keyName: 'body', condition: 'wfts', keyValue: 'hello -world' }],
			'allFilters',
			1,
			mockNode,
		);
		expect(wfts.clause).toBe('"body" @@ websearch_to_tsquery($1)');
	});

	it('handles fullText condition using the searchFunction sub-field', () => {
		const result = helpers.buildWhereClause(
			[{ keyName: 'body', condition: 'fullText', searchFunction: 'plfts', keyValue: 'hello' }],
			'allFilters',
			1,
			mockNode,
		);
		expect(result.clause).toBe('"body" @@ plainto_tsquery($1)');
		expect(result.params).toEqual(['hello']);
	});

	it('respects startIndex for parameter numbering', () => {
		const result = helpers.buildWhereClause(
			[{ keyName: 'id', condition: 'eq', keyValue: '42' }],
			'allFilters',
			5,
			mockNode,
		);
		expect(result.clause).toBe('"id" = $5');
		expect(result.params).toEqual(['42']);
	});

	it('throws on unknown condition type', () => {
		expect(() =>
			helpers.buildWhereClause(
				[{ keyName: 'col', condition: 'regex', keyValue: 'foo' }],
				'allFilters',
				1,
				mockNode,
			),
		).toThrow(NodeOperationError);
	});
});

// ─────────────────────────────────────────────
// Unit tests: buildTableRef
// ─────────────────────────────────────────────

describe('buildTableRef', () => {
	it('produces a fully quoted schema.table reference', () => {
		expect(helpers.buildTableRef('public', 'my_table', mockNode)).toBe('"public"."my_table"');
	});

	it('accepts underscores and dollar signs in both parts', () => {
		expect(helpers.buildTableRef('my_schema', 'tbl$1', mockNode)).toBe('"my_schema"."tbl$1"');
	});

	it('throws when schema name is invalid', () => {
		expect(() => helpers.buildTableRef('bad-schema', 'users', mockNode)).toThrow(
			NodeOperationError,
		);
	});

	it('throws when table name is invalid', () => {
		expect(() => helpers.buildTableRef('public', 'bad table', mockNode)).toThrow(
			NodeOperationError,
		);
	});
});

// ─────────────────────────────────────────────
// Unit tests: managementApiRequest
// ─────────────────────────────────────────────

describe('managementApiRequest', () => {
	const mockContext = {
		getNode: () => mockNode,
		helpers: {
			httpRequestWithAuthentication: jest.fn(),
		},
	} as unknown as IExecuteFunctions;

	beforeEach(() => {
		(mockContext.helpers.httpRequestWithAuthentication as jest.Mock).mockReset();
	});

	it('returns result rows from a successful response', async () => {
		const rows = [{ id: 1 }, { id: 2 }];
		(mockContext.helpers.httpRequestWithAuthentication as jest.Mock).mockResolvedValueOnce({
			result: rows,
		});

		const result = await helpers.managementApiRequest.call(
			mockContext,
			'myprojectref',
			'supabaseManagementApi',
			'SELECT 1',
		);

		expect(result).toEqual(rows);
		expect(mockContext.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'supabaseManagementApi',
			expect.objectContaining({
				method: 'POST',
				url: 'https://api.supabase.com/v1/projects/myprojectref/database/query',
				body: { query: 'SELECT 1' },
			}),
		);
	});

	it('includes parameters in the request body when provided', async () => {
		(mockContext.helpers.httpRequestWithAuthentication as jest.Mock).mockResolvedValueOnce({
			result: [],
		});

		await helpers.managementApiRequest.call(
			mockContext,
			'ref',
			'supabaseManagementApi',
			'SELECT * FROM t WHERE id = $1',
			[42],
		);

		expect(mockContext.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				body: { query: 'SELECT * FROM t WHERE id = $1', parameters: [42] },
			}),
		);
	});

	it('returns empty array when result is not an array', async () => {
		(mockContext.helpers.httpRequestWithAuthentication as jest.Mock).mockResolvedValueOnce({});

		const result = await helpers.managementApiRequest.call(
			mockContext,
			'ref',
			'supabaseManagementApi',
			'SELECT 1',
		);

		expect(result).toEqual([]);
	});

	it('wraps API errors in NodeApiError', async () => {
		(mockContext.helpers.httpRequestWithAuthentication as jest.Mock).mockRejectedValueOnce({
			message: 'Bad request',
			description: 'table does not exist',
		});

		await expect(
			helpers.managementApiRequest.call(
				mockContext,
				'ref',
				'supabaseManagementApi',
				'SELECT * FROM missing_table',
			),
		).rejects.toThrow();
	});
});

// ─────────────────────────────────────────────
// Unit tests: getProjectCredentials
// ─────────────────────────────────────────────

describe('getProjectCredentials', () => {
	const makeContext = (creds: Record<string, unknown>) =>
		({
			getNode: () => mockNode,
			getCredentials: jest.fn().mockResolvedValue(creds),
		}) as unknown as IExecuteFunctions;

	it('returns pat credential type for pat authentication', async () => {
		const ctx = makeContext({ projectRef: 'myref' });
		const result = await helpers.getProjectCredentials(ctx, 'pat');
		expect(result).toEqual({ projectRef: 'myref', credentialType: 'supabaseManagementApi' });
		expect(ctx.getCredentials).toHaveBeenCalledWith('supabaseManagementApi');
	});

	it('returns oAuth2 credential type for oAuth2 authentication', async () => {
		const ctx = makeContext({ projectRef: 'oauthref' });
		const result = await helpers.getProjectCredentials(ctx, 'oAuth2');
		expect(result).toEqual({
			projectRef: 'oauthref',
			credentialType: 'supabaseManagementOAuth2Api',
		});
		expect(ctx.getCredentials).toHaveBeenCalledWith('supabaseManagementOAuth2Api');
	});
});
