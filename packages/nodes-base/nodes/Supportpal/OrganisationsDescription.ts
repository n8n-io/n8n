import { INodeProperties } from 'n8n-workflow';

export const organisationsDescription = [
	// ----------------------------------
	//         Fields: organisation
	// ----------------------------------
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['organisation'],
			},
		},
		description: 'The name of the organisation.',
	},
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['update', 'get', 'delete'],
				resource: ['organisation'],
			},
		},
		description: 'The ID of the organisation.',
	},
	{
		displayName: 'Simplify Response',
		name: 'simplify',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['organisation'],
				operation: ['create', 'update', 'get', 'getAll'],
			},
		},
		description: 'Return simplified response. Only returns the organisation data.',
	},
	{
		displayName: 'Additional Fields',
		name: 'optionalFields',
		type: 'collection',
		displayOptions: {
			show: {
				resource: ['organisation'],
				operation: ['create'],
			},
		},
		default: {},
		description: 'Additional optional fields of the organisation.',
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Brand ID',
				name: 'brand_id',
				type: 'number',
				default: 0,
				description:
					'The brand the user is being registered to, will use the default brand if not entered.',
			},
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				description: 'Country of the user, as a two letter string like "GB".',
			},
			{
				displayName: 'Language Code',
				name: 'language_code',
				type: 'string',
				default: '',
				description:
					'The two letter language code, like "en", will default to system default if not entered.',
			},
			{
				displayName: 'Time Zone',
				name: 'timezone',
				type: 'string',
				default: '',
				description:
					'The timezone of the user, like "Europe/London", will default to system default if not entered.',
			},
			{
				displayName: 'Notes',
				name: 'notes',
				type: 'string',
				default: '',
				description: 'Any notes about the organisation, for operators only.',
			},
			{
				displayName: 'Domain',
				name: 'domain',
				type: 'json',
				default: '',
				description:
					'An array of strings that represent the domains belonging to the organisation, for example "domain.com". Will be used to automatically add users who register or email the help desk from one of the domains listed.',
			},
			{
				displayName: 'Access Level',
				name: 'groups',
				type: 'json',
				default: '',
				description:
					'An array of user access levels in organisation, keyed by the user ID. 0 - Manager, 1 - User.',
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'optionalFields',
		type: 'collection',
		displayOptions: {
			show: {
				resource: ['organisation'],
				operation: ['update'],
			},
		},
		default: {},
		description: 'Additional optional fields of the organisation.',
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The name of the organisation.',
			},
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				description: 'Country of the user, as a two letter string like "GB".',
			},
			{
				displayName: 'Language Code',
				name: 'language_code',
				type: 'string',
				default: '',
				description:
					'The two letter language code, like "en", will default to system default if not entered.',
			},
			{
				displayName: 'Time Zone',
				name: 'timezone',
				type: 'string',
				default: '',
				description:
					'The timezone of the user, like "Europe/London", will default to system default if not entered.',
			},
			{
				displayName: 'Notes',
				name: 'notes',
				type: 'string',
				default: '',
				description: 'Any notes about the organisation, for operators only.',
			},
			{
				displayName: 'Domain',
				name: 'domain',
				type: 'json',
				default: '',
				description:
					'An array of strings that represent the domains belonging to the organisation, for example "domain.com". Will be used to automatically add users who register or email the help desk from one of the domains listed.',
			},
			{
				displayName: 'Access Level',
				name: 'groups',
				type: 'json',
				default: '',
				description:
					'An array of user access levels in organisation, keyed by the user ID. 0 - Manager, 1 - User.',
			},
		],
	},
	{
		displayName: 'Query Parameters',
		name: 'queryParameters',
		type: 'collection',
		displayOptions: {
			show: {
				resource: ['organisation'],
				operation: ['getAll'],
			},
		},
		default: {},
		description: 'Query Parameters for filtering the organisations.',
		placeholder: 'Add Parameter',
		options: [
			{
				displayName: 'Brand ID',
				name: 'brand_id',
				type: 'number',
				default: 0,
				description: 'Search for organisations by the brand they are registered to.',
			},
			{
				displayName: 'Start',
				name: 'start',
				type: 'number',
				default: 1,
				description: 'The first result to start from.',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				description: 'The amount of results to fetch.',
			},
			{
				displayName: 'Order Column',
				name: 'order_column',
				type: 'string',
				default: 'id',
				description: 'The column to sort by.',
			},
			{
				displayName: 'Order Direction',
				name: 'order_direction',
				type: 'options',
				options: [
					{ name: 'Ascending', value: 'asc' },
					{ name: 'Descending', value: 'desc' },
				],
				default: 'asc',
				description: 'The ordering of the results.',
			},
		],
	},
] as INodeProperties[];
