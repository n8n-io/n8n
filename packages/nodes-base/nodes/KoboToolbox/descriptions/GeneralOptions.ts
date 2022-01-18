import {
	INodeProperties,
} from 'n8n-workflow';

export const generalOptions = [
	{
		displayName: 'Form ID',
		name: 'assetUid',
		type: 'string',
		required: true,
		default:'',
		description:'Form id (e.g. aSAvYreNzVEkrWg5Gdcvg)',
	},
] as INodeProperties[];
