// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import type {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
	INodePropertyOptions,
} from 'n8n-workflow';

/**
 * Single record-operation definition. The node composes UI from the registry
 * of these and dispatches `execute` by `value`. Keeping each op self-contained
 * makes it easy to add or remove actions without touching `Dataverse.node.ts`.
 */
export interface OperationDefinition {
	/** The dropdown label shown in the n8n editor (e.g. "Add a new row"). */
	displayName: string;
	/** Internal id used by `getNodeParameter('operation')`. */
	value: string;
	/** Short description displayed under the dropdown entry. */
	description: string;
	/** The action label that appears in n8n's "Action" column. */
	action: string;
	/** UI fields specific to this operation (entitySet, recordId, options...). */
	properties: INodeProperties[];
	/** Run the op for a single input item. Receives the per-item context and the credential type. */
	execute(
		ctx: IExecuteFunctions,
		itemIndex: number,
		credentialType: string,
	): Promise<IDataObject | IDataObject[]>;
}

/**
 * The `Operation` dropdown option entry generated from a definition.
 */
export function toDropdownOption(def: OperationDefinition): INodePropertyOptions {
	return {
		name: def.displayName,
		value: def.value,
		description: def.description,
		action: def.action,
	};
}
