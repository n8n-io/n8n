import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { dataverseApiRequest } from '../GenericFunctions';
import {
	applyLookupBindings,
	bodyHasLookupCandidates,
	resolveLookupFields,
	type LookupFieldMap,
} from '../operations/lookups';

vi.mock('../GenericFunctions', () => ({
	dataverseApiRequest: vi.fn(),
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

describe('Microsoft Dataverse lookups', () => {
	let ctx: ReturnType<typeof mockDeep<IExecuteFunctions>>;

	beforeEach(() => {
		vi.clearAllMocks();
		ctx = mockDeep<IExecuteFunctions>();
		ctx.getNode.mockReturnValue(node);
	});

	describe('resolveLookupFields', () => {
		// Wire the three metadata calls: entity-set→logical name, relationships,
		// referenced logical names→entity-set names.
		const mockMetadata = () => {
			vi.mocked(dataverseApiRequest)
				.mockResolvedValueOnce({ value: [{ LogicalName: 'account' }] })
				.mockResolvedValueOnce({
					value: [
						{
							ReferencingAttribute: 'primarycontactid',
							ReferencingEntityNavigationPropertyName: 'primarycontactid',
							ReferencedEntity: 'contact',
						},
						{
							ReferencingAttribute: 'customerid',
							ReferencingEntityNavigationPropertyName: 'customerid_account',
							ReferencedEntity: 'account',
						},
						{
							ReferencingAttribute: 'customerid',
							ReferencingEntityNavigationPropertyName: 'customerid_contact',
							ReferencedEntity: 'contact',
						},
					],
				})
				.mockResolvedValueOnce({
					value: [
						{ LogicalName: 'contact', EntitySetName: 'contacts' },
						{ LogicalName: 'account', EntitySetName: 'accounts' },
					],
				});
		};

		it('builds a map of single-target and polymorphic lookups', async () => {
			mockMetadata();

			const map = await resolveLookupFields(ctx, CREDENTIAL_TYPE, 'accounts');

			expect(map.get('primarycontactid')).toEqual([
				{
					navigationProperty: 'primarycontactid',
					referencedEntity: 'contact',
					targetEntitySet: 'contacts',
				},
			]);
			expect(map.get('customerid')).toEqual([
				{
					navigationProperty: 'customerid_account',
					referencedEntity: 'account',
					targetEntitySet: 'accounts',
				},
				{
					navigationProperty: 'customerid_contact',
					referencedEntity: 'contact',
					targetEntitySet: 'contacts',
				},
			]);
		});

		it('memoizes metadata per execution and entity set', async () => {
			mockMetadata();

			await resolveLookupFields(ctx, CREDENTIAL_TYPE, 'accounts');
			await resolveLookupFields(ctx, CREDENTIAL_TYPE, 'accounts');

			// Three metadata calls total, not six.
			expect(dataverseApiRequest).toHaveBeenCalledTimes(3);
		});

		it('returns an empty map when the table has no lookups', async () => {
			vi.mocked(dataverseApiRequest)
				.mockResolvedValueOnce({ value: [{ LogicalName: 'account' }] })
				.mockResolvedValueOnce({ value: [] });

			const map = await resolveLookupFields(ctx, CREDENTIAL_TYPE, 'accounts');

			expect(map.size).toBe(0);
		});

		it('returns an empty map when the entity set is unknown', async () => {
			// No matching EntityDefinition — an empty result, not an error.
			vi.mocked(dataverseApiRequest).mockResolvedValueOnce({ value: [] });

			const map = await resolveLookupFields(ctx, CREDENTIAL_TYPE, 'unknowns');

			expect(map.size).toBe(0);
			// Only the logical-name lookup runs; no relationship calls follow.
			expect(dataverseApiRequest).toHaveBeenCalledTimes(1);
		});

		it('propagates a failed metadata request instead of degrading', async () => {
			vi.mocked(dataverseApiRequest).mockRejectedValueOnce(new Error('boom'));

			await expect(resolveLookupFields(ctx, CREDENTIAL_TYPE, 'accounts')).rejects.toThrow('boom');
		});

		it('does not cache a failed resolution so a later item can retry', async () => {
			vi.mocked(dataverseApiRequest).mockRejectedValueOnce(new Error('boom'));
			await expect(resolveLookupFields(ctx, CREDENTIAL_TYPE, 'accounts')).rejects.toThrow('boom');

			// A retry re-issues the metadata calls and succeeds.
			mockMetadata();
			const map = await resolveLookupFields(ctx, CREDENTIAL_TYPE, 'accounts');

			expect(map.get('primarycontactid')).toBeDefined();
		});
	});

	describe('applyLookupBindings', () => {
		const singleTarget: LookupFieldMap = new Map([
			[
				'primarycontactid',
				[
					{
						navigationProperty: 'primarycontactid',
						referencedEntity: 'contact',
						targetEntitySet: 'contacts',
					},
				],
			],
		]);
		const polymorphic: LookupFieldMap = new Map([
			[
				'customerid',
				[
					{
						navigationProperty: 'customerid_account',
						referencedEntity: 'account',
						targetEntitySet: 'accounts',
					},
					{
						navigationProperty: 'customerid_contact',
						referencedEntity: 'contact',
						targetEntitySet: 'contacts',
					},
				],
			],
		]);
		const guid = '00000000-0000-0000-0000-000000000001';

		it('binds a bare GUID for a single-target lookup', () => {
			const out = applyLookupBindings(ctx, 0, { primarycontactid: guid }, singleTarget);

			expect(out).toEqual({ 'primarycontactid@odata.bind': `/contacts(${guid})` });
		});

		it('passes a full reference path through and selects the matching navigation property', () => {
			const out = applyLookupBindings(ctx, 0, { customerid: `/accounts(${guid})` }, polymorphic);

			expect(out).toEqual({ 'customerid_account@odata.bind': `/accounts(${guid})` });
		});

		it('normalizes an entityset(id) reference without a leading slash', () => {
			const out = applyLookupBindings(ctx, 0, { customerid: `contacts(${guid})` }, polymorphic);

			expect(out).toEqual({ 'customerid_contact@odata.bind': `/contacts(${guid})` });
		});

		it('leaves non-lookup fields untouched', () => {
			const out = applyLookupBindings(ctx, 0, { name: 'Acme', revenue: 100 }, singleTarget);

			expect(out).toEqual({ name: 'Acme', revenue: 100 });
		});

		it('passes an already-formed @odata.bind key through', () => {
			const out = applyLookupBindings(
				ctx,
				0,
				{ 'primarycontactid@odata.bind': `/contacts(${guid})` },
				singleTarget,
			);

			expect(out).toEqual({ 'primarycontactid@odata.bind': `/contacts(${guid})` });
		});

		it('disassociates a single-target lookup on null', () => {
			const out = applyLookupBindings(ctx, 0, { primarycontactid: null }, singleTarget);

			expect(out).toEqual({ primarycontactid: null });
		});

		it('rejects a bare GUID for a polymorphic lookup', () => {
			expect(() => applyLookupBindings(ctx, 0, { customerid: guid }, polymorphic)).toThrow(
				NodeOperationError,
			);
			expect(() => applyLookupBindings(ctx, 0, { customerid: guid }, polymorphic)).toThrow(
				/multiple tables/,
			);
		});

		it('rejects clearing a polymorphic lookup with null', () => {
			expect(() => applyLookupBindings(ctx, 0, { customerid: null }, polymorphic)).toThrow(
				NodeOperationError,
			);
		});

		it('rejects a value that is neither a GUID nor a reference', () => {
			expect(() =>
				applyLookupBindings(ctx, 0, { primarycontactid: 'not-a-guid' }, singleTarget),
			).toThrow(/record GUID or a/);
		});

		it('rejects a malformed slash-prefixed reference with no key', () => {
			// "/contacts" starts with a slash but has no "(id)" — must not be forwarded.
			expect(() =>
				applyLookupBindings(ctx, 0, { primarycontactid: '/contacts' }, singleTarget),
			).toThrow(/record GUID or a/);
		});

		it('binds a matching-table reference for a single-target lookup', () => {
			const out = applyLookupBindings(
				ctx,
				0,
				{ primarycontactid: `/contacts(${guid})` },
				singleTarget,
			);

			expect(out).toEqual({ 'primarycontactid@odata.bind': `/contacts(${guid})` });
		});

		it('rejects a reference to the wrong table for a single-target lookup', () => {
			// The lookup only targets "contacts"; an "/accounts(...)" reference must fail
			// node-side instead of forwarding a mismatched path to Dataverse.
			expect(() =>
				applyLookupBindings(ctx, 0, { primarycontactid: `/accounts(${guid})` }, singleTarget),
			).toThrow(/does not match any related table/);
		});
	});

	describe('bodyHasLookupCandidates', () => {
		const guid = '00000000-0000-0000-0000-000000000001';

		it('returns false for plain scalar values', () => {
			expect(
				bodyHasLookupCandidates({ name: 'Acme', revenue: 100, active: true, when: '2024-01-01' }),
			).toBe(false);
		});

		it('returns true for a bare GUID value', () => {
			expect(bodyHasLookupCandidates({ primarycontactid: guid })).toBe(true);
		});

		it('returns true for a reference-path value (with or without leading slash)', () => {
			expect(bodyHasLookupCandidates({ customerid: `/accounts(${guid})` })).toBe(true);
			expect(bodyHasLookupCandidates({ customerid: `accounts(${guid})` })).toBe(true);
		});

		it('returns true for a malformed slash-prefixed value so validation still runs', () => {
			expect(bodyHasLookupCandidates({ primarycontactid: '/contacts' })).toBe(true);
		});

		it('returns true for a null value (potential disassociation)', () => {
			expect(bodyHasLookupCandidates({ primarycontactid: null })).toBe(true);
		});

		it('ignores keys that already carry @odata.bind', () => {
			expect(bodyHasLookupCandidates({ 'primarycontactid@odata.bind': `/contacts(${guid})` })).toBe(
				false,
			);
		});

		it('trims whitespace before matching a GUID', () => {
			expect(bodyHasLookupCandidates({ primarycontactid: `  ${guid}  ` })).toBe(true);
		});
	});
});
