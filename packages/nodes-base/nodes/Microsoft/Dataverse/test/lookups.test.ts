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

		it('expands the abstract owner target into systemuser and team candidates', async () => {
			vi.mocked(dataverseApiRequest)
				.mockResolvedValueOnce({ value: [{ LogicalName: 'account' }] })
				.mockResolvedValueOnce({
					value: [
						{
							ReferencingAttribute: 'ownerid',
							ReferencingEntityNavigationPropertyName: 'ownerid',
							ReferencedEntity: 'owner',
						},
					],
				})
				.mockResolvedValueOnce({
					value: [
						{ LogicalName: 'systemuser', EntitySetName: 'systemusers' },
						{ LogicalName: 'team', EntitySetName: 'teams' },
					],
				});

			const map = await resolveLookupFields(ctx, CREDENTIAL_TYPE, 'accounts');

			expect(map.get('ownerid')).toEqual([
				{
					navigationProperty: 'ownerid',
					referencedEntity: 'systemuser',
					targetEntitySet: 'systemusers',
				},
				{
					navigationProperty: 'ownerid',
					referencedEntity: 'team',
					targetEntitySet: 'teams',
				},
			]);
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

		it('degrades to an empty map when metadata read is forbidden (403)', async () => {
			vi.mocked(dataverseApiRequest).mockRejectedValue({ httpCode: '403' });

			const map = await resolveLookupFields(ctx, CREDENTIAL_TYPE, 'accounts');

			expect(map.size).toBe(0);
		});

		it('degrades to an empty map when metadata read is unauthorized (401)', async () => {
			vi.mocked(dataverseApiRequest).mockRejectedValue({ httpCode: '401' });

			const map = await resolveLookupFields(ctx, CREDENTIAL_TYPE, 'accounts');

			expect(map.size).toBe(0);
		});

		it('detects a permission error nested under error.cause', async () => {
			vi.mocked(dataverseApiRequest).mockRejectedValue({
				cause: { response: { status: 403 } },
			});

			const map = await resolveLookupFields(ctx, CREDENTIAL_TYPE, 'accounts');

			expect(map.size).toBe(0);
		});

		it('caches the best-effort empty map so a later item does not re-request', async () => {
			vi.mocked(dataverseApiRequest).mockRejectedValue({ httpCode: '403' });

			await resolveLookupFields(ctx, CREDENTIAL_TYPE, 'accounts');
			await resolveLookupFields(ctx, CREDENTIAL_TYPE, 'accounts');

			// The forbidden metadata endpoint is hit once, not once per item.
			expect(dataverseApiRequest).toHaveBeenCalledTimes(1);
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

		// `ownerid` reports the abstract `owner` entity, expanded into its two
		// concrete members sharing the one navigation property.
		const owner: LookupFieldMap = new Map([
			[
				'ownerid',
				[
					{
						navigationProperty: 'ownerid',
						referencedEntity: 'systemuser',
						targetEntitySet: 'systemusers',
					},
					{
						navigationProperty: 'ownerid',
						referencedEntity: 'team',
						targetEntitySet: 'teams',
					},
				],
			],
		]);

		it('binds a systemusers reference for the owner lookup', () => {
			const out = applyLookupBindings(ctx, 0, { ownerid: `/systemusers(${guid})` }, owner);

			expect(out).toEqual({ 'ownerid@odata.bind': `/systemusers(${guid})` });
		});

		it('binds a teams reference for the owner lookup', () => {
			const out = applyLookupBindings(ctx, 0, { ownerid: `/teams(${guid})` }, owner);

			expect(out).toEqual({ 'ownerid@odata.bind': `/teams(${guid})` });
		});

		it('rejects a bare GUID for the owner lookup', () => {
			expect(() => applyLookupBindings(ctx, 0, { ownerid: guid }, owner)).toThrow(
				/multiple tables/,
			);
		});

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

		it('returns false for a body of only non-string scalars', () => {
			expect(bodyHasLookupCandidates({ revenue: 100, active: true })).toBe(false);
		});

		it('returns true for any non-empty string value (may be a mistyped lookup)', () => {
			// A plain name on a lookup column must still trigger resolution so it is
			// validated node-side rather than forwarded as a raw field.
			expect(bodyHasLookupCandidates({ name: 'Acme' })).toBe(true);
			expect(bodyHasLookupCandidates({ primarycontactid: 'John Smith' })).toBe(true);
		});

		it('returns false for an empty or whitespace-only string', () => {
			expect(bodyHasLookupCandidates({ name: '' })).toBe(false);
			expect(bodyHasLookupCandidates({ name: '   ' })).toBe(false);
		});

		it('returns true for a bare GUID value', () => {
			expect(bodyHasLookupCandidates({ primarycontactid: guid })).toBe(true);
		});

		it('returns true for a reference-path value (with or without leading slash)', () => {
			expect(bodyHasLookupCandidates({ customerid: `/accounts(${guid})` })).toBe(true);
			expect(bodyHasLookupCandidates({ customerid: `accounts(${guid})` })).toBe(true);
		});

		it('returns true for a null value (potential disassociation)', () => {
			expect(bodyHasLookupCandidates({ primarycontactid: null })).toBe(true);
		});

		it('ignores keys that already carry @odata.bind', () => {
			expect(bodyHasLookupCandidates({ 'primarycontactid@odata.bind': `/contacts(${guid})` })).toBe(
				false,
			);
		});
	});
});
