import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { theHiveApiRequest } from '../../transport';
import { alertRLC } from '../common.description';

const properties: INodeProperties[] = [
	alertRLC,
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Include Similar Cases',
				name: 'includeSimilar',
				type: 'boolean',
				description: 'Whether to include similar cases',
				default: false,
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['alert'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const alertId = this.getNodeParameter('alertId', i, '', { extractValue: true }) as string;
	const includeSimilar = this.getNodeParameter('options.includeSimilar', i, false) as boolean;

	const qs: IDataObject = {};

	if (includeSimilar) {
		qs.similarity = true;
	}

	responseData = await theHiveApiRequest.call(this, 'GET', `/v1/alert/${alertId}`, {}, qs);

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
