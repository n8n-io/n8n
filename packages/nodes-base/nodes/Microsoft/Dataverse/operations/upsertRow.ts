import type { IDataObject } from 'n8n-workflow';

import { type DataverseHeaders } from '../GenericFunctions';
import {
	applyLookupBindings,
	bodyHasLookupCandidates,
	EMPTY_LOOKUP_FIELDS,
	resolveLookupFields,
} from './lookups';
import {
	assertNonEmptyBody,
	assertValidAlternateKey,
	assertValidRecordId,
	buildRecordPath,
	executeRequest,
	normalizeEntitySet,
	parseItemInput,
} from './shared';
import {
	buildOptionsCollection,
	commonEntitySetProperty,
	commonPartitionIdOption,
	commonRecordIdProperty,
	commonReturnFullMetadataOption,
	commonRowItemProperties,
	forOperation,
} from './sharedProperties';
import type { OperationDefinition } from './types';

/**
 * dv connector — "Upsert a row" (`PATCH /{entitySet}({recordId})`).
 *
 * Dataverse's Web API treats PATCH-by-id as an upsert by default: if the row
 * exists it's updated, otherwise it's inserted with the supplied GUID. The
 * dv connector's "Upsert a row" action wraps this same behavior.
 *
 * We expose two extra dimensions vs. the dv connector for flexibility:
 *   - **Identifier Type**: GUID (default) *or* an alternate-key predicate
 *     (e.g. `accountnumber='ACC-001'`) — both are valid Dataverse PATCH targets.
 *   - **Behavior**:
 *     - `upsert` (default)   — no precondition headers
 *     - `updateOnly`         — adds `If-Match: *` (server returns 404 if row missing)
 *     - `createOnly`         — adds `If-None-Match: *` (server returns 412 if row exists)
 */
export const upsertRow: OperationDefinition = {
	displayName: 'Create or Update',
	value: 'upsert',
	description: 'Create a new record, or update the current one if it already exists (upsert)',
	action: 'Create or update a row',
	properties: [
		commonEntitySetProperty(['upsert']),
		{
			displayName: 'Identifier Type',
			name: 'identifierType',
			type: 'options',
			noDataExpression: true,
			default: 'guid',
			displayOptions: forOperation(['upsert']),
			options: [
				{ name: 'Row ID (GUID)', value: 'guid', description: 'Address the row by its primary key' },
				{
					name: 'Alternate Key',
					value: 'alternateKey',
					description: 'Address the row by a configured alternate key',
				},
			],
		},
		{
			...commonRecordIdProperty(['upsert']),
			description:
				'GUID of the row to upsert. Dataverse will create the row with this GUID if it does not exist yet.',
			displayOptions: {
				show: { ...forOperation(['upsert']).show, identifierType: ['guid'] },
			},
		},
		{
			displayName: 'Alternate Key Predicate',
			name: 'alternateKey',
			type: 'string',
			default: '',
			required: true,
			placeholder: "accountnumber='ACC-001'",
			description:
				"OData alternate-key predicate, e.g. accountnumber='ACC-001'. The table must have a matching alternate key configured.",
			displayOptions: {
				show: { ...forOperation(['upsert']).show, identifierType: ['alternateKey'] },
			},
		},
		...commonRowItemProperties(['upsert']),
		buildOptionsCollection('upsert', [
			{
				displayName: 'Behavior',
				name: 'behavior',
				type: 'options',
				default: 'upsert',
				options: [
					{
						name: 'Create or Update',
						value: 'upsert',
						description:
							'Create a new record, or update the current one if it already exists (upsert)',
					},
					{
						name: 'Update Only',
						value: 'updateOnly',
						description: 'Send If-Match: * — fail if row does not exist',
					},
					{
						name: 'Create Only',
						value: 'createOnly',
						description: 'Send If-None-Match: * — fail if row exists',
					},
				],
			},
			commonPartitionIdOption(),
			commonReturnFullMetadataOption(),
		]),
	],
	async execute(ctx, i, credentialType) {
		const entitySet = normalizeEntitySet(ctx.getNodeParameter('entitySet', i));
		const identifierType = ctx.getNodeParameter('identifierType', i, 'guid') as string;
		const identifier =
			identifierType === 'alternateKey'
				? assertValidAlternateKey(ctx, i, ctx.getNodeParameter('alternateKey', i), 'alternateKey')
				: assertValidRecordId(ctx, i, ctx.getNodeParameter('recordId', i));

		const rawBody = parseItemInput(ctx, i);
		// Validate before resolving lookup metadata so an empty Row Item fails fast
		// without spending metadata requests. Lookup metadata is only resolved when the
		// body actually carries a lookup-style value, so a plain write stays a single
		// request and needs no metadata-read permission.
		assertNonEmptyBody(ctx, i, rawBody, 'Create or Update');
		const lookupFields = bodyHasLookupCandidates(rawBody)
			? await resolveLookupFields(ctx, credentialType, entitySet)
			: EMPTY_LOOKUP_FIELDS;
		const body = applyLookupBindings(ctx, i, rawBody, lookupFields);
		const options = ctx.getNodeParameter('upsertOptions', i, {}) as IDataObject;
		const behavior = (options.behavior as string) ?? 'upsert';
		const extraHeaders: DataverseHeaders = {};
		if (behavior === 'updateOnly') extraHeaders['If-Match'] = '*';
		if (behavior === 'createOnly') extraHeaders['If-None-Match'] = '*';

		return await executeRequest(ctx, credentialType, {
			method: 'PATCH',
			path: buildRecordPath(entitySet, identifier),
			body,
			options,
			prefer: { returnRepresentation: true },
			extraHeaders,
		});
	},
};
