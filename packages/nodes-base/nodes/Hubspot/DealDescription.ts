import { INodeProperties } from "n8n-workflow";

export const dealOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a deal',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a deal',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const dealFields = [

/* -------------------------------------------------------------------------- */
/*                                deal:create                               */
/* -------------------------------------------------------------------------- */

	{
		displayName: 'Stage',
		name: 'stage',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getDealStages'
		},
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		options: [],
		description: 'The dealstage is required when creating a deal. See the CRM Pipelines API for details on managing pipelines and stages.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Deal Name',
				name: 'dealName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Deal Stage',
				name: 'dealStage',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Pipeline',
				name: 'pipeline',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Close Date',
				name: 'closeDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Amount',
				name: 'amount',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Deal Type',
				name: 'dealType',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getDealTypes',
				},
				default: [],
			},
			{
				displayName: 'Associated Company',
				name: 'associatedCompany',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod:'getCompanies' ,
				},
				default: [],
			},
			{
				displayName: 'Associated Vids',
				name: 'associatedVids',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod:'getContacts' ,
				},
				default: [],
			},
		]
	},
] as INodeProperties[];
