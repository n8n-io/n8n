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

/**
 * Standard organization fields of the Pipedrive API v2. In v1 these lived in the
 * organization's field list and were set through custom properties; in v2 they are
 * top-level body fields (website, linkedin, industry, annual_revenue, employee_count,
 * address), so they need their own inputs.
 */
export const organizationStandardFields: INodeProperties[] = [
	{
		displayName: 'Address',
		name: 'address',
		type: 'string',
		default: '',
		description:
			'Full address of the organization. Pipedrive splits it into street, city, postal code and country.',
	},
	{
		displayName: 'Annual Revenue',
		name: 'annual_revenue',
		type: 'number',
		default: 0,
		description: 'The annual revenue of the organization',
	},
	{
		displayName: 'Employee Count',
		name: 'employee_count',
		type: 'number',
		default: 0,
		description: 'The number of employees in the organization',
	},
	{
		displayName: 'Industry ID',
		name: 'industry',
		type: 'number',
		default: 0,
		description:
			'ID of the industry option, as listed for the Industry field under Company settings > Data fields',
	},
	{
		displayName: 'LinkedIn Profile URL',
		name: 'linkedin',
		type: 'string',
		default: '',
		description: 'The LinkedIn profile URL of the organization',
	},
	{
		displayName: 'Website',
		name: 'website',
		type: 'string',
		default: '',
		description: 'The website of the organization',
	},
];
