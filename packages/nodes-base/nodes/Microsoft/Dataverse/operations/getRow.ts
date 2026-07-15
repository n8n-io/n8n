import type { IDataObject } from 'n8n-workflow';
import type { OperationDefinition } from './types';
import {
	assertNonEmptyRecordId,
	buildODataQs,
	buildRecordPath,
	executeRequest,
	normalizeEntitySet,
} from './shared';
import {
	buildOptionsCollection,
	commonEntitySetProperty,
	commonExpandOption,
	commonPartitionIdOption,
	commonRecordIdProperty,
	commonReturnFullMetadataOption,
	commonSelectOption,
} from './sharedProperties';

/**
 * dv connector — "Get a row by ID" (`GetItem`).
 *
 * `GET /{entitySet}({recordId})` with optional `$select`, `$expand`,
 * partitionId, and Return Full Metadata.
 */
export const getRow: OperationDefinition = {
	displayName: 'Get a Row by ID',
	value: 'get',
	description: 'Get a single row by its primary key',
	action: 'Get a row by ID',
	properties: [
		commonEntitySetProperty(['get']),
		commonRecordIdProperty(['get']),
		buildOptionsCollection('get', [
			commonSelectOption(),
			commonExpandOption(),
			commonReturnFullMetadataOption(),
			commonPartitionIdOption(),
		]),
	],
	async execute(ctx, i, credentialType) {
		const entitySet = normalizeEntitySet(ctx.getNodeParameter('entitySet', i));
		const recordId = assertNonEmptyRecordId(ctx, i, ctx.getNodeParameter('recordId', i));
		const options = ctx.getNodeParameter('getOptions', i, {}) as IDataObject;
		return await executeRequest(ctx, credentialType, {
			method: 'GET',
			path: buildRecordPath(entitySet, recordId),
			qs: buildODataQs({ select: options.select, expand: options.expand }),
			options,
		});
	},
};
