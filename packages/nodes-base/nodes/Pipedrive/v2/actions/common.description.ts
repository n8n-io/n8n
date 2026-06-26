import type { INodeProperties } from 'n8n-workflow';

export const customFieldsCollection: INodeProperties = {
	displayName: 'Custom Fields',
	name: 'customFields',
	type: 'fixedCollection',
	typeOptions: {
		multipleValues: true,
	},
	default: {},
	placeholder: 'Add Custom Field',
	options: [
		{
			displayName: 'Property',
			name: 'property',
			values: [
				{
					displayName: 'Field Name or ID',
					name: 'name',
					type: 'string',
					default: '',
					description: 'The name or key of the custom field as it appears in Pipedrive',
				},
				{
					displayName: 'Field Value',
					name: 'value',
					type: 'string',
					default: '',
					description: 'The value to set for the custom field',
				},
			],
		},
	],
};

export const rawCustomFieldOutputOption: INodeProperties = {
	displayName: 'Show Raw Field Keys',
	name: 'rawCustomFieldOutput',
	type: 'boolean',
	default: false,
	description:
		'Whether to show raw Pipedrive field keys and option IDs instead of human-readable names in output',
};

export const visibleToOption: INodeProperties = {
	displayName: 'Visible To',
	name: 'visible_to',
	type: 'options',
	options: [
		{
			name: 'Owner & Followers (Private)',
			value: '1',
		},
		{
			name: 'Entire Company (Shared)',
			value: '3',
		},
	],
	default: '3',
	description:
		'Visibility of the item. If omitted, visibility will be set to the default visibility setting of this item type for the authorized user.',
};

export const rawCustomFieldKeysOption: INodeProperties = {
	displayName: 'Use Raw Field Keys',
	name: 'rawCustomFieldKeys',
	type: 'boolean',
	default: false,
	description:
		'Whether to provide raw Pipedrive field keys and option IDs instead of human-readable names',
};
