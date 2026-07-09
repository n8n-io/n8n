import { updateDisplayOptions, type INodeProperties } from 'n8n-workflow';

import { listRLC, siteRLC, untilSiteSelected } from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		...siteRLC,
		description: 'Select the site to retrieve lists from',
	},
	{
		...listRLC,
		description: 'Select the list you want to retrieve',
		displayOptions: {
			hide: {
				...untilSiteSelected,
			},
		},
	},
	{
		displayName: 'Simplify',
		name: 'simplify',
		default: true,
		routing: {
			send: {
				property: '$select',
				type: 'query',
				value:
					'={{ $value ? "id,name,displayName,description,createdDateTime,lastModifiedDateTime,webUrl" : undefined }}',
			},
		},
		type: 'boolean',
	},
];

const displayOptions = {
	show: {
		resource: ['list'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
