import {
	INodeProperties,
} from 'n8n-workflow';

export const staffOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['staff'],
			},
		},
		options: [
			{
				name: 'Add Sip',
				value: 'addSip',
			},
			{
				name: 'Find Paged List',
				value: 'findPagedList',
			},
		],
		default: 'findPagedList',
	},
];

export const staffFields: INodeProperties[] = [

	/*-------------------------------------------------------------------------- */
	/*                          	staff:addSip                     		 	 */
	/* ------------------------------------------------------------------------- */
	{
		displayName: 'SIP Register Name',
		name: 'sipRegisterName',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				resource: ['staff'],
				operation: ['addSip'],
			},
		},
		default: '',
		description: '',
	},
	{
		displayName: 'Username',
		name: 'username',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				resource: ['staff'],
				operation: ['addSip'],
			},
		},
		default: '',
		description: '',
	},
	{
		displayName: 'Password',
		name: 'password',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				resource: ['staff'],
				operation: ['addSip'],
			},
		},
		default: '',
		description: '',
	},
	{
		displayName: 'SIP Server1',
		name: 'sipServer1',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				resource: ['staff'],
				operation: ['addSip'],
			},
		},
		default: '',
		description: '',
	},
	{
		displayName: 'SIP Port 1',
		name: 'sipPort1',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				resource: ['staff'],
				operation: ['addSip'],
			},
		},
		default: '',
		description: '',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['staff'],
				operation: ['addSip'],
			},
		},
		options: [
			{
				displayName: 'SIP Display Name',
				name: 'sipDisplayName',
				type: 'string',
				default: '',
				description: '',
			},
			{
				displayName: 'SIP Label',
				name: 'sipLabel',
				type: 'string',
				default: '',
				description: '',
			},
			{
				displayName: 'SIP Server2',
				name: 'sipServer2',
				type: 'string',
				default: '',
				description: '',
			},
			{
				displayName: 'SIP Port 2',
				name: 'sipPort2',
				type: 'string',
				default: '',
				description: '',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'string',
				default: '',
				description: '',
			},
			{
				displayName: 'Remark',
				name: 'remark',
				type: 'string',
				default: '',
				description: '',
			},
			{
				displayName: 'Region ID',
				name: 'regionId',
				type: 'string',
				default: '',
				description: '',
			},
		],
	},

	/*-------------------------------------------------------------------------- */
	/*                          	staff:findPagedList                    		 */
	/* ------------------------------------------------------------------------- */
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['staff'],
				operation: ['findPagedList'],
			},
		},
		options: [
			{
				displayName: 'Auto Count',
				name: 'autoCount',
				type: 'boolean',
				default: false,
				description: 'Whether the total number is accounted automatically. It defaults to false.',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 0,
				description: 'The maximum number of the obtained records per paging',
			},
			{
				displayName: 'Orderbys',
				name: 'orderbys',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Staff',
				default: { metadataValues: [{field:'', order: ''}] },
				description: '',
				options: [
					{
						name: 'metadataValues',
						displayName: 'Metadata',
						values: [
							{
								displayName: 'Field',
								name: 'field',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Order',
								name: 'order',
								type: 'number',
								default: '',
								description: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Search Key',
				name: 'searchKey',
				type: 'string',
				default: '',
				description: 'The search key',
			},
			{
				displayName: 'Skip',
				name: 'skip',
				type: 'number',
				default: 0,
				description: 'The skipped records, and it defaults to 0',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'string',
				default: '',
				description: '',
			},
		],
	},

];