import type { AssetProperties } from '../../Interfaces';

export const assetGetPublicURLDescription: AssetProperties = [
	{
		displayName: 'Asset Path',
		name: 'assetPath',
		type: 'string',
		placeholder: '/images/2023-09/logo.png',
		required: true,
		displayOptions: {
			show: {
				resource: ['asset'],
				operation: ['getPublicURL'],
			},
		},
		default: '',
	},
];
