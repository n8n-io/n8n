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
		commonRecordIdProperty(['update']),
		...commonRowItemProperties(['update']),
		buildOptionsCollection('update', [commonPartitionIdOption(), commonReturnFullMetadataOption()]),
	],
	async execute(ctx, i, credentialType) {
		const entitySet = normalizeEntitySet(ctx.getNodeParameter('entitySet', i));
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
		return await executeRequest(ctx, credentialType, {
			method: 'PATCH',
			path: buildRecordPath(entitySet, recordId),
			body,
			options: ctx.getNodeParameter('updateOptions', i, {}) as IDataObject,
			prefer: { returnRepresentation: true },
			extraHeaders: { 'If-Match': '*' },
		});
	},
};
