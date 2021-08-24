import {
	INodeProperties,
} from 'n8n-workflow';

export const dtdlModelsOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'dtdlModels',
				],
			},
		},
		options: [
			{
				name: 'Get Bases',
				value: 'getBases',
			},
			{
				name: 'Get DTDL Model',
				value: 'getDtdlModel',
			},
			{
				name: 'Get Expanded',
				value: 'getExpanded',
			},
			{
				name: 'Get Expanded Models',
				value: 'getExpandedModels',
			},
			{
				name: 'Get Outgoing Relationships',
				value: 'getOutgoingRelationships',
			},
			{
				name: 'Get Relationships',
				value: 'getRelationships',
			},
			{
				name: 'Get Roots',
				value: 'getRoots',
			},
		],
		default: 'getDtdlModel',
	},
] as INodeProperties[];

export const dtdlModelsFields = [
	{
		displayName: 'Dtmi',
		name: 'dtmi',
		description: '',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'dtdlModels',
				],
				operation: [
					'getBases',
					'getExpanded',
					'getDtdlModel',
				],
			},
		},
	},
	{
		displayName: 'Size',
		name: 'size',
		description: '',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'dtdlModels',
				],
				operation: [
					'getExpandedModels',
				],
			},
		},
	},
	{
		displayName: 'Page',
		name: 'page',
		description: '',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'dtdlModels',
				],
				operation: [
					'getExpandedModels',
				],
			},
		},
	},
	{
		displayName: 'sourceDtmi',
		name: 'sourceDtmi',
		description: '',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'dtdlModels',
				],
				operation: [
					'getOutgoingRelationships',
					'getRelationships',
				],
			},
		},
	},
	{
		displayName: 'targetDtmi',
		name: 'targetDtmi',
		description: '',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'dtdlModels',
				],
				operation: [
					'getRelationships',
				],
			},
		},
	},
] as INodeProperties[];
