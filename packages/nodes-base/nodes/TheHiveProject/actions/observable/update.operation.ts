import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { observableStatusSelector, tlpSelector } from '../common.description';
import { prepareOptional } from '../../helpers/utils';
import { theHiveApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Observable ID',
		name: 'id',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the observable',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		default: {},
		options: [
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				default: '',
				description: 'Description of the observable in the context of the case',
			},
			{
				displayName: 'Observable Tags',
				name: 'tags',
				type: 'string',
				default: '',
				placeholder: 'tag1,tag2',
			},
			tlpSelector,
			{
				displayName: 'Indicator of Compromise (IOC)',
				name: 'ioc',
				type: 'boolean',
				default: false,
				description: 'Whether the observable is an IOC (Indicator of compromise)',
			},
			{
				displayName: 'Sighted',
				name: 'sighted',
				description: 'Whether sighted previously',
				type: 'boolean',
				default: false,
			},
			observableStatusSelector,
		],
	},
];

const displayOptions = {
	show: {
		resource: ['observable'],
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const id = this.getNodeParameter('id', i) as string;

	const body: IDataObject = {
		...prepareOptional(this.getNodeParameter('updateFields', i, {})),
	};

	responseData = await theHiveApiRequest.call(this, 'PATCH', `/case/artifact/${id}`, body);

	responseData = { success: true };

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
