// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import type { IDisplayOptions, INodeProperties } from 'n8n-workflow';

/**
 * Property descriptors that are reused by more than one operation. They live in
 * their own module so each op file stays a tight description of its op-only
 * shape (item input mode, partition id...). The `displayOptions` are built
 * with the caller-supplied list of operation values so the same property can
 * be opted in by several ops.
 */

/**
 * Build the standard `displayOptions.show` block scoping a property or
 * collection to one or more record-level operations. Replaces the
 * `{ show: { resource: ['record'], operation: ops } }` boilerplate that was
 * previously inlined in every shared property factory.
 */
export function forOperation(operations: string[]): IDisplayOptions {
	return { show: { resource: ['record'], operation: operations } };
}

/** Plural Web API name of the table (e.g. `accounts`). */
export function commonEntitySetProperty(operations: string[]): INodeProperties {
	return {
		displayName: 'Table Name or ID',
		name: 'entitySet',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getEntitySets' },
		default: '',
		required: true,
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		displayOptions: forOperation(operations),
	};
}

/** GUID of the record being targeted. */
export function commonRecordIdProperty(operations: string[]): INodeProperties {
	return {
		displayName: 'Row ID',
		name: 'recordId',
		type: 'string',
		default: '',
		required: true,
		placeholder: '00000000-0000-0000-0000-000000000000',
		description: 'Globally unique identifier (GUID) of the row',
		displayOptions: forOperation(operations),
	};
}

/**
 * The `Row Item` payload. Exposes a `JSON ⇄ Fields` mode toggle so power users
 * can paste an object and beginners can use a key/value collection — same UX
 * as the dv connector's dynamic item builder, just spelled in n8n primitives.
 */
export function commonRowItemProperties(operations: string[]): INodeProperties[] {
	return [
		{
			displayName: 'Input Mode',
			name: 'inputMode',
			type: 'options',
			noDataExpression: true,
			default: 'json',
			options: [
				{ name: 'JSON', value: 'json', description: 'Paste a full record object' },
				{
					name: 'Fields (Key / Value Pairs)',
					value: 'fields',
					description: 'Build the row one field at a time',
				},
			],
			displayOptions: forOperation(operations),
		},
		{
			displayName: 'Row Item (JSON)',
			name: 'fieldsJson',
			type: 'json',
			default: '{}',
			required: true,
			description: 'Row to send to Dataverse, as a JSON object of column logical name to value',
			displayOptions: {
				show: { ...forOperation(operations).show, inputMode: ['json'] },
			},
		},
		{
			displayName: 'Fields',
			name: 'fieldsCollection',
			type: 'fixedCollection',
			default: {},
			placeholder: 'Add Field',
			typeOptions: { multipleValues: true, sortable: true },
			displayOptions: {
				show: { ...forOperation(operations).show, inputMode: ['fields'] },
			},
			options: [
				{
					displayName: 'Field',
					name: 'field',
					values: [
						{
							displayName: 'Field Name or ID',
							name: 'name',
							type: 'options',
							typeOptions: {
								loadOptionsMethod: 'getColumns',
								loadOptionsDependsOn: ['entitySet'],
							},
							default: '',
							description:
								'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
						},
						{
							displayName: 'Field Value',
							name: 'value',
							type: 'string',
							default: '',
							description: 'Value to set on the column',
						},
					],
				},
			],
		},
	];
}

/** Optional `Return Full Metadata` toggle (maps to `Prefer: odata.include-annotations="*"`). */
export function commonReturnFullMetadataOption(): INodeProperties {
	return {
		displayName: 'Return Full Metadata',
		name: 'returnFullMetadata',
		type: 'boolean',
		default: false,
		description:
			'Whether to ask Dataverse to include OData annotations (odata.include-annotations="*")',
	};
}

/** Optional partition id (NoSQL / elastic tables). Sent as `?partitionId=…`. */
export function commonPartitionIdOption(): INodeProperties {
	return {
		displayName: 'Partition ID',
		name: 'partitionId',
		type: 'string',
		default: '',
		placeholder: 'partition-key-value',
		description: 'Partition key for NoSQL / elastic tables (forwarded as ?partitionId=)',
	};
}

/** `$select` — multi-select of column logical names. */
export function commonSelectOption(): INodeProperties {
	return {
		displayName: 'Select Column Names or IDs',
		name: 'select',
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getColumns',
			loadOptionsDependsOn: ['entitySet'],
		},
		default: [],
		description:
			'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	};
}

/** `$expand` — comma-separated navigation properties (lookup / relationship). */
export function commonExpandOption(): INodeProperties {
	return {
		displayName: 'Expand Query',
		name: 'expand',
		type: 'string',
		default: '',
		placeholder: 'primarycontactid($select=fullname)',
		description: 'OData $expand expression to include related rows',
	};
}

/**
 * Wrap one or more option fields into the standard top-level "Options"
 * collection that every operation exposes. Removes the boilerplate where each
 * op file re-declared a 7-line `type: 'collection'` block with the same
 * placeholder, default, and displayOptions.
 */
export function buildOptionsCollection(
	opValue: string,
	items: INodeProperties[],
	overrides: { name?: string; displayName?: string } = {},
): INodeProperties {
	return {
		displayName: overrides.displayName ?? 'Options',
		name: overrides.name ?? `${opValue}Options`,
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: forOperation([opValue]),
		options: items,
	};
}
