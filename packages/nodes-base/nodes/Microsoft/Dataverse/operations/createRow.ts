// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import type { IDataObject } from 'n8n-workflow';
import type { OperationDefinition } from './types';
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
	displayName: 'Add a New Row',
	value: 'create',
	description: 'Add a new row to a Microsoft Dataverse table',
	action: 'Add a new row',
	properties: [
		commonEntitySetProperty(['create']),
		...commonRowItemProperties(['create']),
		buildOptionsCollection('create', [commonReturnFullMetadataOption()]),
	],
	async execute(ctx, i, credentialType) {
		const entitySet = normalizeEntitySet(ctx.getNodeParameter('entitySet', i));
		const body = assertNonEmptyBody(ctx, i, parseItemInput(ctx, i), 'Add a New Row');
		return await executeRequest(ctx, credentialType, {
			method: 'POST',
			path: `/${entitySet}`,
			body,
			options: ctx.getNodeParameter('createOptions', i, {}) as IDataObject,
			prefer: { returnRepresentation: true },
		});
	},
};
