import type { IDataObject } from 'n8n-workflow';
import type { OperationDefinition } from './types';
import {
	assertNonEmptyBody,
	assertNonEmptyRecordId,
	buildRecordPath,
	executeRequest,
	normalizeEntitySet,
	parseItemInput,
} from './shared';
import {
	buildOptionsCollection,
	commonEntitySetProperty,
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
	displayName: 'Update a Row',
	value: 'update',
	description: 'Modify any selected row in a Microsoft Dataverse table',
	action: 'Update a row',
	properties: [
		commonEntitySetProperty(['update']),
		commonRecordIdProperty(['update']),
		...commonRowItemProperties(['update']),
		// n8n-nodes-base style rule requires the option collection on `update`
		// to be named "Update Fields". Keeps RFM + partitionId options together.
		buildOptionsCollection('update', [commonReturnFullMetadataOption()], {
			displayName: 'Update Fields',
		}),
	],
	async execute(ctx, i, credentialType) {
		const entitySet = normalizeEntitySet(ctx.getNodeParameter('entitySet', i));
		const recordId = assertNonEmptyRecordId(ctx, i, ctx.getNodeParameter('recordId', i));
		const body = assertNonEmptyBody(ctx, i, parseItemInput(ctx, i), 'Update a Row');
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
