// `{ name, value }` objects below are field-input fixtures, not node params.
/* eslint-disable n8n-nodes-base/node-param-display-name-miscased */

import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { dataverseApiRequest, dataverseApiRequestAllItems } from '../GenericFunctions';
import {
	applyPartitionId,
	assertNonEmptyBody,
	assertNonEmptyRecordId,
	buildODataQs,
	buildPreferHeader,
	buildRecordPath,
	executeRequest,
	normalizeEntitySet,
	parseItemInput,
} from '../operations/shared';

vi.mock('../GenericFunctions', () => ({
	dataverseApiRequest: vi.fn(),
	dataverseApiRequestAllItems: vi.fn(),
}));

const CREDENTIAL_TYPE = 'microsoftDataverseOAuth2Api';

const node: INode = {
	id: 'test-node',
	name: 'Microsoft Dataverse',
	type: 'n8n-nodes-base.microsoftDataverse',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

describe('Microsoft Dataverse operations/shared', () => {
	let ctx: ReturnType<typeof mockDeep<IExecuteFunctions>>;

	beforeEach(() => {
		vi.clearAllMocks();
		ctx = mockDeep<IExecuteFunctions>();
		ctx.getNode.mockReturnValue(node);
	});

	describe('buildODataQs', () => {
		it('maps known option keys to their $-prefixed OData equivalents', () => {
			expect(buildODataQs({ select: 'name', filter: 'statecode eq 0' })).toEqual({
				$select: 'name',
				$filter: 'statecode eq 0',
			});
		});

		it('drops undefined, null, and empty-string values', () => {
			expect(
				buildODataQs({ select: '', filter: undefined, orderby: null as unknown as string }),
			).toEqual({});
		});

		it('joins array values with commas and drops empty arrays', () => {
			expect(buildODataQs({ select: ['name', 'accountid'], expand: [] })).toEqual({
				$select: 'name,accountid',
			});
		});

		it('preserves numeric values so $top works', () => {
			expect(buildODataQs({ top: 25 })).toEqual({ $top: 25 });
		});
	});

	describe('parseItemInput', () => {
		it('returns a parsed object from a JSON string', () => {
			ctx.getNodeParameter.mockImplementation((name) =>
				name === 'inputMode' ? 'json' : '{"name":"Acme"}',
			);

			expect(parseItemInput(ctx, 0)).toEqual({ name: 'Acme' });
		});

		it('returns an object value as-is in JSON mode', () => {
			ctx.getNodeParameter.mockImplementation((name) =>
				name === 'inputMode' ? 'json' : { name: 'Acme' },
			);

			expect(parseItemInput(ctx, 0)).toEqual({ name: 'Acme' });
		});

		it('returns an empty object for empty JSON input', () => {
			ctx.getNodeParameter.mockImplementation((name) => (name === 'inputMode' ? 'json' : ''));

			expect(parseItemInput(ctx, 0)).toEqual({});
		});

		it('rejects a JSON array with a descriptive error', () => {
			ctx.getNodeParameter.mockImplementation((name) => (name === 'inputMode' ? 'json' : '[1,2]'));

			expect(() => parseItemInput(ctx, 0)).toThrow(/must be a JSON object, got array/);
		});

		it('rejects a JSON primitive with a descriptive error', () => {
			ctx.getNodeParameter.mockImplementation((name) => (name === 'inputMode' ? 'json' : '42'));

			expect(() => parseItemInput(ctx, 0)).toThrow(/must be a JSON object, got number/);
		});

		it('throws NodeOperationError for malformed JSON', () => {
			ctx.getNodeParameter.mockImplementation((name) =>
				name === 'inputMode' ? 'json' : '{not json}',
			);

			expect(() => parseItemInput(ctx, 0)).toThrow(NodeOperationError);
			expect(() => parseItemInput(ctx, 0)).toThrow(/is not valid JSON/);
		});

		it('collects name/value pairs in fields mode', () => {
			ctx.getNodeParameter.mockImplementation((name) =>
				name === 'inputMode'
					? 'fields'
					: {
							field: [
								{ name: 'name', value: 'Acme' },
								{ name: 'revenue', value: 100 },
							],
						},
			);

			expect(parseItemInput(ctx, 0)).toEqual({ name: 'Acme', revenue: 100 });
		});

		it('skips fields entries without a name', () => {
			ctx.getNodeParameter.mockImplementation((name) =>
				name === 'inputMode'
					? 'fields'
					: {
							field: [
								{ name: '', value: 'ignored' },
								{ name: 'keep', value: 1 },
							],
						},
			);

			expect(parseItemInput(ctx, 0)).toEqual({ keep: 1 });
		});
	});

	describe('buildPreferHeader', () => {
		it('returns undefined when nothing is requested', () => {
			expect(buildPreferHeader({})).toBeUndefined();
		});

		it('emits return=representation', () => {
			expect(buildPreferHeader({ returnRepresentation: true })).toBe('return=representation');
		});

		it('emits the annotations token for full metadata', () => {
			expect(buildPreferHeader({ includeFullMetadata: true })).toBe(
				'odata.include-annotations="*"',
			);
		});

		it('emits maxpagesize only for a positive page size', () => {
			expect(buildPreferHeader({ maxPageSize: 100 })).toBe('odata.maxpagesize=100');
			expect(buildPreferHeader({ maxPageSize: 0 })).toBeUndefined();
		});

		it('joins every requested part with commas', () => {
			expect(
				buildPreferHeader({
					returnRepresentation: true,
					includeFullMetadata: true,
					extra: ['custom=1'],
				}),
			).toBe('return=representation,odata.include-annotations="*",custom=1');
		});
	});

	describe('normalizeEntitySet', () => {
		it('returns an empty string for non-string input', () => {
			expect(normalizeEntitySet(undefined)).toBe('');
			expect(normalizeEntitySet(42)).toBe('');
		});

		it('trims whitespace and strips leading/trailing slashes', () => {
			expect(normalizeEntitySet('  /accounts/ ')).toBe('accounts');
		});
	});

	describe('buildRecordPath', () => {
		it('builds a GUID path', () => {
			expect(buildRecordPath('accounts', '7c-guid')).toBe('/accounts(7c-guid)');
		});

		it('normalizes the entity set and trims the id', () => {
			expect(buildRecordPath('/accounts/', "  accountnumber='ACC-001'  ")).toBe(
				"/accounts(accountnumber='ACC-001')",
			);
		});
	});

	describe('assertNonEmptyRecordId', () => {
		it('returns the trimmed id when present', () => {
			expect(assertNonEmptyRecordId(ctx, 0, '  abc ')).toBe('abc');
		});

		it('throws for whitespace-only, non-string, or empty ids', () => {
			expect(() => assertNonEmptyRecordId(ctx, 0, '   ')).toThrow(NodeOperationError);
			expect(() => assertNonEmptyRecordId(ctx, 0, null)).toThrow(/required/);
		});

		it('uses the provided parameter name in the message', () => {
			expect(() => assertNonEmptyRecordId(ctx, 0, '', 'rowId')).toThrow(/"rowId"/);
		});
	});

	describe('assertNonEmptyBody', () => {
		it('returns the body when it has at least one field', () => {
			expect(assertNonEmptyBody(ctx, 0, { name: 'Acme' }, 'Add a New Row')).toEqual({
				name: 'Acme',
			});
		});

		it('throws for an empty body, naming the operation', () => {
			expect(() => assertNonEmptyBody(ctx, 0, {}, 'Add a New Row')).toThrow(
				/Add a New Row requires at least one field/,
			);
		});
	});

	describe('applyPartitionId', () => {
		it('adds a trimmed partitionId to the query string', () => {
			expect(applyPartitionId({}, '  p1 ')).toEqual({ partitionId: 'p1' });
		});

		it('leaves the query string untouched for empty or non-string input', () => {
			expect(applyPartitionId({}, '   ')).toEqual({});
			expect(applyPartitionId({}, undefined)).toEqual({});
		});
	});

	describe('executeRequest', () => {
		it('dispatches a single-shot request folding partitionId and Prefer', async () => {
			vi.mocked(dataverseApiRequest).mockResolvedValue({ id: 'row-1' });

			const result = await executeRequest(ctx, CREDENTIAL_TYPE, {
				method: 'POST',
				path: '/accounts',
				body: { name: 'Acme' },
				prefer: { returnRepresentation: true },
				options: { partitionId: 'p1', returnFullMetadata: true },
			});

			expect(result).toEqual({ id: 'row-1' });
			expect(dataverseApiRequestAllItems).not.toHaveBeenCalled();
			const [, method, path, body, qs, headers] = vi.mocked(dataverseApiRequest).mock.calls[0];
			expect(method).toBe('POST');
			expect(path).toBe('/accounts');
			expect(body).toEqual({ name: 'Acme' });
			expect(qs).toEqual({ partitionId: 'p1' });
			expect(headers?.Prefer).toBe('return=representation,odata.include-annotations="*"');
		});

		it('omits the Prefer header when no metadata or prefer options are set', async () => {
			vi.mocked(dataverseApiRequest).mockResolvedValue({});

			await executeRequest(ctx, CREDENTIAL_TYPE, {
				method: 'GET',
				path: '/accounts',
				options: { returnFullMetadata: false },
			});

			const [, , , , , headers] = vi.mocked(dataverseApiRequest).mock.calls[0];
			expect(headers?.Prefer).toBeUndefined();
		});

		it('lets the computed Prefer override a caller-supplied extraHeaders.Prefer', async () => {
			vi.mocked(dataverseApiRequest).mockResolvedValue({});

			await executeRequest(ctx, CREDENTIAL_TYPE, {
				method: 'POST',
				path: '/accounts',
				extraHeaders: { Prefer: 'caller-value' },
				prefer: { returnRepresentation: true },
			});

			const [, , , , , headers] = vi.mocked(dataverseApiRequest).mock.calls[0];
			// Current behavior: computed Prefer wins (caller value is dropped).
			expect(headers?.Prefer).toBe('return=representation');
		});

		it('forwards the credential type on the single-shot path', async () => {
			vi.mocked(dataverseApiRequest).mockResolvedValue({});

			await executeRequest(ctx, CREDENTIAL_TYPE, { method: 'GET', path: '/accounts' });

			const [, , , , , , credType] = vi.mocked(dataverseApiRequest).mock.calls[0];
			expect(credType).toBe(CREDENTIAL_TYPE);
		});

		it('dispatches a paged request when plan.paged is set', async () => {
			vi.mocked(dataverseApiRequestAllItems).mockResolvedValue([{ id: 1 }]);

			const result = await executeRequest(ctx, CREDENTIAL_TYPE, {
				method: 'GET',
				path: '/accounts',
				paged: true,
				limit: 10,
			});

			expect(result).toEqual([{ id: 1 }]);
			expect(dataverseApiRequest).not.toHaveBeenCalled();
			const [, , , , limit] = vi.mocked(dataverseApiRequestAllItems).mock.calls[0];
			expect(limit).toBe(10);
		});

		it('folds partitionId and returnFullMetadata into the paged request', async () => {
			vi.mocked(dataverseApiRequestAllItems).mockResolvedValue([]);

			await executeRequest(ctx, CREDENTIAL_TYPE, {
				method: 'GET',
				path: '/accounts',
				qs: { $select: 'name' },
				paged: true,
				options: { partitionId: 'p1', returnFullMetadata: true },
			});

			const [, , , qs, , credType, headers] = vi.mocked(dataverseApiRequestAllItems).mock.calls[0];
			expect(qs).toEqual({ $select: 'name', partitionId: 'p1' });
			expect(headers?.Prefer).toBe('odata.include-annotations="*"');
			expect(credType).toBe(CREDENTIAL_TYPE);
		});
	});
});
