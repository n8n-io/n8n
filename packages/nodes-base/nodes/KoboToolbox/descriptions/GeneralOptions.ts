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
] as INodeProperties[];
