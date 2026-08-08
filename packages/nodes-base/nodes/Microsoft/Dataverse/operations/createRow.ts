import type { IDataObject } from 'n8n-workflow';
import type { OperationDefinition } from './types';
import {
	applyLookupBindings,
	bodyHasLookupCandidates,
	EMPTY_LOOKUP_FIELDS,
	resolveLookupFields,
} from './lookups';
import { assertNonEmptyBody, executeRequest, normalizeEntitySet, parseItemInput } from './shared';
import {
	buildOptionsCollection,
	commonEntitySetProperty,
	commonReturnFullMetadataOption,
	commonRowItemProperties,
} from './sharedProperties';

/**
 * dv connector — "Add a new row" (`CreateRecord`).
 *
 * `POST /{entitySet}` with `Prefer: return=representation` so the created
 * record (including the server-generated GUID) is echoed back to the user.
 */
export const createRow: OperationDefinition = {
	displayName: 'Create',
	value: 'create',
	description: 'Add a new row to a Microsoft Dataverse table',
	action: 'Create a row',
	properties: [
		commonEntitySetProperty(['create']),
		...commonRowItemProperties(['create']),
		buildOptionsCollection('create', [commonReturnFullMetadataOption()]),
	],
	async execute(ctx, i, credentialType) {
		const entitySet = normalizeEntitySet(ctx.getNodeParameter('entitySet', i));
		// Validate before resolving lookup metadata so an empty Row Item fails fast
		// without spending metadata requests. Lookup metadata is only resolved when the
		// body actually carries a lookup-style value, so a plain write stays a single
		// request and needs no metadata-read permission.
		const rawBody = assertNonEmptyBody(ctx, i, parseItemInput(ctx, i), 'Create');
		const lookupFields = bodyHasLookupCandidates(rawBody)
			? await resolveLookupFields(ctx, credentialType, entitySet)
			: EMPTY_LOOKUP_FIELDS;
		const body = applyLookupBindings(ctx, i, rawBody, lookupFields);
		return await executeRequest(ctx, credentialType, {
			method: 'POST',
			path: `/${entitySet}`,
			body,
			options: ctx.getNodeParameter('createOptions', i, {}) as IDataObject,
			prefer: { returnRepresentation: true },
		});
	},
};
