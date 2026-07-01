// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import type { IDataObject } from 'n8n-workflow';
import type { OperationDefinition } from './types';
import {
	assertNonEmptyRecordId,
	buildRecordPath,
	executeRequest,
	normalizeEntitySet,
} from './shared';
import {
	buildOptionsCollection,
	commonEntitySetProperty,
	commonPartitionIdOption,
	commonRecordIdProperty,
} from './sharedProperties';

/**
 * dv connector — "Delete a row" (`DeleteRecord`).
 *
 * `DELETE /{entitySet}({recordId})`. Dataverse responds 204 No Content on
 * success; we surface a small synthetic JSON payload so downstream nodes can
 * branch on `success`.
 */
export const deleteRow: OperationDefinition = {
	displayName: 'Delete a Row',
	value: 'delete',
	description: 'Delete a row from a Microsoft Dataverse table',
	action: 'Delete a row',
	properties: [
		commonEntitySetProperty(['delete']),
		commonRecordIdProperty(['delete']),
		buildOptionsCollection('delete', [commonPartitionIdOption()]),
	],
	async execute(ctx, i, credentialType) {
		const entitySet = normalizeEntitySet(ctx.getNodeParameter('entitySet', i));
		const recordId = assertNonEmptyRecordId(ctx, i, ctx.getNodeParameter('recordId', i));
		await executeRequest(ctx, credentialType, {
			method: 'DELETE',
			path: buildRecordPath(entitySet, recordId),
			options: ctx.getNodeParameter('deleteOptions', i, {}) as IDataObject,
		});
		return { success: true, id: recordId };
	},
};
