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

const ORGANIZATION_INCLUDE_FIELDS = [
	'activities_count',
	'closed_deals_count',
	'done_activities_count',
	'email_messages_count',
	'files_count',
	'followers_count',
	'last_activity_id',
	'lost_deals_count',
	'next_activity_id',
	'notes_count',
	'open_deals_count',
	'people_count',
	'related_closed_deals_count',
	'related_lost_deals_count',
	'related_open_deals_count',
	'related_won_deals_count',
	'smart_bcc_email',
	'undone_activities_count',
	'won_deals_count',
];

const PERSON_INCLUDE_FIELDS = [
	'activities_count',
	'closed_deals_count',
	'doi_status',
	'done_activities_count',
	'email_messages_count',
	'files_count',
	'followers_count',
	'last_activity_id',
	'last_incoming_mail_time',
	'last_outgoing_mail_time',
	'lost_deals_count',
	'marketing_status',
	'next_activity_id',
	'notes_count',
	'open_deals_count',
	'participant_closed_deals_count',
	'participant_open_deals_count',
	'related_closed_deals_count',
	'related_lost_deals_count',
	'related_open_deals_count',
	'related_won_deals_count',
	'smart_bcc_email',
	'undone_activities_count',
	'won_deals_count',
];

function includeFieldsOption(fields: string[]): INodeProperties {
	return {
		displayName: 'Include Fields',
		name: 'includeFields',
		type: 'multiOptions',
		options: fields.map((field) => ({
			name: field
				.split('_')
				.map((part, index) => (index === 0 ? part[0].toUpperCase() + part.slice(1) : part))
				.join(' ')
				.replace(/\bbcc\b/, 'BCC')
				.replace(/\bdoi\b/i, 'DOI')
				.replace(/\bid\b/, 'ID'),
			value: field,
		})),
		default: [],
		description:
			'Additional fields to return. API v2 leaves these out unless they are requested, for example the deal and activity counts.',
	};
}

export const organizationIncludeFieldsOption = includeFieldsOption(ORGANIZATION_INCLUDE_FIELDS);
export const personIncludeFieldsOption = includeFieldsOption(PERSON_INCLUDE_FIELDS);
