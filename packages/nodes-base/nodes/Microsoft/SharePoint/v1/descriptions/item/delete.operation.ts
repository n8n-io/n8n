import { updateDisplayOptions, type INodeProperties } from 'n8n-workflow';

import {
	itemRLC,
	listRLC,
	siteRLC,
	untilListSelected,
	untilSiteSelected,
} from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		...siteRLC,
		description: 'Select the site to retrieve lists from',
	},
	{
		...listRLC,
		description: 'Select the list you want to delete an item in',
		displayOptions: {
			hide: {
				...untilSiteSelected,
			},
		},
	},
	{
		...itemRLC,
		description: 'Select the item you want to delete',
		displayOptions: {
			hide: {
				...untilSiteSelected,
				...untilListSelected,
			},
		},
	},
];

const displayOptions = {
	show: {
		resource: ['item'],
		operation: ['delete'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
