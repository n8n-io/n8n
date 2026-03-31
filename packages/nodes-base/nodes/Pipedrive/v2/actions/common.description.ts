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
					description: 'The API key of the custom field',
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

export const resolveCustomFieldsOption: INodeProperties = {
	displayName: 'Resolve Custom Fields',
	name: 'resolveCustomFields',
	type: 'boolean',
	default: false,
	description:
		'Whether to resolve custom field keys to their human-readable names and enum IDs to labels',
};

export const encodeCustomFieldsOption: INodeProperties = {
	displayName: 'Encode Custom Fields',
	name: 'encodeCustomFields',
	type: 'boolean',
	default: false,
	description:
		'Whether to encode custom field values (e.g. convert labels to enum IDs) before sending',
};
