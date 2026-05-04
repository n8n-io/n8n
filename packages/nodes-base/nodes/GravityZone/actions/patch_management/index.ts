import type { INodeProperties } from 'n8n-workflow';

import * as getInstalledPatches from './getInstalledPatches.operation';
import * as getMissingPatches from './getMissingPatches.operation';

export { getMissingPatches, getInstalledPatches };

export const description: INodeProperties[] = [
	{
		displayName: 'Action',
		name: 'action',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { category: ['patch_management'] } },
		options: [
			{
				name: 'Get Installed Patches',
				value: 'getInstalledPatches',
				action: 'Get installed patches for endpoints',
			},
			{
				name: 'Get Missing Patches',
				value: 'getMissingPatches',
				action: 'Get missing patches for endpoints',
			},
		],
		default: 'getMissingPatches',
	},
	...getMissingPatches.description,
	...getInstalledPatches.description,
];
