import {
	INodeProperties,
 } from 'n8n-workflow';

export const memberOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'member',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new member',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a member',
			},
			{
				name: 'Get Organization',
				value: 'getOrganization',
				description: 'Retrieves the organizations that the member is in.',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const memberFields = [

/* -------------------------------------------------------------------------- */
/*                                 member:create                              */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Organization IDs',
		name: 'organizationIds',
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getOrganizations',
		},
		displayOptions: {
			show: {
				resource: [
					'member',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'The organizations the member should be added to.',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'member',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Full Name',
		name: 'fullName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'member',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'member',
				],
			},
		},
		options: [
			{
				displayName: 'Bio',
				name: 'bio',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: `The member’s bio.`,
			},
			{
				displayName: 'Company Name',
				name: 'companyName',
				type: 'string',
				default: '',
				description: `The member’s company name.`,
			},
			{
				displayName: 'Timezone',
				name: 'timezone',
				type: 'string',
				default: '',
				description: `The member's time zone. If not provided it will default to “America/Vancouver”. Valid values are defined at http://php.net/manual/en/timezones.php.`,
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'options',
				options: [
					{
						name: 'a',
						value: 'a',
					},
				],
				default: '',
				description: `The member’s language.`,
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                 member:get                                 */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Member ID',
		name: 'memberId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'member',
				],
			},
		},
		default: '',
	},
/* -------------------------------------------------------------------------- */
/*                                 member:getOrganization                     */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Member ID',
		name: 'memberId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'getOrganization',
				],
				resource: [
					'member',
				],
			},
		},
		default: '',
	},
] as INodeProperties[];
