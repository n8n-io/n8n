import {
	INodeProperties,
} from 'n8n-workflow';

export const panelistOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		description: 'Operation to perform',
		options: [
			{
				name: 'Create',
				value: 'create',
			},
			{
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Reinvite',
				value: 'reinvite',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'panelist',
				],
			},
		},
	},
] as INodeProperties[];

export const panelistFields = [
	// ----------------------------------
	//        panelist: create
	// ----------------------------------
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: '',
		displayOptions: {
			show: {
				resource: [
					'panelist',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		required: true,
		default: '',
		description: '',
		displayOptions: {
			show: {
				resource: [
					'panelist',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Webinar Key',
		name: 'webinarKey',
		type: 'string',
		required: true,
		default: '',
		description: '',
		displayOptions: {
			show: {
				resource: [
					'panelist',
				],
				operation: [
					'create',
				],
			},
		},
	},
	// ----------------------------------
	//        panelist: getAll
	// ----------------------------------
	{
		displayName: 'Webinar Key',
		name: 'webinarKey',
		type: 'string',
		required: true,
		default: '',
		description: '',
		displayOptions: {
			show: {
				resource: [
					'panelist',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	// ----------------------------------
	//        panelist: delete
	// ----------------------------------
	{
		displayName: 'Webinar Key',
		name: 'webinarKey',
		type: 'string',
		required: true,
		default: '',
		description: '',
		displayOptions: {
			show: {
				resource: [
					'panelist',
				],
				operation: [
					'delete',
				],
			},
		},
	},
	{
		displayName: 'Panelist Key',
		name: 'panelistKey',
		type: 'string',
		required: true,
		default: '',
		description: '',
		displayOptions: {
			show: {
				resource: [
					'panelist',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------
	//        panelist: delete
	// ----------------------------------
	{
		displayName: 'Webinar Key',
		name: 'webinarKey',
		type: 'string',
		required: true,
		default: '',
		description: '',
		displayOptions: {
			show: {
				resource: [
					'panelist',
				],
				operation: [
					'reinvite',
				],
			},
		},
	},
	{
		displayName: 'Panelist Key',
		name: 'panelistKey',
		type: 'string',
		required: true,
		default: '',
		description: '',
		displayOptions: {
			show: {
				resource: [
					'panelist',
				],
				operation: [
					'reinvite',
				],
			},
		},
	},
] as INodeProperties[];
