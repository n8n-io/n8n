import type { IDataObject } from 'n8n-workflow';
import type { OperationDefinition } from './types';
import {
	applyLookupBindings,
	bodyHasLookupCandidates,
	EMPTY_LOOKUP_FIELDS,
	resolveLookupFields,
} from './lookups';
import {
	assertNonEmptyBody,
	assertValidEntitySet,
	assertValidRecordId,
	buildRecordPath,
	executeRequest,
	parseItemInput,
} from './shared';
import {
	buildOptionsCollection,
	commonEntitySetProperty,
	commonRecordIdProperty,
	commonReturnFullMetadataOption,
	commonReturnSessionTokenOption,
	commonRowItemProperties,
	commonSessionTokenOption,
} from './sharedProperties';

/**
 * dv connector — "Update a row" (`UpdateRecord`).
 *
 * `PATCH /{entitySet}({recordId})` with `If-Match: *` so the server returns
 * `412 Precondition Failed` if the row doesn't exist (this is what makes it
 * an Update rather than an Upsert — see {@link upsertRow} for the upsert
 * variant). `Prefer: return=representation` echoes the post-update row.
 */
export const updateRow: OperationDefinition = {
	displayName: 'Update',
	value: 'update',
	description: 'Modify any selected row in a Microsoft Dataverse table',
	action: 'Update a row',
	properties: [
		commonEntitySetProperty(['update']),
		{
			...commonRecordIdProperty(['update']),
			description:
				'GUID of the row to update. For a partitioned elastic table, add partitionid to the Row Item, or use Create or Update with the alternate-key form.',
		},
		...commonRowItemProperties(['update']),
		buildOptionsCollection('update', [
			commonReturnFullMetadataOption(),
			commonSessionTokenOption(),
			commonReturnSessionTokenOption(),
		]),
	],
	async execute(ctx, i, credentialType) {
		const entitySet = assertValidEntitySet(ctx, i, ctx.getNodeParameter('entitySet', i));
		const recordId = assertValidRecordId(ctx, i, ctx.getNodeParameter('recordId', i));
		// Validate before resolving lookup metadata so an empty Row Item fails fast
		// without spending metadata requests. Lookup metadata is only resolved when the
		// body actually carries a lookup-style value, so a plain write stays a single
		// request and needs no metadata-read permission.
		const rawBody = assertNonEmptyBody(ctx, i, parseItemInput(ctx, i), 'Update');
		const lookupFields = bodyHasLookupCandidates(rawBody)
			? await resolveLookupFields(ctx, credentialType, entitySet)
			: EMPTY_LOOKUP_FIELDS;
		const body = applyLookupBindings(ctx, i, rawBody, lookupFields);
		const options = ctx.getNodeParameter('updateOptions', i, {}) as IDataObject;
		return await executeRequest(ctx, credentialType, {
			method: 'PATCH',
			path: buildRecordPath(entitySet, recordId),
			body,
			options,
			prefer: { returnRepresentation: true },
			extraHeaders: { 'If-Match': '*' },
			returnSessionToken: Boolean(options.returnSessionToken),
		});
	},
};
