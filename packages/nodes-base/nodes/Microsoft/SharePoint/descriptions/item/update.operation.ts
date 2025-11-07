import { updateDisplayOptions, type INodeProperties } from 'n8n-workflow';

import { itemColumnsPreSend } from '../../helpers/utils';
import { listRLC, siteRLC, untilListSelected, untilSiteSelected } from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		...siteRLC,
		description: 'Select the site to retrieve lists from',
	},
	{
		...listRLC,
		description: 'Select the list you want to update an item in',
		displayOptions: {
			hide: {
				...untilSiteSelected,
			},
		},
	},
	{
		displayName:
			'Due to API restrictions, the following column types cannot be updated: Hyperlink, Location, Metadata',
		name: 'noticeUnsupportedFields',
		displayOptions: {
			hide: {
				...untilSiteSelected,
				...untilListSelected,
			},
		},
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Columns',
		name: 'columns',
		default: {
			mappingMode: 'defineBelow',
			value: null,
		},
		displayOptions: {
			hide: {
				...untilSiteSelected,
				...untilListSelected,
			},
		},
		noDataExpression: true,
		required: true,
		routing: {
			send: {
				preSend: [itemColumnsPreSend],
			},
		},
		type: 'resourceMapper',
		typeOptions: {
			loadOptionsDependsOn: ['site.value', 'list.value'],
			resourceMapper: {
				resourceMapperMethod: 'getMappingColumns',
				mode: 'update',
				fieldWords: {
					singular: 'column',
					plural: 'columns',
				},
				addAllFields: true,
				multiKeyMatch: false,
			},
		},
	},
];

const displayOptions = {
	show: {
		resource: ['item'],
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
