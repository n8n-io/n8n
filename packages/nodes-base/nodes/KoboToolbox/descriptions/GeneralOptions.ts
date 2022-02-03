import {
	INodeProperties,
} from 'n8n-workflow';

export const generalOptions = [
	{
		displayName: 'Form ID',
		name: 'assetUid',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'loadSurveys',
		},
		required: true,
		default:'',
		description:'Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg)',
		displayOptions: {
			show: {
				resource: [
					'form',
				],
				operation: [
					'get',
				],
			},
		},
	},
	{
		displayName: 'Form ID',
		name: 'assetUid',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'loadSurveys',
		},
		required: true,
		default:'',
		description:'Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg)',
		displayOptions: {
			show: {
				resource: [
					'hook',
					'submission',
				],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'scroll',
		type: 'boolean',
		required: true,
		default: false,
		description:'If checked, all results will be returned instead of just the first page - WARNING, this can cause a lot of data to be returned!',
		displayOptions: {
			show: {
				operation: [
					'getAll',
					'getLogs',
					'query',
				],
			},
		},
	},
	{
		displayName: 'Start',
		name: 'start',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'getAll',
					'getLogs',
					'query',
				],
				scroll: [
					false,
				],
			},
		},
		default: 0,
		description:'Offset from the result set',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		required: false,
		displayOptions: {
			show: {
				operation: [
					'getAll',
					'getLogs',
					'query',
				],
				scroll: [
					false,
				],
			},
		},
		default: 1000,
		description:'Max records to return (up to 30000)',
	},
] as INodeProperties[];
